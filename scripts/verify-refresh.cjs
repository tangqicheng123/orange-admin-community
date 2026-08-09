// 验证 hash 路由下「登录→进入子页面→刷新」不丢页、不 404
const { chromium } = require('playwright')

const BASE = 'https://6394dac937e44efd84cb9375d5cba229.sh1.agentos-app.net'

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  // 仅清一次登录态，模拟真实新访客
  await page.addInitScript(() => {
    try {
      if (!sessionStorage.getItem('__refresh_test_cleared__')) {
        localStorage.clear()
        sessionStorage.setItem('__refresh_test_cleared__', '1')
      }
    } catch {}
  })

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)

  // 登录
  await page.fill('input[type="text"]', 'admin')
  await page.fill('input[type="password"]', '123456')
  await page.click('button:has-text("登 录")')
  await page.waitForTimeout(800)

  // 展开「系统管理」并点「用户管理」
  const systemItem = page.locator('.sidebar .el-sub-menu__title:has-text("系统管理")').first()
  if (await systemItem.isVisible().catch(() => false)) {
    await systemItem.click()
    await page.waitForTimeout(300)
  }
  await page.locator('.sidebar .el-menu-item:has-text("用户管理")').first().click()
  await page.waitForTimeout(700)

  const beforeUrl = page.url()
  const beforeHasTable = await page.locator('text=用户名').first().isVisible().catch(() => false)
  console.log('进入用户管理后 URL:', beforeUrl)
  console.log('进入用户管理后 表格可见:', beforeHasTable)

  // 关键：刷新页面，验证 hash 路由不丢页、不 404
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(900)

  const afterUrl = page.url()
  const afterHasTable = await page.locator('text=用户名').first().isVisible().catch(() => false)
  const is404 = await page.locator('text=404').first().isVisible().catch(() => false)
  console.log('刷新后 URL:', afterUrl)
  console.log('刷新后 表格可见:', afterHasTable, '| 出现404:', is404)

  const ok = afterHasTable && !is404 && afterUrl.includes('/system/user')
  console.log(ok ? 'PASS 刷新子页面不丢失、不404' : 'FAIL 刷新后异常')
  if (errors.length) console.log('页面JS错误:', errors.slice(0, 3))

  await browser.close()
  process.exit(ok ? 0 : 1)
})()
