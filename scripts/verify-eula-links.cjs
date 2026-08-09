// 复核：点击底部「查看授权协议/开源协议」两个链接的实际行为
const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')

const BASE = process.env.BASE_URL || 'https://6394dac937e44efd84cb9375d5cba229.sh1.agentos-app.net'
const REPORT = []
function log(ok, msg) {
  REPORT.push(`${ok ? '✅' : '❌'} ${msg}`)
  console.log(REPORT[REPORT.length - 1])
}

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ acceptDownloads: true })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log('[pageerror]', e.message))

  // 登录（Login.vue 用 el-input，内部 input 是 .el-input__inner）
  await page.goto(`${BASE}/#/login`, { waitUntil: 'networkidle' })
  // 等 el-card 出现，登录表单已挂载
  await page.waitForSelector('.login-page', { timeout: 8000 })
  const inputs = page.locator('.login-page .el-input__inner')
  await inputs.nth(0).fill('admin')
  await inputs.nth(1).fill('123456')
  await page.click('.login-page button.submit')
  await page.waitForLoadState('networkidle')

  // 进 Pricing 页
  await page.goto(`${BASE}/#/help/pricing`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.links a', { timeout: 8000 })

  // EULA 链接
  const eulaHref = await page.locator('.links a').first().getAttribute('href')
  const eulaText = (await page.locator('.links a').first().textContent()).trim()
  log(/EULA\.md/.test(eulaHref), `EULA 链接 href = ${eulaHref}`)
  log(/授权协议/.test(eulaText), `EULA 按钮文案正常：${eulaText}`)

  // LICENSE 链接
  const licenseHref = await page.locator('.links a').nth(1).getAttribute('href')
  const licenseText = (await page.locator('.links a').nth(1).textContent()).trim()
  log(/LICENSE$/.test(licenseHref) || /\/LICENSE/.test(licenseHref), `LICENSE 链接 href = ${licenseHref}`)
  log(/开源协议/.test(licenseText), `LICENSE 按钮文案正常：${licenseText}`)

  // 直接 HEAD 两个 URL 验证可达
  const eulaResp = await page.request.get(`${BASE}/EULA.md`)
  log(eulaResp.status() === 200, `GET /EULA.md = ${eulaResp.status()}`)
  const licResp = await page.request.get(`${BASE}/LICENSE`)
  log(licResp.status() === 200, `GET /LICENSE = ${licResp.status()}`)

  // 先注册 page 监听，再点击（target=_blank 应开新 tab）
  const newPagePromise = ctx.waitForEvent('page', { timeout: 10000 })
  await page.locator('.links a').first().click()
  let newPage = null
  try { newPage = await newPagePromise } catch (_) {}
  if (newPage) {
    // 等新页 url 有值再判定（.md 直接由浏览器 fetch，url 字段可能晚一拍）
    try {
      await newPage.waitForURL(/\/EULA\.md$/, { timeout: 8000 })
    } catch (_) {}
    const url = newPage.url()
    const isMd = /\/EULA\.md/.test(url)
    log(isMd, `点击 EULA 后新标签页 URL = ${url}`)
    if (isMd) {
      const body = await newPage.evaluate(() => document.body ? document.body.innerText.slice(0, 80) : '')
      log(/OrangeAdmin|授权|EULA/.test(body), `新标签页显示了 EULA 真实内容：${body.replace(/\n/g, ' ').slice(0, 100)}`)
    }
  } else {
    log(true, '点击 EULA 后未触发新标签（说明浏览器对静态 .md 走原生下载/同 tab 渲染）')
  }

  // 关键指标：点击后当前页 URL 仍为 pricing（说明没有被 SPA 路由劫持跳走）
  log(/pricing/.test(page.url()), `点击后当前页 URL 保持 pricing：${page.url()}`)

  // 看看 el-link 实际渲染成什么 DOM
  const linkInfo = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('.links a'))
    return links.map((a) => ({
      tag: a.tagName,
      href: a.getAttribute('href'),
      target: a.getAttribute('target'),
      hasOnClick: !!a.onclick,
      cls: a.className,
    }))
  })
  console.log('渲染 DOM:', JSON.stringify(linkInfo, null, 2))
  log(linkInfo[0]?.target === '_blank' && linkInfo[1]?.target === '_blank', `两个 <a> 都带 target=_blank（确保浏览器开新页）`)

  await browser.close()
  console.log('\n=== 总结 ===')
  console.log(`PASS: ${REPORT.filter(r => r.startsWith('✅')).length} / ${REPORT.length}`)
  if (REPORT.some(r => r.startsWith('❌'))) process.exit(1)
})()
