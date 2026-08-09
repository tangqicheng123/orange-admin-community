// P3 RBAC 验收脚本（接口层）
// 用法：先 `npm run dev` 启动开发服务器，再另开终端 `node scripts/verify-p3.mjs`
// 说明：按钮级 v-permission 是前端 DOM 行为，HTTP 无法验证，需配合浏览器清单；
//       本脚本验证 登录 / 双角色权限 / 错误密码拦截 / 按钮权限判定逻辑。
const BASE = 'http://localhost:5173'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function req(url, opts = {}) {
  for (let i = 0; i < 30; i++) {
    try {
      return await fetch(url, opts)
    } catch (e) {
      await wait(700)
    }
  }
  throw new Error('server not up: ' + url)
}
const post = (url, body) =>
  req(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

let pass = 0
let fail = 0
function check(name, cond, detail = '') {
  if (cond) {
    pass++
    console.log('  ✅', name, detail)
  } else {
    fail++
    console.log('  ❌', name, detail)
  }
}

// 与 src/directives/permission.ts 完全一致的判定逻辑
const has = (perms, p) => perms.includes('*') || perms.includes(p)

;(async () => {
  console.log('\n=== P3 接口层验收 ===')

  const root = await req(BASE + '/')
  const html = await root.text()
  check('首页可访问 (200)', root.status === 200)
  check('挂载点 #app 存在', html.includes('id="app"'))

  const adminRes = await post(BASE + '/api/auth/login', { username: 'admin', password: '123456' })
  const adminData = (await adminRes.json()).data
  check('admin 登录成功返回 token', !!adminData?.token)
  const aInfo = await (
    await req(BASE + '/api/auth/userinfo', { headers: { Authorization: 'Bearer ' + adminData.token } })
  ).json()
  check('admin 权限含通配 *', aInfo.data.permissions.includes('*'), JSON.stringify(aInfo.data.permissions))

  const userRes = await post(BASE + '/api/auth/login', { username: 'user', password: '123456' })
  const userData = (await userRes.json()).data
  check('user 登录成功返回 token', !!userData?.token)
  const uInfo = await (
    await req(BASE + '/api/auth/userinfo', { headers: { Authorization: 'Bearer ' + userData.token } })
  ).json()
  check('user 无 * 通配', !uInfo.data.permissions.includes('*'), JSON.stringify(uInfo.data.permissions))
  check('user 含受限权限 user:view', uInfo.data.permissions.includes('user:view'))

  const badRes = await post(BASE + '/api/auth/login', { username: 'admin', password: 'wrong' })
  const badJson = await badRes.json()
  check('错误密码被拦截 (code!=0)', badJson.code !== 0, 'msg=' + badJson.message)

  // 按钮级权限判定（与 v-permission 逻辑一致）
  check('user 对 user:add 按钮无权限', !has(uInfo.data.permissions, 'user:add'))
  check('admin 对 user:add 按钮有权限', has(aInfo.data.permissions, 'user:add'))

  console.log(`\n=== 结果: ${pass} 通过 / ${fail} 失败 ===`)
  if (fail > 0) process.exit(1)
})().catch((e) => {
  console.log('脚本错误:', e.message)
  process.exit(1)
})
