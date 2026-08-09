// 临时冒烟测试：用 esbuild 编译真实 src/mock/browser.ts，在 Node 里调 dispatchMock
// 验证：① 字典 GET 返回新引用（拷贝，修复不刷新）② 权限树动态生成含新增菜单
import { build } from 'esbuild'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve('.')
const out = path.join(root, 'scripts', `.smoke-browser-${Date.now()}.mjs`)
await build({
  entryPoints: [path.join(root, 'src/mock/browser.ts')],
  outfile: out,
  bundle: true,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
})

// mock localStorage
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
}

const { dispatchMock } = await import(pathToFileURL(out).href)
const req = (url, method, body) => dispatchMock({ url, method, body, headers: {} })

let pass = true
const check = (label, cond) => {
  console.log(`[${cond ? 'PASS' : 'FAIL'}] ${label}`)
  if (!cond) pass = false
}

// ---- 1. 字典 GET 返回新引用（拷贝）----
const d1 = req('/api/system/dict', 'get').data.data.list
const d2 = req('/api/system/dict', 'get').data.data.list
check('字典 GET 每次返回新数组引用（解决不刷新）', d1 !== d2)
const baseLen = d1.length
check('字典初始有数据', baseLen > 0)

// ---- 2. 字典 POST 后即时生效 ----
const postDict = req('/api/system/dict', 'post', {
  name: 'smoke', code: 'smoke', label: '冒烟测试', type: 1, status: 1, remark: '',
})
check('字典 POST 成功(200)', postDict.status === 200)
const d3 = req('/api/system/dict', 'get').data.data.list
check('字典 POST 后列表长度 +1', d3.length === baseLen + 1)

// ---- 3. 权限树动态生成，含新增菜单 ----
const t1 = JSON.stringify(req('/api/system/permission/tree', 'get').data.data.list)
const postMenu = req('/api/system/menu', 'post', {
  parentId: 3, title: 'SmokeMenu', name: 'smokemenu', path: '/components/smoke',
  component: 'components/Table', icon: 'Star', sort: 9, status: 1, permission: 'smokemenu:view',
})
check('菜单 POST 成功(200)', postMenu.status === 200)
const t2 = JSON.stringify(req('/api/system/permission/tree', 'get').data.data.list)
check('权限树动态包含新增菜单 SmokeMenu', t2.includes('SmokeMenu'))
check('权限树节点数增长', t2.length > t1.length)

fs.unlinkSync(out)
console.log(pass ? '\n=== SMOKE ALL PASS ===' : '\n=== SMOKE HAS FAIL ===')
process.exit(pass ? 0 : 1)
