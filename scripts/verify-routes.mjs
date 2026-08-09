// 验证「清空 localStorage 后」动态路由能否正确注入 dashboard
// 编译真实 browser.ts + dynamic.ts，mock 空 localStorage（模拟用户点过一键清空）
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const browserSrc = path.join(root, 'src/mock/browser.ts')
const dynamicSrc = path.join(root, 'src/router/dynamic.ts')

// 空 localStorage（清空后状态）
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  key: (i) => [...store.keys()][i] ?? null,
  get length() { return store.size },
}

async function loadModule(src) {
  const res = await build({
    entryPoints: [src],
    bundle: true,
    format: 'esm',
    write: false,
    platform: 'browser',
    logLevel: 'silent',
    loader: { '.vue': 'empty' },
    alias: { '@': path.join(root, 'src') },
  })
  const code = res.outputFiles[0].text
  const dataUrl = 'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
  return import(dataUrl)
}

const browser = await loadModule(browserSrc)
const dynamic = await loadModule(dynamicSrc)

// 1) 清空后菜单应该回到 11 条种子
const menuRes = browser.dispatchMock({
  url: '/api/system/menu',
  method: 'get',
  headers: {},
})
const menuList = menuRes.data.data.list
console.log('[1] 清空后 /api/system/menu 返回条数 =', menuList.length)
const dash = menuList.find((m) => m.path === '/dashboard')
console.log('[1] 包含 dashboard 菜单?', !!dash, dash ? `(id=${dash.id}, component=${dash.component})` : '')

// 2) 生成路由
const routes = dynamic.generateRoutes(menuList)
console.log('[2] generateRoutes 生成路由数 =', routes.length)
function walk(rs, depth = 0) {
  for (const r of rs) {
    console.log(' '.repeat(depth * 2) + `- ${r.path}  (name=${r.name}, hasComponent=${!!r.component})`)
    if (r.children) walk(r.children, depth + 1)
  }
}
walk(routes)
const dashRoute = routes.find((r) => r.path === 'dashboard')
console.log('[3] 顶层有 dashboard 路由?', !!dashRoute, dashRoute ? `(component loader=${typeof dashRoute.component})` : '')

// 3) userinfo
const ui = browser.dispatchMock({
  url: '/api/auth/userinfo',
  method: 'get',
  headers: { authorization: 'Bearer mock-token-admin' },
})
console.log('[4] /api/auth/userinfo permissions =', JSON.stringify(ui.data.data.permissions))
console.log('[4] admin 含 * ?', ui.data.data.permissions.includes('*'))
