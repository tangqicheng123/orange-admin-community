// 一键生成 THIRD-PARTY-LICENSES.md
// 用法：node scripts/gen-licenses-md.mjs
// 数据源：node scripts/check-licenses.mjs --json
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { execSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT = join(ROOT, 'THIRD-PARTY-LICENSES.md')

// 1. 读 package.json 拿到 deps 分类
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'))
const { dependencies = {}, devDependencies = {}, overrides = {} } = pkg
const allRanges = { ...dependencies, ...devDependencies, ...overrides }

// 2. 跑 check-licenses.mjs --json
const json = JSON.parse(execSync('node scripts/check-licenses.mjs --json', {
  cwd: ROOT,
  encoding: 'utf-8',
  stdio: ['ignore', 'pipe', 'ignore'],
}))

// 3. 构造 { name: version, license } 直接依赖表（只列出现在 package.json 里的）
const versions = new Map()
const licenses = new Map()
for (const p of json.safe) {
  if (allRanges[p.name]) {
    versions.set(p.name, p.version)
    licenses.set(p.name, p.license)
  }
}
// 包括 dev 但用户没在 package.json 列的（如传递依赖），不在表里
// 排序
const allNames = Object.keys(allRanges).sort()

// 4. 构造 markdown
const today = new Date().toISOString().slice(0, 10)
const lines = []
lines.push('# 第三方开源组件许可声明（THIRD-PARTY LICENSES）')
lines.push('')
lines.push('OrangeAdmin（橙枢）所依赖的第三方开源组件及其协议，全列在下方。')
lines.push('')
lines.push(`**合规结论**：自动扫描共 **${json.summary.total}** 个实际安装包，违规 **${json.summary.forbidden}**，未知 **${json.summary.unknown}**，合规 **${json.summary.safe}**。`)
lines.push('')
lines.push('完整协议文本可在各组件仓库或其 `node_modules/<pkg>/LICENSE` 文件中查看。各组件版权归其各自作者所有。')
lines.push('')
lines.push('> 重新生成：`node scripts/gen-licenses-md.mjs`')
lines.push('> 合规核查：`npm run license:check`（递归扫 node_modules，禁 GPL/AGPL）')
lines.push('')

lines.push('## 1. package.json 直接依赖（运行时 / 开发时 / overrides）')
lines.push('')
lines.push('下表所列为 `package.json` 中明确声明的依赖；左侧为声明版本范围，右侧为当前 `node_modules` 中的实际解析版本。')
lines.push('')
lines.push('| 组件 | 声明范围（package.json） | 实际安装 | 协议 | 类别 |')
lines.push('|---|---|---|---|---|')
for (const name of allNames) {
  const range = allRanges[name]
  const ver = versions.get(name) || '(未安装)'
  const lic = licenses.get(name) || '?'
  const cat = dependencies[name] ? '运行时' : devDependencies[name] ? '开发时' : 'override'
  lines.push(`| \`${name}\` | \`${range}\` | ${ver} | ${lic} | ${cat} |`)
}
lines.push('')

lines.push('## 2. 整体协议分布（node_modules 全量，含传递依赖）')
lines.push('')
lines.push('以下数据基于 `npm run license:check` 全量扫描，仅供参考。最终数据见最新一次扫描。')
lines.push('')
lines.push('| 协议 | 包数 |')
lines.push('|---|---|')
for (const [lic, n] of Object.entries(json.summary.byLicense).sort()) {
  lines.push(`| ${lic} | ${n} |`)
}
lines.push('')
lines.push(`**合计**：${json.summary.total} 个安装包；合规 ${json.summary.safe}，违规 ${json.summary.forbidden}，未知 ${json.summary.unknown}。`)
lines.push('')

lines.push('## 3. 素材来源（图标 / 字体 / 插画）')
lines.push('- 图标：@element-plus/icons-vue（MIT）、Iconify 开源图标集（各类宽松协议）。')
lines.push('- 字体：系统字体栈 / Inter（OFL，如需可后续引入，本包默认不打包字体文件）。')
lines.push('- 插画：如有，均来自 unDraw 等免费商用授权来源，并标注出处；本模板不打包任何付费素材。')
lines.push('')

lines.push('## 4. 声明')
lines.push('OrangeAdmin 的原创代码、设计、文档版权归作者所有，受商业授权（`LICENSE`）约束；')
lines.push('上述第三方组件的版权归各自作者所有，遵循其原始协议。')
lines.push('')
lines.push(`> 最近更新：${today}（本文件由脚本生成）`)

writeFileSync(OUT, lines.join('\n'), 'utf-8')
console.log(`✅ 已生成 ${OUT}`)
console.log(`   直接依赖：${allNames.length} 个；扫描合规：${json.summary.safe}/${json.summary.total}`)
