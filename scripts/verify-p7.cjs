// P7 验证：移动端抽屉 + 暗黑切换 + 桌面回归
const { chromium } = require('playwright')
const BASE = process.env.BASE_URL || 'http://localhost:4180'

let pass = 0
let fail = 0
function log(ok, msg) {
  console.log(`${ok ? '✅' : '❌'} ${msg}`)
  ok ? pass++ : fail++
}

async function login(page) {
  await page.goto(`${BASE}/#/login`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.login-page', { timeout: 8000 })
  const inp = page.locator('.login-page .el-input__inner')
  await inp.nth(0).fill('admin')
  await inp.nth(1).fill('123456')
  await page.click('.login-page button.submit')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(600)
}

;(async () => {
  const browser = await chromium.launch()

  // ---------- 桌面视口：侧边栏常驻、功能正常 ----------
  const ctxD = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const d = await ctxD.newPage()
  await login(d)
  log(await d.locator('.sidebar-container').isVisible(), '桌面：常驻侧边栏可见')
  log(!(await d.locator('.mobile-sidebar-drawer').count()), '桌面：移动抽屉未渲染')
  // 点击仪表盘菜单
  await d.locator('.sidebar .el-menu-item', { hasText: '仪表盘' }).first().click()
  await d.waitForTimeout(400)
  log(/dashboard/.test(d.url()) || d.url().includes('dashboard'), `桌面：点击菜单路由跳转 ${d.url().split('#')[1]}`)
  // 暗黑切换
  const darkBefore = await d.evaluate(() => document.documentElement.classList.contains('dark'))
  await d.locator('.header .action', { hasText: '' }).first().click().catch(async () => {
    // 退而求其次：点暗黑图标（Sunny/Moon）
    await d.locator('.header .action').nth(0).click()
  })
  await d.waitForTimeout(400)
  const darkAfter = await d.evaluate(() => document.documentElement.classList.contains('dark'))
  log(darkBefore !== darkAfter, `桌面：暗黑模式切换生效（${darkBefore} -> ${darkAfter}）`)
  await ctxD.close()

  // ---------- 移动端视口：抽屉化 ----------
  const ctxM = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const m = await ctxM.newPage()
  await login(m)
  // 移动端：常驻 aside 不渲染
  log(!(await m.locator('.sidebar-container').count()), '移动端：常驻侧边栏已隐藏（改用抽屉）')
  // 汉堡按钮（Menu 图标）应可见；折叠按钮（Fold/Expand）不应存在
  const hamburgerVisible = await m.locator('.header .trigger').first().isVisible()
  log(hamburgerVisible, '移动端：顶部汉堡按钮可见')
  // 点击汉堡打开抽屉
  await m.locator('.header .trigger').first().click()
  await m.waitForTimeout(500)
  const drawerVisible = await m.locator('.mobile-sidebar-drawer').isVisible().catch(() => false)
  log(drawerVisible, '移动端：点击汉堡后抽屉侧边栏弹出')
  // 抽屉内菜单可见
  if (drawerVisible) {
    const menuInDrawer = await m.locator('.mobile-sidebar-drawer .el-menu').first().isVisible().catch(() => false)
    log(menuInDrawer, '移动端：抽屉内菜单可见')
    // 点击某个菜单项，路由跳转且抽屉自动收起
    await m.locator('.mobile-sidebar-drawer .el-menu-item', { hasText: '仪表盘' }).first().click()
    await m.waitForTimeout(600)
    log(m.url().includes('dashboard'), `移动端：抽屉点击菜单跳转 ${m.url().split('#')[1]}`)
    const closedAfterNav = !(await m.locator('.mobile-sidebar-drawer').isVisible().catch(() => false))
    log(closedAfterNav, '移动端：跳转后抽屉自动收起')
  }
  // 头部次要操作在移动端隐藏（面包屑不可见）
  const breadcrumbVisible = await m.locator('.header .breadcrumb').isVisible().catch(() => false)
  log(!breadcrumbVisible, '移动端：头部面包屑已隐藏（精简）')
  await ctxM.close()

  await browser.close()
  console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
  process.exit(fail === 0 ? 0 : 1)
})().catch((e) => {
  console.error('运行异常', e)
  process.exit(2)
})
