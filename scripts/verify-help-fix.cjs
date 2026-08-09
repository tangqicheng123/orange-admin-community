// 验证两个修复：
//  1. Docs 页：6 张功能卡片高度齐平（max - min 误差不超过 24px）
//  2. Pricing 页：点击「购买与授权」→ 弹出 Dialog，显示已选档位 tag、联系方式
const { chromium } = require('playwright')
const path = require('path')

const BASE = process.env.BASE_URL || 'http://localhost:4180'

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()

  let failed = 0
  const log = (ok, msg) => {
    console.log((ok ? '✅' : '❌') + '  ' + msg)
    if (!ok) failed++
  }

  try {
    // ---------- 登录 ----------
    await page.goto(BASE + '/#/login', { waitUntil: 'networkidle' })
    await page.fill('input[type="text"]', 'admin')
    await page.fill('input[type="password"]', '123456')
    await page.locator('button.submit, button:has-text("登录"), button:has-text("Login")').first().click()
    await page.waitForURL(/dashboard/, { timeout: 8000 }).catch(() => {})

    // =================== Docs 页验证 ===================
    await page.goto(BASE + '/#/help/doc', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)

    // 取「快速开始」面板下方的 6 张 .chapter 功能卡片
    const info = await page.$$eval('.chapter', (els) =>
      els.map((e) => ({
        text: (e.querySelector('.chapter-title')?.textContent || '').trim(),
        h: Math.round(e.getBoundingClientRect().height),
        top: Math.round(e.getBoundingClientRect().top),
      })),
    )
    const titles = info.map((x) => x.text)
    const expected = ['目录结构', '主题与暗黑模式', '国际化', '权限控制', 'Mock 数据', '部署上线']
    const allPresent = expected.every((t) => titles.some((x) => x.includes(t.replace(/（.+）/, '').replace(/[()（）]/g, '').slice(0, 4))))
    log(allPresent, `Docs 功能卡片 6 张存在（实际 ${info.length} 张：${titles.join(' / ')}）`)

    // 高度齐平校验（同样的 row 内）
    const rows = {}
    info.forEach((c) => {
      const r = Math.floor(c.top / 50) * 50
      ;(rows[r] ||= []).push(c.h)
    })
    let maxDelta = 0
    for (const r of Object.keys(rows)) {
      const hs = rows[r]
      const delta = Math.max(...hs) - Math.min(...hs)
      if (delta > maxDelta) maxDelta = delta
    }
    log(maxDelta <= 6, `Docs 同 row 卡片高度齐平（最大差 ${maxDelta}px ≤ 6px 阈值）`)

    // 顶部快速开始面板存在
    const hasQuick = await page.$('.quickstart')
    log(!!hasQuick, 'Docs 顶部「快速开始」面板存在（全宽 terminal panel）')

    // 截图 1：Docs 修复后
    const shotDir = path.join(__dirname, 'ui-shots')
    await page.screenshot({ path: path.join(shotDir, 'docs-after-fix.png'), fullPage: false })

    // =================== Pricing 页验证 ===================
    await page.goto(BASE + '/#/help/pricing', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)

    // 取 3 个 plan 按钮
    const planCount = await page.locator('.plan-btn').count()
    log(planCount === 3, `Pricing 卡片按钮 3 个（实际 ${planCount}）`)

    // 点击「个人版」按钮
    await page.locator('.plan-card').nth(0).locator('.plan-btn').click()
    await page.waitForTimeout(400)

    // Dialog 应弹出
    const dialogVisible = await page.locator('.el-dialog').count()
    log(dialogVisible >= 1, `点击个人版按钮后 Dialog 出现（el-dialog 数=${dialogVisible}）`)

    // 已选档位 tag
    const tierLabel = await page.locator('.tier-row .el-tag').textContent().catch(() => '')
    log(/个人版/.test(tierLabel) && /19\.9/.test(tierLabel), `Dialog 显示已选档位 = "${tierLabel.trim()}"`)

    // 联系方式列表：已替换真实值（2026-08-09）
    const email = await page.locator('.contact-list li').nth(0).locator('.contact-val').textContent()
    const wechat = await page.locator('.contact-list li').nth(1).locator('.contact-val').textContent()
    const github = await page.locator('.contact-list li').nth(2).locator('.contact-val').textContent()
    log(email.trim() === '1635409114@qq.com', `邮箱显示（真实）：${email.trim()}`)
    log(wechat.trim() === 'tqc18537919248', `微信显示（真实）：${wechat.trim()}`)
    log(github.trim().includes('暂未开源'), `GitHub 行显示（未开源占位）：${github.trim()}`)

    // 截图 2：Dialog 打开状态（个人版）
    await page.screenshot({ path: path.join(shotDir, 'pricing-dialog-personal.png'), fullPage: false })

    // 关闭 Dialog，点击商业版验证档位切换
    await page.locator('.el-dialog .el-dialog__headerbtn, .el-dialog .el-button').first().click().catch(() => {})
    await page.waitForTimeout(300)
    await page.locator('.plan-card').nth(1).locator('.plan-btn').click()
    await page.waitForTimeout(400)
    const tierLabel2 = await page.locator('.tier-row .el-tag').textContent().catch(() => '')
    log(/商业版/.test(tierLabel2) && /399/.test(tierLabel2), `点击商业版按钮后切换档位 tag = "${tierLabel2.trim()}"`)
    await page.screenshot({ path: path.join(shotDir, 'pricing-dialog-business.png'), fullPage: false })

    console.log('\n' + (failed === 0 ? '🎉 全部通过' : `⚠️ ${failed} 项失败`))
  } catch (e) {
    console.error('❌ 异常：', e.message)
    failed++
  } finally {
    await browser.close()
    process.exit(failed > 0 ? 1 : 0)
  }
})()
