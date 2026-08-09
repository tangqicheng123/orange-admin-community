/**
 * OrangeAdmin RBAC 真实浏览器验证（Playwright + Chromium）+ 每步截图
 * 对应测试手册核心用例：T-01 登录可见性 / T-03 回收即时隐藏 / T-05 普通用户 / T-08 路由守卫 403
 * 导航用 URL 直达（登录后动态路由已注入）；每步截图存到 scripts/ui-shots/ 供人工查看。
 * 运行：
 *   NODE_PATH=C:/Users/16354/.workbuddy/binaries/node/workspace/node_modules \
 *   C:/Users/16354/.workbuddy/binaries/node/versions/22.22.2/node.exe scripts/ui_rbac_test.cjs
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
const shot = (page, name) => page.screenshot({ path: path.join(SHOT_DIR, name) })

async function doLogin(page, username) {
  await page.goto(BASE)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForSelector('input[type="password"]', { timeout: 15000 })
  // 真实逐字键盘输入（而非 fill 瞬间赋值），让录屏能看到「填写输入框 + 光标聚焦」的过程
  const userInput = page.locator('input:not([type="password"])').first()
  await userInput.click()
  await page.waitForTimeout(150)
  await page.keyboard.type(username, { delay: 90 })
  await page.waitForTimeout(150)
  const pwdInput = page.locator('input[type="password"]')
  await pwdInput.click()
  await page.keyboard.type('123456', { delay: 90 })
  await page.waitForTimeout(200)
  await page.click('button.submit')
  await page.waitForSelector('.sidebar .el-menu', { timeout: 15000 })
  await page.waitForTimeout(400)
}

async function sidebarText(page) {
  return await page.locator('.sidebar').innerText()
}

async function openRoleAssign(page, roleName) {
  await page.goto(BASE + 'system/role')
  await page.waitForSelector('table', { timeout: 10000 })
  const row = page.locator('tr', { hasText: roleName })
  await row.locator('button:has-text("分配权限")').click()
  await page.waitForSelector('.el-dialog .el-tree', { timeout: 10000 })
  await page.waitForTimeout(300)
}

async function toggleTreeGroup(page, groupTitle, uncheck) {
  const node = page.locator('.el-tree-node__content', { hasText: groupTitle }).first()
  await node.hover() // 高亮，录屏里能看清当前操作的是哪个分组
  await page.waitForTimeout(300)
  const isChecked = (await node.locator('.el-checkbox__input.is-checked').count()) > 0
  if (isChecked === uncheck) {
    await node.locator('.el-checkbox__inner').click()
    await page.waitForTimeout(300) // 停留，看清勾选框被打勾/取消
  }
}

(async () => {
  const browser = await chromium.launch()
  // 视频录制需要 context 级别；录制全程操作到 ui-shots/xxx.webm
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: SHOT_DIR, size: { width: 1440, height: 900 } },
  })
  const page = await context.newPage()
  page.on('console', (m) => { if (m.type() === 'error') console.log('   [browser-error]', m.text()) })

  try {
    // ===== T-01 超级管理员登录可见性 =====
    console.log('\n=== T-01 超级管理员登录可见性 ===')
    await doLogin(page, 'admin')
    await shot(page, '01-admin-login-sidebar.png')
    let sb = await sidebarText(page)
    assert(sb.includes('组件演示'), 'admin 侧边栏显示「组件演示」分组')
    await page.goto(BASE + 'system/user')
    await page.waitForSelector('table', { timeout: 8000 })
    await shot(page, '02-admin-user-page.png')
    const addBtnVisible = await page.locator('button:has-text("新增")').count()
    assert(addBtnVisible > 0, 'admin 用户管理页「新增」按钮可见（* 通配）')

    // ===== T-03 回收超级管理员「组件演示」→ 即时隐藏 =====
    console.log('\n=== T-03 回收超级管理员组件演示（即时生效）===')
    await openRoleAssign(page, '超级管理员')
    await shot(page, '03-admin-perm-dialog-before.png')
    await toggleTreeGroup(page, '组件演示', true) // 取消勾选
    await shot(page, '04-admin-perm-dialog-uncheck.png')
    await page.locator('.el-dialog button:has-text("确定")').click()
    await page.waitForSelector('.el-dialog', { state: 'hidden', timeout: 8000 })
    await page.waitForTimeout(600)
    await shot(page, '05-admin-sidebar-after.png')
    sb = await sidebarText(page)
    assert(!sb.includes('组件演示'), '【修复后】回收组件演示后侧边栏立即隐藏（无需刷新）')

    // ===== T-05 普通用户回收「组件演示」后登录看不到 =====
    console.log('\n=== T-05 普通用户回收组件演示 ===')
    await openRoleAssign(page, '普通用户')
    await toggleTreeGroup(page, '组件演示', true)
    await shot(page, '06-user-perm-dialog-uncheck.png')
    await page.locator('.el-dialog button:has-text("确定")').click()
    await page.waitForSelector('.el-dialog', { state: 'hidden', timeout: 8000 })
    // 只清 token，保留角色权限覆盖，再用 user 登录
    await page.evaluate(() => localStorage.removeItem('orange-admin-token'))
    await page.reload()
    await page.waitForSelector('input[type="password"]', { timeout: 10000 })
    await page.fill('input[type="password"]', '123456')
    await page.locator('input:not([type="password"])').first().fill('user')
    await page.click('button.submit')
    await page.waitForSelector('.sidebar .el-menu', { timeout: 12000 })
    await page.waitForTimeout(400)
    await shot(page, '07-user-login-sidebar.png')
    sb = await sidebarText(page)
    assert(!sb.includes('组件演示'), '普通用户登录后侧边栏不显示「组件演示」')

    // ===== T-08 路由守卫：无权限路由拦截到 403 =====
    console.log('\n=== T-08 路由守卫 403 拦截 ===')
    await page.goto(BASE + 'components/chart')
    await page.waitForTimeout(800)
    await shot(page, '08-user-403-page.png')
    const url = page.url()
    const bodyText = await page.locator('#app').innerText().catch(() => '')
    assert(
      url.includes('/403') || bodyText.includes('403') || bodyText.includes('无权限') || bodyText.includes('forbidden'),
      `user 无 chart:view 直接访问图表 → 被拦截（当前 URL: ${url}）`
    )
  } catch (e) {
    fail++
    console.error('  ❌ 脚本异常:', e.message)
    try { await shot(page, '99-exception.png') } catch {}
  } finally {
    // context.close() 会 flush 视频到磁盘（newPage 录制的视频在 context 关闭后才落盘）
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }

  // 找出刚生成的视频文件
  let videoFile = ''
  try {
    const files = fs.readdirSync(SHOT_DIR).filter((f) => f.endsWith('.webm'))
    videoFile = files.length ? path.join(SHOT_DIR, files.sort().reverse()[0]) : ''
  } catch {}

  console.log('\n========================================')
  console.log(`UI 测试结果：PASS ${pass}  FAIL ${fail}`)
  console.log('截图目录:', SHOT_DIR)
  if (videoFile) console.log('录屏文件:', videoFile)
  console.log('========================================')
  process.exit(fail > 0 ? 1 : 0)
})()
