/**
 * OrangeAdmin RBAC 测试手册「实机演练」脚本
 * 严格按 RBAC-测试手册.md 的 T-01 ~ T-10 顺序，用真实无头 Chromium 操作并录制视频。
 * 每个用例开始前在页面底部注入步骤浮层，录屏里能一眼对应手册。
 * 运行：
 *   NODE_PATH=C:/Users/16354/.workbuddy/binaries/node/workspace/node_modules \
 *   C:/Users/16354/.workbuddy/binaries/node/versions/22.22.2/node.exe scripts/run_manual_test.cjs
 */
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const BASE = 'http://localhost:4180/'
const SHOT_DIR = path.join(__dirname, 'ui-shots')
fs.mkdirSync(SHOT_DIR, { recursive: true })

let pass = 0, fail = 0
function assert(cond, msg) {
  if (cond) { pass++; console.log('  ✅', msg) }
  else { fail++; console.error('  ❌ FAIL', msg) }
}

// 在页面底部注入/更新步骤浮层（录屏对应手册）
async function setStep(page, text) {
  await page.evaluate((t) => {
    let el = document.getElementById('__test_step')
    if (!el) {
      el = document.createElement('div')
      el.id = '__test_step'
      el.style.cssText = 'position:fixed;bottom:14px;left:50%;transform:translateX(-50%);z-index:2147483647;background:rgba(17,24,39,.92);color:#fff;padding:9px 20px;border-radius:999px;font:600 14px/1.4 system-ui,"Microsoft YaHei",sans-serif;box-shadow:0 4px 20px rgba(0,0,0,.35);pointer-events:none;white-space:nowrap;letter-spacing:.5px'
      document.body.appendChild(el)
    }
    el.textContent = t
  }, text)
  await page.waitForTimeout(300)
}
const shot = (page, name) => page.screenshot({ path: path.join(SHOT_DIR, name) })

// 真实逐字键盘登录（精确定位 placeholder，避免脆弱匹配；先清空初始值再 type）
async function doLogin(page, username, stepText) {
  if (stepText) await setStep(page, stepText)
  await page.goto(BASE)
  await page.evaluate(() => { localStorage.removeItem('orange-admin-token'); localStorage.removeItem('orange-admin-userinfo') })
  await page.reload()
  await page.waitForSelector('input[placeholder="用户名"]', { timeout: 15000 })
  const u = page.locator('input[placeholder="用户名"]')
  await u.click(); await page.waitForTimeout(150)
  await u.fill('') // 关键：清空登录表单初始值（admin/123456），否则 keyboard.type 会追加导致 adminadmin
  await page.waitForTimeout(150)
  await page.keyboard.type(username, { delay: 90 }); await page.waitForTimeout(150)
  const p = page.locator('input[placeholder="密码"]')
  await p.click(); await p.fill(''); await page.waitForTimeout(150)
  await page.keyboard.type('123456', { delay: 90 }); await page.waitForTimeout(200)
  await page.locator('button.submit').click()
  await page.waitForSelector('.sidebar .el-menu', { timeout: 15000 })
  await page.waitForTimeout(500)
}

async function sidebarText(page) { return await page.locator('.sidebar').innerText() }

async function openRoleAssign(page, roleName) {
  await page.goto(BASE + 'system/role')
  await page.waitForSelector('table', { timeout: 10000 })
  await page.waitForTimeout(300)
  const row = page.locator('tr', { hasText: roleName })
  await row.locator('button:has-text("分配权限")').click()
  await page.waitForSelector('.el-dialog .el-tree', { timeout: 10000 })
  await page.waitForTimeout(300)
}

// 切换分组（父）节点的勾选状态：uncheck=true 表示要取消勾选
async function toggleTreeGroup(page, groupTitle, uncheck) {
  const node = page.locator('.el-tree-node__content', { hasText: groupTitle }).first()
  await node.hover(); await page.waitForTimeout(250)
  const isChecked = (await node.locator('.el-checkbox__input.is-checked').count()) > 0
  if (isChecked === uncheck) {
    await node.locator('.el-checkbox__inner').click()
    await page.waitForTimeout(300)
  }
}

