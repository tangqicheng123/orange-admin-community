// 一键清理 Vite/esbuild 缓存与构建产物，避免缓存堆积加剧内存问题
// 用法：npm run clean:cache
import { existsSync, rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const targets = [
  { name: 'Vite 依赖缓存', path: 'node_modules/.vite' },
  { name: 'esbuild 缓存', path: 'node_modules/.cache/esbuild' },
  { name: 'Vite 临时缓存', path: '.vite-temp' },
  { name: 'TypeScript 增量构建缓存', path: 'node_modules/.cache/tsbuildinfo' },
  { name: '构建产物 dist', path: 'dist' },
]

let cleared = 0
for (const t of targets) {
  const p = resolve(root, t.path)
  if (existsSync(p)) {
    try {
      rmSync(p, { recursive: true, force: true })
      console.log(`[OK] 已清理：${t.name} (${t.path})`)
      cleared++
    } catch (e) {
      console.warn(`[WARN] 清理失败：${t.name} (${t.path}) - ${e.message}`)
    }
  } else {
    console.log(`[SKIP] 不存在：${t.name} (${t.path})`)
  }
}

console.log(`\n完成，共清理 ${cleared} 项。`)
console.log('提示：清理后首次 dev/build 会重新预编译，约 5-15 秒。')
