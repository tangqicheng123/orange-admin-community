/**
 * 主题色 + 登录页 + 侧边栏样式回归截图
 * 目标：验证 main.ts 默认主色修复 + 登录页浅米背景 + 侧边栏空隙兜底
 * 输出：scripts/ui-shots/theme-fix-*.png
 */
const path = require('node:path')
const fs = require('node:fs')
const { chromium } = require('playwright')

const BASE = process.env.PREVIEW_URL || 'http://localhost:4181'
const OUT = path.join(__dirname, 'ui-shots', 'theme-fix')
fs.mkdirSync(OUT, { recursive: true })

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  })
  const page = await ctx.newPage()

  // ========== 1) 登录页（无 localStorage 状态） ==========
  // 关键：要先清掉 localStorage 再访问，确保是"新用户首次访问"场景
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('.login-card', { timeout: 5000 })
  await page.waitForTimeout(500) // 主题过渡稳定
  await page.screenshot({ path: path.join(OUT, '1-login-fresh.png'), fullPage: false })
  console.log('[OK] 1) 登录页（清 localStorage 后）已截')

  // ========== 2) 登录后 Dashboard ==========
  // 表单默认值就是 admin/123456，直接点登录
  await page.click('.login-card .submit')
  await page.waitForURL('**/dashboard', { timeout: 5000 })
  await page.waitForSelector('.sidebar .logo', { timeout: 5000 })
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(OUT, '2-dashboard-admin.png'), fullPage: false })
  console.log('[OK] 2) Dashboard 截图完成')

  // ========== 3) 侧边栏顶部特写（验证 logo 与第一个菜单项之间无多余空隙） ==========
  const sidebarEl = await page.$('.sidebar-container')
  if (sidebarEl) {
    await sidebarEl.screenshot({ path: path.join(OUT, '3-sidebar-top.png') })
    console.log('[OK] 3) 侧边栏顶部特写已截')
  }

  // ========== 4) 切到系统管理 → 用户管理（验证菜单激活色变橙） ==========
  await page.click('text=系统管理')
  await page.waitForTimeout(300)
  await page.click('text=用户管理')
  await page.waitForURL('**/system/user', { timeout: 5000 })
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(OUT, '4-system-user.png'), fullPage: false })
  console.log('[OK] 4) 用户管理页截图完成')

  // ========== 5) 角色管理（验证树形表格颜色） ==========
  await page.click('text=角色管理')
  await page.waitForURL('**/system/role', { timeout: 5000 })
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(OUT, '5-system-role.png'), fullPage: false })
  console.log('[OK] 5) 角色管理截图完成')

  // ========== 6) 退出登录后再次访问登录页（验证无缓存时仍走默认橙） ==========
  await page.click('.username')
  await page.waitForTimeout(300)
  await page.click('text=退出登录')
  // 确认弹窗
  await page.waitForSelector('.el-message-box__btns .el-button--primary', { timeout: 3000 })
  await page.click('.el-message-box__btns .el-button--primary')
  await page.waitForURL('**/login', { timeout: 5000 })
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(OUT, '6-login-after-logout.png'), fullPage: false })
  console.log('[OK] 6) 退出后再次访问登录页截图完成')

  // 验证：检查按钮确实是品牌橙而非 EP 默认蓝
  const btnColor = await page.evaluate(() => {
    const btn = document.querySelector('.login-card .submit')
    if (!btn) return 'NOT_FOUND'
    return getComputedStyle(btn).backgroundColor
  })
  console.log(`[CHECK] 登录按钮颜色 = ${btnColor}`)
  // 期望 rgb(255, 122, 0) 即 #ff7a00

  // 验证：检查 EP primary CSS 变量
  const primaryVar = await page.evaluate(() => {
    return getComputedStyle(document.documentElement).getPropertyValue('--el-color-primary').trim()
  })
  console.log(`[CHECK] --el-color-primary = ${primaryVar}`)

  // 验证：检查 sidebar logo 与 el-menu 顶部间距
  const sidebarGap = await page.evaluate(() => {
    const logo = document.querySelector('.sidebar .logo')
    const menu = document.querySelector('.sidebar .el-menu')
    if (!logo || !menu) return { error: 'NOT_FOUND' }
    const lr = logo.getBoundingClientRect()
    const mr = menu.getBoundingClientRect()
    return { logoBottom: lr.bottom, menuTop: mr.top, gap: mr.top - lr.bottom }
  })
  console.log(`[CHECK] sidebar logo 底→menu 顶 间距 = ${sidebarGap.gap ?? 'N/A'}px (期望 ≤ 1)`)

  await browser.close()
  console.log('\n全部完成。截图目录：', OUT)
})().catch((e) => {
  console.error('截图脚本出错：', e)
  process.exit(1)
})