// 在某个父分组（scope）下的叶子节点上操作：若当前已勾选则取消（用于 T-06 精确收回）
async function uncheckLeafUnder(page, parentText, leafText) {
  const parent = page.locator('.el-tree-node', { hasText: parentText })
  const leaf = parent.locator('.el-tree-node__content', { hasText: leafText }).first()
  await leaf.hover(); await page.waitForTimeout(200)
  const checked = (await leaf.locator('.el-checkbox__input.is-checked').count()) > 0
  if (checked) {
    await leaf.locator('.el-checkbox__inner').click()
    await page.waitForTimeout(250)
  }
}

// 表单字段按 label 关联填写
async function fillField(page, labelText, value) {
  const item = page.locator('.el-form-item', { hasText: labelText }).first()
  const input = item.locator('.el-input__inner').first()
  await input.click(); await input.fill(value); await page.waitForTimeout(150)
}

(async () => {
  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: SHOT_DIR, size: { width: 1440, height: 900 } },
  })
  const page = await context.newPage()
  page.on('console', (m) => { if (m.type() === 'error') console.log('   [browser-error]', m.text()) })

  try {
    // ===== T-01 超级管理员登录 =====
    console.log('\n=== T-01 超级管理员登录 ===')
    await doLogin(page, 'admin', '📋 手册 T-01｜超级管理员登录（admin / 123456）')
    await shot(page, 'T01-sidebar.png')
    let sb = await sidebarText(page)
    assert(sb.includes('组件演示'), 'T-01 admin 侧边栏显示「组件演示」分组')
    await page.goto(BASE + 'system/user'); await page.waitForSelector('table'); await page.waitForTimeout(300)
    await shot(page, 'T01-user-page.png')
    assert((await page.locator('button:has-text("新增")').count()) > 0, 'T-01 admin 用户管理页「新增」按钮可见（* 通配）')
    assert((await page.locator('button:has-text("删除")').count()) > 0, 'T-01 admin 用户管理页「删除」按钮可见')

    // ===== T-02 普通用户登录 =====
    console.log('\n=== T-02 普通用户登录 ===')
    await doLogin(page, 'user', '📋 手册 T-02｜普通用户登录（user / 123456）')
    await shot(page, 'T02-sidebar.png')
    sb = await sidebarText(page)
    assert(sb.includes('系统管理'), 'T-02 user 侧边栏可见「系统管理」顶级分组（子菜单默认折叠，仅顶级 submenu 标题 innerText 可读）')
    assert(sb.includes('组件演示'), 'T-02 user 侧边栏可见「组件演示」顶级分组')
    await page.goto(BASE + 'system/user'); await page.waitForSelector('table'); await page.waitForTimeout(300)
    await shot(page, 'T02-user-page.png')
    assert((await page.locator('button:has-text("新增")').count()) === 0, 'T-02 user 用户管理页「新增」按钮不可见（无 user:add）')
    assert((await page.locator('button:has-text("删除")').count()) === 0, 'T-02 user 用户管理页「删除」按钮不可见（无 user:delete）')
    await page.goto(BASE + 'system/role'); await page.waitForSelector('table'); await page.waitForTimeout(300)
    assert((await page.locator('button:has-text("分配权限")').count()) === 0, 'T-02 user 角色管理页「分配权限」按钮不可见（无 role:assign）')

    // ===== T-03 回收超级管理员「组件演示」→ 即时隐藏 =====
    console.log('\n=== T-03 回收超级管理员组件演示（即时生效）===')
    await doLogin(page, 'admin', '📋 手册 T-03｜切回超级管理员')
    await openRoleAssign(page, '超级管理员')
    await setStep(page, '📋 手册 T-03｜取消超级管理员「组件演示」全部勾选')
    await shot(page, 'T03-dialog-before.png')
    await toggleTreeGroup(page, '组件演示', true)
    await shot(page, 'T03-dialog-uncheck.png')
    await setStep(page, '📋 手册 T-03｜点「确定」保存')
    await page.locator('.el-dialog button:has-text("确定")').click()
    await page.waitForSelector('.el-dialog', { state: 'hidden', timeout: 8000 })
    await page.waitForTimeout(600)
    await setStep(page, '📋 手册 T-03｜侧边栏「组件演示」应已消失')
    await shot(page, 'T03-sidebar-after.png')
    sb = await sidebarText(page)
    assert(!sb.includes('组件演示'), 'T-03 【修复后】回收组件演示后侧边栏立即隐藏（无需刷新）')

    // ===== T-05 回收普通用户「组件演示」 =====
    console.log('\n=== T-05 回收普通用户组件演示 ===')
    await openRoleAssign(page, '普通用户')
    await setStep(page, '📋 手册 T-05｜取消普通用户「组件演示」全部勾选')
    await toggleTreeGroup(page, '组件演示', true)
    await setStep(page, '📋 手册 T-05｜点「确定」保存')
    await page.locator('.el-dialog button:has-text("确定")').click()
    await page.waitForSelector('.el-dialog', { state: 'hidden', timeout: 8000 })
    await doLogin(page, 'user', '📋 手册 T-05｜普通用户重新登录')
    await page.waitForTimeout(400)
    await shot(page, 'T05-user-sidebar.png')
    sb = await sidebarText(page)
    assert(!sb.includes('组件演示'), 'T-05 普通用户登录后侧边栏不显示「组件演示」')

    // ===== T-06 给普通用户追加操作权限 =====
    console.log('\n=== T-06 给普通用户追加操作权限 ===')
    await doLogin(page, 'admin', '📋 手册 T-06｜切回超级管理员')
    await openRoleAssign(page, '普通用户')
    await setStep(page, '📋 手册 T-06｜勾选「用户管理」→ 取消「删除」「导出」')
    await toggleTreeGroup(page, '用户管理', false) // 确保勾选（含全部子）
    await uncheckLeafUnder(page, '用户管理', '删除')
    await uncheckLeafUnder(page, '用户管理', '导出')
    await shot(page, 'T06-dialog.png')
    await setStep(page, '📋 手册 T-06｜点「确定」保存')
    await page.locator('.el-dialog button:has-text("确定")').click()
    await page.waitForSelector('.el-dialog', { state: 'hidden', timeout: 8000 })
    await doLogin(page, 'user', '📋 手册 T-06｜普通用户重新登录')
    await page.goto(BASE + 'system/user'); await page.waitForSelector('table'); await page.waitForTimeout(300)
    await shot(page, 'T06-user-page.png')
    assert((await page.locator('button:has-text("新增")').count()) > 0, 'T-06 普通用户用户管理页「新增」按钮可见（已授权 user:add）')
    assert((await page.locator('button:has-text("编辑")').count()) > 0, 'T-06 普通用户用户管理页「编辑」按钮可见（已授权 user:edit）')
    assert((await page.locator('button:has-text("删除")').count()) === 0, 'T-06 普通用户用户管理页「删除」按钮仍不可见（未授权 user:delete）')
    assert((await page.locator('button:has-text("导出")').count()) === 0, 'T-06 普通用户用户管理页「导出」按钮仍不可见（未授权 user:export）')

    // ===== T-07 新增菜单出现在权限分配树 =====
    console.log('\n=== T-07 新增菜单联动权限树 ===')
    await doLogin(page, 'admin', '📋 手册 T-07｜切回超级管理员')
    await page.goto(BASE + 'system/menu'); await page.waitForSelector('table'); await page.waitForTimeout(300)
    await setStep(page, '📋 手册 T-07｜菜单管理 → 新增')
    await page.locator('button:has-text("新增")').first().click()
    await page.waitForSelector('.el-dialog', { timeout: 8000 }); await page.waitForTimeout(300)
    await fillField(page, '菜单名称', '测试菜单')
    // 上级菜单是 <el-tree-select>（继承 el-select，root class 是 .el-select），弹出的是一个 tree
    const parentItem = page.locator('.el-form-item', { hasText: '上级菜单' }).first()
    await parentItem.locator('.el-select').first().click()
    await page.waitForTimeout(800)
    await page.locator('.el-tree-node__content', { hasText: '系统管理' }).first().click()
    await page.waitForTimeout(500)
    await fillField(page, '路由名', 'demo')
    await fillField(page, '路径', '/system/demo')
    await fillField(page, '组件', 'system/Demo')
    await shot(page, 'T07-menu-form.png')
    await setStep(page, '📋 手册 T-07｜点「确定」新增菜单')
    await page.locator('.el-dialog button:has-text("确定")').click()
    await page.waitForSelector('.el-dialog', { state: 'hidden', timeout: 8000 }); await page.waitForTimeout(400)
    await openRoleAssign(page, '超级管理员')
    await setStep(page, '📋 手册 T-07｜权限树「系统管理」下应出现「测试菜单」')
    const sysNode = page.locator('.el-tree-node', { hasText: '系统管理' })
    assert((await sysNode.locator('.el-tree-node__content', { hasText: '测试菜单' }).count()) > 0, 'T-07 权限分配树「系统管理」下自动出现「测试菜单」')
    await page.locator('.el-dialog button:has-text("取消")').click()
    await page.waitForSelector('.el-dialog', { state: 'hidden', timeout: 8000 })

    // ===== T-08 路由守卫：无权限路由拦截到 403 =====
    console.log('\n=== T-08 路由守卫 403 拦截 ===')
    await doLogin(page, 'user', '📋 手册 T-08｜普通用户登录（图表权限已在 T-05 收回）')
    await setStep(page, '📋 手册 T-08｜地址栏直接输入 /components/chart 回车')
    await page.goto(BASE + 'components/chart')
    await page.waitForTimeout(800)
    await shot(page, 'T08-403-page.png')
    const url = page.url()
    const bodyText = await page.locator('#app').innerText().catch(() => '')
    assert(url.includes('/403') || bodyText.includes('403') || bodyText.includes('无权限'), `T-08 user 无 chart:view 直接访问图表 → 被拦截（URL: ${url}）`)

    // ===== T-09 恢复默认数据 =====
    console.log('\n=== T-09 恢复默认数据 ===')
    await doLogin(page, 'admin', '📋 手册 T-09｜切回超级管理员')
    await page.goto(BASE + 'system/role'); await page.waitForSelector('table'); await page.waitForTimeout(300)
    await setStep(page, '📋 手册 T-09｜点「恢复默认数据」')
    await page.locator('button:has-text("恢复默认数据")').click()
    await page.waitForSelector('.el-message-box', { timeout: 8000 }); await page.waitForTimeout(500)
    await setStep(page, '📋 手册 T-09｜确认恢复')
    await page.locator('.el-message-box .el-button--primary').click()
    await page.waitForTimeout(800)
    await page.reload(); await page.waitForSelector('.sidebar .el-menu'); await page.waitForTimeout(600)
    await setStep(page, '📋 手册 T-09｜超级管理员应恢复全部菜单')
    await shot(page, 'T09-sidebar.png')
    sb = await sidebarText(page)
    assert(sb.includes('组件演示'), 'T-09 恢复默认后超级管理员侧边栏恢复「组件演示」（回到 *）')

    // ===== T-10 切换账号陈旧状态 =====
    console.log('\n=== T-10 切换账号强制重注入 ===')
    await doLogin(page, 'admin', '📋 手册 T-10｜超级管理员登录（含全部菜单）')
    await shot(page, 'T10-admin-sidebar.png')
    await doLogin(page, 'user', '📋 手册 T-10｜退出后登录普通用户')
    await page.waitForTimeout(400)
    await shot(page, 'T10-user-sidebar.png')
    sb = await sidebarText(page)
    // 普通用户（恢复默认后）有 view 集合 → 含组件演示；重点验证按钮按角色即时刷新
    await page.goto(BASE + 'system/user'); await page.waitForSelector('table'); await page.waitForTimeout(300)
    await shot(page, 'T10-user-page.png')
    assert((await page.locator('button:has-text("删除")').count()) === 0, 'T-10 切换到 user 后用户管理页「删除」按钮不可见（按角色即时刷新，无陈旧）')
  } catch (e) {
    fail++
    console.error('  ❌ 脚本异常:', e.message)
    try { await shot(page, '99-exception.png') } catch {}
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }

  let videoFile = ''
  try {
    const files = fs.readdirSync(SHOT_DIR).filter((f) => f.endsWith('.webm'))
    videoFile = files.length ? path.join(SHOT_DIR, files.sort().reverse()[0]) : ''
  } catch {}

  console.log('\n========================================')
  console.log(`手册实机演练：PASS ${pass}  FAIL ${fail}`)
  console.log('截图目录:', SHOT_DIR)
  if (videoFile) console.log('录屏文件:', videoFile)
  console.log('========================================')
  process.exit(fail > 0 ? 1 : 0)
})()
