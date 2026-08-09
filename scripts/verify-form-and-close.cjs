// 验证两个修复（2026-08-09 收尾）：
//  1. 组件演示/表单：评分(rate) 和 满意度(slider) 改成全宽行，不再各占一半与 备注 挤
//  2. 定价 Dialog 底部：关闭按钮显示「关闭」，不再显示字面 key「common.close」
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
    // 登录
    await page.goto(BASE + '/#/login', { waitUntil: 'networkidle' })
    await page.fill('input[type="text"]', 'admin')
    await page.fill('input[type="password"]', '123456')
    await page.locator('button.submit, button:has-text("登录"), button:has-text("Login")').first().click()
    await page.waitForURL(/dashboard/, { timeout: 8000 }).catch(() => {})

    // =================== 修复 1：表单布局 ===================
    await page.goto(BASE + '/#/components/form', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)

    // 取评分(score)、满意度(level)、备注(remark) 三个 form-item 的容器宽度
    const formInfo = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('.el-form-item .el-form-item__label'))
      const map = {}
      for (const lb of labels) {
        const t = (lb.textContent || '').trim()
        if (t.includes('评分') || t.includes('满意度') || t.includes('备注')) {
          const item = lb.closest('.el-form-item')
          const col = lb.closest('.el-col')
          const rect = col ? col.getBoundingClientRect() : item.getBoundingClientRect()
          map[t] = Math.round(rect.width)
        }
      }
      return map
    })
    const scoreW = Object.entries(formInfo).find(([k]) => k.includes('评分'))?.[1]
    const levelW = Object.entries(formInfo).find(([k]) => k.includes('满意度'))?.[1]
    const remarkW = Object.entries(formInfo).find(([k]) => k.includes('备注'))?.[1]
    log((scoreW || 0) > 600, `评分 行改为全宽（实际宽度 ${scoreW || '?'}px > 600px 阈值）`)
    log((levelW || 0) > 600, `满意度 行改为全宽（实际宽度 ${levelW || '?'}px > 600px 阈值）`)
    log((remarkW || 0) > 600, `备注 行保持全宽（实际宽度 ${remarkW || '?'}px）`)

    // 评分与备注不应该同行（行 top 不同）
    const tops = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('.el-form-item .el-form-item__label'))
      const out = {}
      for (const lb of labels) {
        const t = (lb.textContent || '').trim()
        if (t.includes('评分') || t.includes('备注')) {
          out[t] = Math.round(lb.closest('.el-form-item').getBoundingClientRect().top)
        }
      }
      return out
    })
    const scoreTop = Object.entries(tops).find(([k]) => k.includes('评分'))?.[1]
    const remarkTop = Object.entries(tops).find(([k]) => k.includes('备注'))?.[1]
    log(scoreTop !== remarkTop && scoreTop !== undefined, `评分 与 备注 不再同行（评分 top=${scoreTop}, 备注 top=${remarkTop}）`)

    const shotDir = path.join(__dirname, 'ui-shots')
    await page.screenshot({ path: path.join(shotDir, 'form-after-fix.png'), fullPage: false })

    // =================== 修复 2：定价 Dialog 关闭按钮文案 ===================
    await page.goto(BASE + '/#/help/pricing', { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)
    await page.locator('.plan-card').nth(1).locator('.plan-btn').click()
    await page.waitForTimeout(400)

    // 抓 Dialog footer 第一个按钮文本
    const closeBtnText = await page.locator('.el-dialog__footer .el-button').first().textContent()
    log(closeBtnText.trim() === '关闭', `Dialog 关闭按钮文案 = "${closeBtnText.trim()}"（不再是 common.close 字面 key）`)

    // 再抓第二个按钮（复制邮箱）确认正常
    const copyBtnText = await page.locator('.el-dialog__footer .el-button').nth(1).textContent()
    log(copyBtnText.trim() === '复制邮箱', `Dialog 复制邮箱按钮文案 = "${copyBtnText.trim()}"`)

    await page.screenshot({ path: path.join(shotDir, 'pricing-dialog-after-fix.png'), fullPage: false })

    console.log('\n' + (failed === 0 ? '🎉 全部通过' : `⚠️ ${failed} 项失败`))
  } catch (e) {
    console.error('❌ 异常：', e.message)
    failed++
  } finally {
    await browser.close()
    process.exit(failed > 0 ? 1 : 0)
  }
})()
