// 验证侧边栏顶部那条线和 header 下方那条线视觉粗细一致
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()

  // 清缓存确保用最新代码
  await page.addInitScript(() => {
    try { localStorage.clear() } catch {}
  })

  await page.goto('http://localhost:4180/login', { waitUntil: 'networkidle' })
  await page.fill('input[placeholder="用户名"]', 'admin')
  await page.fill('input[placeholder="密码"]', '123456')
  await page.locator('button:has-text("登 录")').click()
  await page.waitForURL(/\/dashboard/, { timeout: 10000 })
  await page.waitForTimeout(800)

  const outDir = path.join(__dirname, 'ui-shots', 'sidebar-border')
  fs.mkdirSync(outDir, { recursive: true })

  // 1) 整页截图（让用户看到 dashboard 顶部）
  await page.screenshot({ path: path.join(outDir, '1-overview.png'), clip: { x: 0, y: 0, width: 700, height: 280 } })

  // 2) 侧边栏顶部局部特写
  await page.screenshot({ path: path.join(outDir, '2-sidebar-top.png'), clip: { x: 0, y: 56, width: 220, height: 80 } })

  // 3) header / tabs 下方局部特写（对比基准）
  await page.screenshot({ path: path.join(outDir, '3-tabs-bottom.png'), clip: { x: 220, y: 90, width: 480, height: 30 } })

  // 4) 实际像素扫描：在 sidebar logo 下沿位置扫一行，看 RGB 值突变次数
  // 找到 .logo 的 boundingClientRect，扫描 logo bottom + 1px 这一行
  const lineScan = await page.evaluate(() => {
    const logo = document.querySelector('.sidebar .logo')
    const tabs = document.querySelector('.tabs-view')
    if (!logo || !tabs) return { error: 'not found' }
    const lr = logo.getBoundingClientRect()
    const tr = tabs.getBoundingClientRect()
    // canvas 抓取两段 1px 横线
    const grab = (x, y, w, h) => {
      // 我们用 html2canvas 之类的开销太大；改用 getComputedStyle 检查 border / box-shadow
      return null
    }
    const logoStyle = getComputedStyle(logo)
    const tabsStyle = getComputedStyle(tabs)
    return {
      logoRect: { top: lr.top, bottom: lr.bottom, height: lr.height },
      tabsRect: { top: tr.top, bottom: tr.bottom, height: tr.height },
      logoBorderBottom: logoStyle.borderBottomWidth + ' ' + logoStyle.borderBottomStyle + ' ' + logoStyle.borderBottomColor,
      logoBoxShadow: logoStyle.boxShadow,
      logoBorderTop: logoStyle.borderTopWidth + ' ' + logoStyle.borderTopStyle,
      tabsBorderBottom: tabsStyle.borderBottomWidth + ' ' + tabsStyle.borderBottomStyle + ' ' + tabsStyle.borderBottomColor,
      tabsBoxShadow: tabsStyle.boxShadow,
    }
  })

  console.log(JSON.stringify(lineScan, null, 2))

  await browser.close()
})().catch((e) => { console.error(e); process.exit(1) })