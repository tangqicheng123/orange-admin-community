// i18n 健全性检查：扫源码 t('ns.key') 引用 vs i18n 文件定义，缺一即报。
// 用法：node scripts/check-i18n.mjs [--strict]
//   默认仅检查"引用了但没定义"的 key（漏翻译、字面 key 显示）
//   --strict 同时检查"定义了但没引用"的 key（死代码，可清理）
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SRC_DIR = path.join(ROOT, 'src')
const LOCALES = [path.join(ROOT, 'src/i18n/locales/zh-CN.ts'), path.join(ROOT, 'src/i18n/locales/en-US.ts')]
const strict = process.argv.includes('--strict')

function walk(dir, cb) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f)
    const s = fs.statSync(p)
    if (s.isDirectory()) walk(p, cb)
    else if (/\.(vue|ts|js)$/.test(f)) cb(p)
  }
}

// 1. 抽源码 t('ns.key') 引用
const srcRefs = new Set()
const REF_RE = /t\(\s*['"]([a-zA-Z][\w]*)[\.\/]([\w]+)['"]\s*[,)]/g
walk(SRC_DIR, (p) => {
  const t = fs.readFileSync(p, 'utf8')
  let m
  while ((m = REF_RE.exec(t)) !== null) srcRefs.add(`${m[1]}.${m[2]}`)
})

// 2. 抽 i18n 定义（每文件一个 namespace 树）
function parseLocale(file) {
  const t = fs.readFileSync(file, 'utf8')
  const refs = new Set()
  const NS_RE = /^\s{0,2}([a-zA-Z][\w]*):\s*\{/gm
  const KEY_RE = /^\s{4}([a-zA-Z][\w]*)\s*:/gm
  let m,
    ns = ''
  while ((m = NS_RE.exec(t)) !== null) ns = m[1]
  // 重新走一遍，带 namespace 上下文（简化：先按 KEY_RE 收集所有顶层 ns 内的 key）
  const lines = t.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i]
    const nsMatch = ln.match(/^\s{0,2}([a-zA-Z][\w]*):\s*\{/)
    if (nsMatch) {
      ns = nsMatch[1]
      continue
    }
    const kMatch = ln.match(/^\s{4}([a-zA-Z][\w]*)\s*:/)
    if (kMatch && ns) refs.add(`${ns}.${kMatch[1]}`)
  }
  return refs
}

const localeRefs = new Set()
for (const f of LOCALES) {
  for (const k of parseLocale(f)) localeRefs.add(k)
}

const missing = [...srcRefs].filter((k) => !localeRefs.has(k))
const dead = [...localeRefs].filter((k) => !srcRefs.has(k))

console.log(`源码 t('ns.key') 引用：${srcRefs.size} 个`)
console.log(`i18n 文件定义：${localeRefs.size} 个`)

if (missing.length === 0) console.log('\n✅ 引用全部有定义（无字面 key 泄漏风险）')
else {
  console.log('\n❌ 引用了但 i18n 没定义（字面 key 会原样显示）：')
  missing.forEach((k) => console.log('  - ' + k))
}

if (strict) {
  if (dead.length === 0) console.log('\n✅ 无死代码')
  else {
    console.log('\n⚠️  定义了但没引用（可能是预留/死代码，可清理）：')
    dead.forEach((k) => console.log('  - ' + k))
  }
}

process.exit(missing.length > 0 ? 1 : 0)
