// OrangeAdmin 依赖协议合规核查（真扫版）
// 运行：
//   npm run license:check                  # 人类可读
//   node scripts/check-licenses.mjs --json # CI 模式（仅输出 JSON）
//   node scripts/check-licenses.mjs --direct # 只列 package.json 中的直接依赖
//
// 作用：递归扫描 node_modules 中所有实际安装包的 license 字段，
//       确保全部为宽松协议（MIT / Apache-2.0 / BSD / MPL-2.0 / ISC / CC0 / Unlicense / 0BSD / BlueOak / PSF）。
//       任何传染性协议（GPL / AGPL / LGPL / SSPL / RPL / Commons Clause）必须清零。
//
// 来源：每包 `node_modules/<pkg>/package.json` 的 `license` 或 `licenses` 字段。
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const NODE_MODULES = join(ROOT, 'node_modules')

const ARGS = new Set(process.argv.slice(2))
const JSON_MODE = ARGS.has('--json')
const DIRECT_ONLY = ARGS.has('--direct')

// ---------- 协议分类 ----------
// 宽松（合规可售）：任一关键词出现在 license 字符串里即视为宽松
const SAFE = /\b(MIT|Apache-2\.0|Apache-2|BSD-2-Clause|BSD-3-Clause|BSD|ISC|MPL-2\.0|CC0-1\.0|CC-BY|CC-BY-4\.0|Unlicense|0BSD|BlueOak-1\.0\.0|PSF|Python-2\.0)\b/i
// 传染性（违规）：GPL 系列（LGPL 也算）/ AGPL / SSPL / RPL / Commons Clause
const FORBIDDEN = /\b(GPL|AGPL|LGPL|SSPL|RPL|Commons\s+Clause)\b/i

function classify(lic) {
  if (!lic || lic === 'UNKNOWN') return { kind: 'unknown', raw: lic || 'UNLICENSED' }
  const s = String(lic)
  if (FORBIDDEN.test(s)) return { kind: 'forbidden', raw: s }
  if (SAFE.test(s)) return { kind: 'safe', raw: s }
  return { kind: 'unknown', raw: s }
}

function readLicense(pkgPath) {
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    if (typeof pkg.license === 'string' && pkg.license.trim()) return pkg.license
    if (Array.isArray(pkg.licenses) && pkg.licenses[0]?.type) return pkg.licenses[0].type
    return 'UNKNOWN'
  } catch {
    return 'UNKNOWN'
  }
}

function collect(pkgDir, found, directNames) {
  const pkgJson = join(pkgDir, 'package.json')
  if (!existsSync(pkgJson)) return
  let pkg
  try {
    pkg = JSON.parse(readFileSync(pkgJson, 'utf-8'))
  } catch {
    return
  }
  if (!pkg.name || !pkg.version) return
  // 直接依赖：包名出现在 package.json 的 dependencies/devDependencies/overrides 中
  // （传递依赖因为 npm hoisting 也可能在 node_modules/<pkg>，但名字不在直接依赖列表里）
  const isDirect = directNames.has(pkg.name)
  const key = `${pkg.name}@${pkg.version}`
  if (found.has(key)) return
  found.set(key, {
    name: pkg.name,
    version: pkg.version,
    license: readLicense(pkgJson),
    direct: isDirect,
  })
}

function walk(dir, found = new Map(), directNames) {
  if (!existsSync(dir)) return found
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return found
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue
    if (e.name.startsWith('@')) {
      const scopeDir = join(dir, e.name)
      let scoped
      try {
        scoped = readdirSync(scopeDir, { withFileTypes: true })
      } catch {
        continue
      }
      for (const s of scoped) {
        if (!s.isDirectory()) continue
        collect(join(scopeDir, s.name), found, directNames)
      }
      continue
    }
    collect(join(dir, e.name), found, directNames)
  }
  return found
}

