// 验证 mock 菜单「种子自愈」：脏数据删掉核心骨架菜单(id 1/2/3)后，模块加载时自动补回。
import { build } from 'esbuild'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const browserSrc = path.join(root, 'src/mock/browser.ts')

// 预置脏覆盖：删掉 id=1(仪表盘) 与 id=3(组件演示)，保留其余骨架
const seedMinus = [
  { id: 2, parentId: 0, title: '系统管理', name: 'system', path: '/system', component: 'Layout', icon: 'Setting', sort: 2, status: 1, permission: '' },
  { id: 4, parentId: 2, title: '用户管理', name: 'user', path: '/system/user', component: 'system/User', icon: 'User', sort: 1, status: 1, permission: 'user:view' },
  { id: 5, parentId: 2, title: '角色管理', name: 'role', path: '/system/role', component: 'system/Role', icon: 'UserFilled', sort: 2, status: 1, permission: 'role:view' },
]
const store = new Map()
store.set('orange-admin-menus', JSON.stringify(seedMinus))
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  key: (i) => [...store.keys()][i] ?? null,
  get length() { return store.size },
}

const res = await build({
  entryPoints: [browserSrc],
  bundle: true,
  format: 'esm',
  write: false,
  platform: 'browser',
  logLevel: 'silent',
  loader: { '.vue': 'empty' },
  alias: { '@': path.join(root, 'src') },
})
const mod = await import('data:text/javascript;base64,' + Buffer.from(res.outputFiles[0].text).toString('base64'))

const menuRes = mod.dispatchMock({ url: '/api/system/menu', method: 'get', headers: {} })
const list = menuRes.data.data.list
const ids = list.map((m) => m.id).sort((a, b) => a - b)
console.log('[自愈] 脏覆盖(缺 id 1,3) 加载后，GET /api/system/menu 返回 id 列表 =', JSON.stringify(ids))
console.log('[自愈] 自动补回 id=1(仪表盘)?', list.some((m) => m.id === 1), list.find((m) => m.id === 1)?.title ?? '')
console.log('[自愈] 自动补回 id=3(组件演示)?', list.some((m) => m.id === 3), list.find((m) => m.id === 3)?.title ?? '')
console.log('[自愈] 用户保留的菜单仍在(id=4)?', list.some((m) => m.id === 4))
const pass = list.some((m) => m.id === 1) && list.some((m) => m.id === 3) && list.some((m) => m.id === 4)
console.log(pass ? '\n✅ 种子自愈 PASS' : '\n❌ 种子自愈 FAIL')
process.exit(pass ? 0 : 1)
