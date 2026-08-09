// 验证：点「个人中心」不再跳仪表盘，页面正常渲染，编辑昵称可持久化
const { chromium } = require('playwright')

const BASE = process.env.BASE_URL || 'https://6394dac937e44efd84cb9375d5cba229.sh1.agentos-app.net'
const REPORT = []
function log(ok, msg) {
  REPORT.push(`${ok ? '✅' : '❌'} ${msg}`)
  console.log(REPORT[REPORT.length - 1])
}

async function login(page, user) {
  await page.goto(`${BASE}/#/login`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.login-page', { timeout: 8000 })
  const inputs = page.locator('.login-page .el-input__inner')
  await inputs.nth(0).fill(user)
  await inputs.nth(1).fill('123456')
  await page.click('.login-page button.submit')
  await page.waitForLoadState('networkidle')
}

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log('[pageerror]', e.message))

  // 用普通用户 user 登录（非 admin，验证非超级管理员也能进个人中心）
  await login(page, 'user')
  await page.waitForSelector('.user', { timeout: 8000 })

  // 点开右上角头像下拉，再点「个人中心」
  await page.click('.user')
  const profileItem = page
    .locator('.el-dropdown-menu__item', { hasText: '个人中心' })
    .first()
  await profileItem.waitFor({ state: 'visible', timeout: 5000 })
  await profileItem.click()
  // 等待 URL 真正切到 profile（hash 路由，给足时间）
  await page.waitForURL(/\/#\/profile/, { timeout: 6000 }).catch(() => {})
  // 等待 profile 页面（懒加载 chunk）真正渲染出来，避免过早检测误报
  await page.waitForSelector('.profile-page', { timeout: 8000 })
  await page.waitForLoadState('networkidle')

  const url = page.url()
  const whichPage = await page.evaluate(() => {
    if (document.querySelector('.profile-page')) return 'PROFILE'
    if (document.querySelector('.dashboard') || document.querySelector('#dashboard')) return 'DASHBOARD'
    return 'OTHER:' + (document.querySelector('.app-main, .main, .el-main')?.className || '?')
  })
  console.log('  [diag] url=', url, ' page=', whichPage)
  log(/\/#\/profile/.test(url), `点击个人中心后 URL = ${url}（不再是 /dashboard）`)

  // 页面是否渲染个人中心内容
  const hasBase = await page.locator('text=基本资料').first().isVisible().catch(() => false)
  log(hasBase, '页面渲染了「基本资料」Tab')
  const hasSecurity = await page.locator('text=安全设置').first().isVisible().catch(() => false)
  log(hasSecurity, '页面渲染了「安全设置」Tab')

  // 左侧概览：用户名应显示 user（非 admin）
  const uname = await page.locator('.overview .uname').textContent().catch(() => '')
  log((uname || '').trim() === 'user', `左侧概览显示当前用户名：${(uname || '').trim()}`)

  // 编辑昵称并保存（只匹配可见 input：基本资料 tab 激活时，安全设置表单被 v-show 隐藏）
  const newNick = '测试昵称_' + Date.now()
  const baseInputs = page.locator('.profile-page .el-input__inner', { visible: true })
  await baseInputs.nth(1).fill(newNick) // 昵称是第二项（第 0 项是 disabled 用户名）
  await page.locator('.profile-form button:has-text("保存修改")').click()
  // 等待并取最新一条消息（避免取到登录时的「登录成功」残留）
  await page.waitForSelector('.el-message', { timeout: 4000 }).catch(() => {})
  await page.waitForTimeout(400)
  const msg = await page.locator('.el-message').last().textContent().catch(() => '')
  log(/保存/.test(msg || ''), `保存后提示：${(msg || '').trim()}`)
  const nickVal = await page.locator('.profile-form .el-input__inner').nth(1).inputValue()
  log(nickVal === newNick, `昵称输入框已更新为：${nickVal}`)

  // 刷新后昵称是否持久化（localStorage override）
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('.profile-form', { timeout: 8000 })
  const nickAfter = await page.locator('.profile-form .el-input__inner').nth(1).inputValue()
  log(nickAfter === newNick, `刷新后昵称仍持久化为：${nickAfter}`)

  // 安全设置：修改密码（原密码 123456，新密码 1234567）
  await page.locator('.el-tabs__item', { hasText: '安全设置' }).click()
  await page.waitForTimeout(300)
  const pwdInputs = page.locator('.profile-page .el-input__inner', { visible: true })
  await pwdInputs.nth(0).fill('123456')
  await pwdInputs.nth(1).fill('1234567')
  await pwdInputs.nth(2).fill('1234567')
  await page.locator('.profile-form button:has-text("修改密码")').click()
  await page.waitForSelector('.el-message', { timeout: 4000 }).catch(() => {})
  await page.waitForTimeout(400)
  const pwdMsg = await page.locator('.el-message').last().textContent().catch(() => '')
  log(/成功/.test(pwdMsg || ''), `修改密码提示：${(pwdMsg || '').trim()}`)

  // 收尾：恢复演示账号 user 的昵称，避免污染 DEMO 数据
  await page.locator('.el-tabs__item', { hasText: '基本资料' }).click().catch(() => {})
  await page.waitForTimeout(300)
  const restore = page.locator('.profile-page .el-input__inner', { visible: true })
  await restore.nth(1).fill('张三')
  await page.locator('.profile-form button:has-text("保存修改")').click().catch(() => {})
  await page.waitForTimeout(500)

  await browser.close()
  console.log('\n=== 总结 ===')
  console.log(`PASS: ${REPORT.filter((r) => r.startsWith('✅')).length} / ${REPORT.length}`)
  if (REPORT.some((r) => r.startsWith('❌'))) process.exit(1)
})()