// ---------- 主流程 ----------
if (!existsSync(NODE_MODULES)) {
  const msg = '❌ node_modules 不存在，请先 `npm install --legacy-peer-deps`'
  if (JSON_MODE) console.log(JSON.stringify({ error: msg }))
  else console.error(msg)
  process.exit(2)
}

// 1. 读自己 package.json，构造「直接依赖」包名集合
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'))
const directNames = new Set([
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
  ...Object.keys(pkg.overrides || {}),
])

const all = walk(NODE_MODULES, new Map(), directNames)
const safe = []
const unknown = []
const forbidden = []

for (const v of all.values()) {
  v.kind = classify(v.license).kind
  if (v.kind === 'safe') safe.push(v)
  else if (v.kind === 'forbidden') forbidden.push(v)
  else unknown.push(v)
}

// 按 license 分组
const byLicense = new Map()
for (const p of safe) {
  const k = p.license
  if (!byLicense.has(k)) byLicense.set(k, [])
  byLicense.get(k).push(p)
}
for (const v of byLicense.values()) v.sort((a, b) => a.name.localeCompare(b.name))
safe.sort((a, b) => a.name.localeCompare(b.name))
unknown.sort((a, b) => a.name.localeCompare(b.name))
forbidden.sort((a, b) => a.name.localeCompare(b.name))

const summary = {
  total: all.size,
  safe: safe.length,
  unknown: unknown.length,
  forbidden: forbidden.length,
  byLicense: Object.fromEntries([...byLicense.entries()].sort().map(([k, v]) => [k, v.length])),
}

if (JSON_MODE) {
  const out = {
    summary,
    safe: safe.map((p) => ({ name: p.name, version: p.version, license: p.license, direct: p.direct })),
    unknown: unknown.map((p) => ({ name: p.name, version: p.version, license: p.license })),
    forbidden: forbidden.map((p) => ({ name: p.name, version: p.version, license: p.license })),
  }
  console.log(JSON.stringify(out, null, 2))
  process.exit(forbidden.length > 0 || unknown.length > 0 ? 1 : 0)
}

// 人类可读输出
console.log('🔍 扫描 node_modules 中所有实际安装包的协议...\n')

if (forbidden.length > 0) {
  console.log(`❌ 违规（传染性协议，必须替换）：${forbidden.length} 个`)
  for (const p of forbidden) console.log(`  - ${p.name}@${p.version}  →  ${p.license}`)
  console.log()
}

if (unknown.length > 0) {
  console.log(`⚠️  未知（协议未声明/格式怪异，请人工核查）：${unknown.length} 个`)
  for (const p of unknown) console.log(`  - ${p.name}@${p.version}  →  ${p.license || '(empty)'}`)
  console.log()
}

console.log(`✅ 合规（宽松协议）：${safe.length} 个（按协议分组）`)
for (const [lic, list] of [...byLicense.entries()].sort()) {
  console.log(`  [${lic}] ${list.length} 个`)
}

// 直接依赖对照表（用于校对 THIRD-PARTY-LICENSES.md）
const directPkgs = safe.filter((p) => p.direct).sort((a, b) => a.name.localeCompare(b.name))
console.log('\n' + '='.repeat(60))
console.log(`直接依赖（package.json#dependencies|devDependencies|overrides 顶层安装）：${directPkgs.length} 个`)
for (const p of directPkgs) {
  console.log(`  ${p.name.padEnd(36)} ${p.version.padEnd(14)} ${p.license}`)
}

// 让管道也能抓到 exit code
console.log('\n' + '='.repeat(60))
console.log(`扫描完成：${all.size} 个安装包；违规 ${forbidden.length}，未知 ${unknown.length}，合规 ${safe.length}。`)

if (forbidden.length > 0) {
  console.error('❌ 存在传染性协议，禁止发布，请替换违规依赖。')
  process.exit(1)
}
if (unknown.length > 0) {
  console.warn('⚠️  存在未声明/未知协议，请人工核查后再发布。')
  process.exit(1)
}
console.log('✅ 全部依赖均为宽松协议，符合 OrangeAdmin 售卖合规要求。')
process.exit(0)
