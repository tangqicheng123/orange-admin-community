// i18n 中英双语回归：登录页 + Dashboard + 侧边栏 + 用户管理 + 表单页 + EP 内置文案
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()

  // 首次加载清缓存（用 sessionStorage 标记防止后续 goto 重复清，否则会丢登录态）
  await page.addInitScript(() => {
    try {
      if (!sessionStorage.getItem('__i18n_test_cleared__')) {
        localStorage.clear()
        sessionStorage.setItem('__i18n_test_cleared__', '1')
      }
    } catch {}
  })

  const outDir = path.join(__dirname, 'ui-shots', 'i18n')
  fs.mkdirSync(outDir, { recursive: true })

  // 辅助：截图 + 断言页面上的关键文案
  async function snap(name, asserts) {
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: false })
    if (asserts) {
      const html = await page.content()
      const issues = []
      for (const [label, expected, must] of asserts) {
        const found = html.includes(expected)
        if (must && !found) issues.push(`✗ ${label}: missing "${expected}"`)
        if (!must && found) issues.push(`✗ ${label}: should NOT contain "${expected}"`)
      }
      if (issues.length) throw new Error(`[${name}] assertions failed:\n${issues.join('\n')}`)
      console.log(`✓ ${name}: ${asserts.length} text assertions passed`)
    }
  }

  // SPA 内部跳转（用侧边栏菜单点击）— 避免 page.goto 重新加载丢登录态
  // 既能点顶层菜单项（导航），也能点子菜单标题（展开）；嵌套项不可见时自动展开父级 submenu
  async function clickSidebar(text) {
    const item = page.locator('.sidebar .el-menu-item').filter({ hasText: text }).first()
    const itemCount = await item.count()
    let visible = false
    if (itemCount > 0) {
      try { visible = await item.isVisible() } catch {}
    }
    if (itemCount > 0 && !visible) {
      // 嵌套项：先展开其所在的父级 submenu 标题
      const parent = page
        .locator('.sidebar .el-sub-menu')
        .filter({ has: page.locator('.el-menu-item').filter({ hasText: text }) })
        .locator('.el-sub-menu__title')
        .first()
      try { await parent.click() } catch (e) { console.log('  (expand parent failed:', e.message + ')') }
      await page.waitForTimeout(350)
    }
    if (itemCount > 0) {
      try { await item.scrollIntoViewIfNeeded() } catch {}
      await item.click()
      await page.waitForTimeout(550)
      return
    }
    // 否则当作子菜单标题点击（展开 / 收起）
    const title = page.locator('.sidebar .el-sub-menu__title').filter({ hasText: text }).first()
    try { await title.scrollIntoViewIfNeeded() } catch {}
    await title.click()
    await page.waitForTimeout(550)
  }

  // 1) 中文状态 - 登录页
  await page.goto('http://localhost:4180/login', { waitUntil: 'networkidle' })
  await snap('1-zh-login', [
    ['login submit button', '登 录', true],
    ['demo tips', '演示账号', true],
    ['English text', 'Sign in', false],
  ])

  // 登录
  await page.fill('input[placeholder="用户名"]', 'admin')
  await page.fill('input[placeholder="密码"]', '123456')
  await page.locator('button:has-text("登 录")').click()
  await page.waitForURL(/\/dashboard/, { timeout: 10000 })
  await page.waitForTimeout(600)

  await snap('2-zh-dashboard', [
    ['sidebar dashboard', '仪表盘', true],
    ['sidebar system', '系统管理', true],
    ['card user', '总用户数', true],
    ['chart visit', '访问与订单趋势', true],
    ['English header', 'Sign in', false],
    ['English sidebar', 'Dashboard', false],
  ])

  // 用户管理页（点击侧边栏菜单）
  await clickSidebar('用户管理')
  await snap('3-zh-user', [
    ['title', '用户管理', true],
    ['col username', '用户名', true],
    ['col dept', '部门', true],
    ['search placeholder', '用户名 / 昵称', true],
    ['btn add', '新增', true],
    ['English content', 'User management', false],
  ])

  // 表单演示页（点击「组件演示 → 表单」）
  await clickSidebar('组件演示')
  await clickSidebar('表单')
  await snap('4-zh-form', [
    ['form title', '表单组件演示', true],
    ['form username label', '用户名', true],
    ['form gender', '男', true],
    ['English title', 'Form components demo', false],
  ])

  // 切回 Dashboard 做英文切换
  await clickSidebar('仪表盘')

  // 2) 切换到英文：点 Header 的语言下拉
  await page.locator('.lang-btn').click()
  await page.waitForTimeout(200)
  await page.locator('.el-dropdown-menu li:has-text("English")').click()
  await page.waitForTimeout(600)

  await snap('5-en-dashboard', [
    ['sidebar Dashboard', 'Dashboard', true],
    ['sidebar System', 'System', true],
    ['card users', 'Total users', true],
    ['chart visit', 'order trend', true],
    ['header lang btn shows EN', 'EN', true],
    ['Chinese sidebar', '仪表盘', false],
  ])

  // 英文用户管理
  await clickSidebar('Users')
  await snap('6-en-user', [
    ['title', 'User management', true],
    ['col Username', 'Username', true],
    ['col Dept', 'Department', true],
    ['placeholder', 'Username or nickname', true],
    ['btn add', 'Add', true],
    ['Chinese content', '用户管理', false],
  ])

  // 英文表单
  await clickSidebar('Components')
  await clickSidebar('Form')
  await snap('7-en-form', [
    ['form title', 'Form components demo', true],
    ['form username', 'Username', true],
    ['form gender male', 'Male', true],
    ['Chinese title', '表单组件演示', false],
  ])

  // 英文登录页：登出（点 header 下拉 Log out）
  await clickSidebar('Dashboard')
  await page.locator('.user').click()
  await page.waitForTimeout(200)
  await page.locator('.el-dropdown-menu li:has-text("Log out")').click()
  await page.waitForTimeout(200)
  await page.locator('.el-message-box .el-button--primary').click()
  await page.waitForURL(/\/login/, { timeout: 5000 })
  await page.waitForTimeout(500)
  await snap('8-en-login', [
    ['login submit', 'Sign in', true],
    ['username ph', 'Username', true],
    ['Chinese submit', '登 录', false],
  ])

  await browser.close()
  console.log('\n=== ALL i18n ASSERTIONS PASSED ===')
})().catch((e) => { console.error(e); process.exit(1) })