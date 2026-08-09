// 验证定价页中英文案渲染正确（个人商用授权 + 商业版定死¥399 + 扩展版定死¥1499）
// 复用已验证的切语言 / 打开方式（与 verify-help.cjs 一致）
const { chromium } = require('playwright')

const BASE = process.env.BASE || 'http://localhost:4180'
const OUT = 'scripts/ui-shots/pricing'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  const fs = require('fs')
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

  async function openSidebar(text) {
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

  // 登录
  await page.goto(BASE + '/#/login', { waitUntil: 'networkidle' })
  await page.fill('input[type="text"]', 'admin')
  await page.fill('input[type="password"]', '123456')
  await page.click('button:has-text("登 录")')
  await page.waitForURL('**/dashboard', { timeout: 10000 })
  await sleep(600)

  // 中文：定价页
  await openSidebar('授权定价')
  const checks = []
  const assert = (name, cond) => { checks.push({ name, ok: !!cond }); if (!cond) console.log('  ✗ ' + name) }

  const zhText = await page.locator('.help-page').innerText()
  assert('zh 个人商用授权文案', zhText.includes('个人商用授权'))
  assert('zh 限1项目权益', zhText.includes('限1项目'))
  assert('zh 商业版 ¥399', zhText.includes('¥399'))
  assert('zh 扩展版 ¥1499', zhText.includes('¥1499'))
  assert('zh 不再有区间 299-499', !zhText.includes('299 - 499') && !zhText.includes('¥299'))
  assert('zh 不再有 1499+', !zhText.includes('1499+'))
  await page.screenshot({ path: `${OUT}/zh-pricing.png`, fullPage: true })

  // 切英文
  await page.locator('.lang-btn').click()
  await sleep(300)
  await page.getByText('English', { exact: true }).click().catch(async () => {
    await page.getByRole('menuitem', { name: 'English' }).click().catch(() => {})
  })
  await sleep(600)

  // 英文：定价页
  await openSidebar('Pricing')
  const enText = await page.locator('.help-page').innerText()
  assert('en Personal commercial license', enText.includes('Personal commercial license'))
  assert('en ¥399', enText.includes('¥399'))
  assert('en ¥1499', enText.includes('¥1499'))
  assert('en 1 project 权益', enText.includes('1 project'))
  assert('en 不再有 299-499', !enText.includes('299 - 499'))
  assert('en 不再有 1499+', !enText.includes('1499+'))
  await page.screenshot({ path: `${OUT}/en-pricing.png`, fullPage: true })

  await browser.close()
  const pass = checks.filter((c) => c.ok).length
  console.log(`\n定价页验证: ${pass}/${checks.length} 通过`)
  checks.forEach((c) => console.log(`  ${c.ok ? '✓' : '✗'} ${c.name}`))
  if (errors.length) console.log('console errors:', errors.slice(0, 3))
  process.exit(pass === checks.length ? 0 : 1)
})().catch((e) => { console.error(e); process.exit(2) })
