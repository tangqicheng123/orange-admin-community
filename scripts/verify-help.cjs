// 验证帮助中心（文档 / 定价）页中英渲染 + 侧边栏接入
const { chromium } = require('playwright')
const fs = require('fs')

const BASE = 'http://localhost:4180'
const OUT = 'scripts/ui-shots/help'
fs.mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

  await page.addInitScript(() => {
    if (!sessionStorage.getItem('__help_test_cleared__')) {
      localStorage.clear()
      sessionStorage.setItem('__help_test_cleared__', '1')
    }
  })

  // 登录
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
  await page.fill('input[type="text"]', 'admin')
  await page.fill('input[type="password"]', '123456')
  await page.getByRole('button', { name: /登\s*录|Sign in/ }).click()
  await page.waitForURL('**/dashboard', { timeout: 10000 })
  await sleep(600)

  async function clickSidebar(text) {
    const item = page.locator(`.sidebar .el-menu-item:has-text("${text}")`).first()
    try {
      await item.click({ timeout: 2000 })
    } catch {
      const parent = item.locator('xpath=ancestor::li[contains(@class,"el-sub-menu")][1]')
      await parent.locator('.el-sub-menu__title').click({ timeout: 2000 }).catch(() => {})
      await sleep(400)
      await item.click({ timeout: 2000 })
    }
    await sleep(600)
  }

  // 中文
  await clickSidebar('开发文档')
  await page.screenshot({ path: `${OUT}/1-zh-doc.png`, fullPage: false })
  const zhDoc = await page.locator('.help-page').innerText()
  await clickSidebar('授权定价')
  await page.screenshot({ path: `${OUT}/2-zh-pricing.png`, fullPage: false })
  const zhPricing = await page.locator('.help-page').innerText()

  // 切英文
  await page.locator('.lang-btn').click()
  await sleep(300)
  await page.getByText('English', { exact: true }).click().catch(async () => {
    await page.getByRole('menuitem', { name: 'English' }).click().catch(() => {})
  })
  await sleep(600)

  await clickSidebar('Docs')
  await page.screenshot({ path: `${OUT}/3-en-doc.png`, fullPage: false })
  const enDoc = await page.locator('.help-page').innerText()
  await clickSidebar('Pricing')
  await page.screenshot({ path: `${OUT}/4-en-pricing.png`, fullPage: false })
  const enPricing = await page.locator('.help-page').innerText()

  const checks = [
    ['zh doc 含 开发文档', zhDoc.includes('开发文档')],
    ['zh doc 含 快速开始', zhDoc.includes('快速开始')],
    ['zh pricing 含 授权与定价', zhPricing.includes('授权与定价')],
    ['zh pricing 含 个人版', zhPricing.includes('个人版')],
    ['en doc 含 Documentation', enDoc.includes('Documentation')],
    ['en doc 含 Quick start', enDoc.includes('Quick start')],
    ['en pricing 含 License & Pricing', enPricing.includes('License & Pricing')],
    ['en pricing 含 Personal', enPricing.includes('Personal')],
    ['zh pricing 无英文残留 Documentation', !zhPricing.includes('Documentation')],
    ['en pricing 无中文残留 授权与定价', !enPricing.includes('授权与定价')],
  ]
  let ok = true
  for (const [name, pass] of checks) {
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`)
    if (!pass) ok = false
  }
  if (errors.length) {
    console.log('--- page errors ---')
    errors.forEach((e) => console.log(e))
  }
  await browser.close()
  console.log(ok && errors.length === 0 ? '\nALL GOOD' : '\nHAS ISSUES')
  process.exit(ok && errors.length === 0 ? 0 : 1)
})().catch((e) => { console.error(e); process.exit(1) })
