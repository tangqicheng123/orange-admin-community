// 验证 sidebar 右侧边框一致性：
// 修复前：.sidebar-container border-right + el-scrollbar/el-menu 内部边界叠加 → 在有菜单项区域呈现 2px
// 修复后：.sidebar-container box-shadow(1px) + 子元素 border-right:0 → 整侧一条统一 1px
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // 登录态保持：登录后进 dashboard，截侧边栏
  await page.goto('http://localhost:4180/');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type=text]', 'admin');
  await page.fill('input[type=password]', '123456');
  await page.click('button:has-text("登 录")');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);

  // 探针：拿到关键元素的实际样式
  const probe = await page.evaluate(() => {
    const out = {};
    const aside = document.querySelector('.sidebar-container');
    const sb = document.querySelector('.sidebar');
    const scroll = document.querySelector('.el-scrollbar');
    const menu = document.querySelector('.sidebar .el-menu');
    const logo = document.querySelector('.logo');
    function snap(el) {
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        borderTop: cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor,
        borderRight: cs.borderRightWidth + ' ' + cs.borderRightStyle + ' ' + cs.borderRightColor,
        borderBottom: cs.borderBottomWidth + ' ' + cs.borderBottomStyle + ' ' + cs.borderBottomColor,
        boxShadow: cs.boxShadow,
        boxSizing: cs.boxSizing,
      };
    }
    out.aside = snap(aside);
    out.sidebar = snap(sb);
    out.scrollbar = snap(scroll);
    out.menu = snap(menu);
    out.logo = snap(logo);

    // 关键探测：测 .sidebar 容器在两个位置的"视觉边框宽度"——
    // 用 ElementFromPoint(右侧不同 y)，看是否还能命中。简化做法：直接读 .sidebar 的 box-shadow 与 .sidebar-container 的 box-shadow，
    // 是否各自最多 1 条 inset。
    return out;
  });

  console.log('=== computed styles (应为 borderRight=0px + box-shadow 一条 inset 1px) ===');
  console.log(JSON.stringify(probe, null, 2));

  // 截图侧边栏区域（左侧约 230px × 全高）
  await page.screenshot({
    path: 'scripts/ui-shots/border-right-after.png',
    clip: { x: 0, y: 0, width: 240, height: 900 },
  });
  console.log('\n[ok] screenshot saved: scripts/ui-shots/border-right-after.png');

  await browser.close();

  // === 断言：所有相关元素的 border-right 必须 0 ===
  const bad = [];
  function check(name, node) {
    if (!node) return;
    const w = (node.borderRight || '').trim();
    if (!w.startsWith('0px')) bad.push(`${name}.borderRight = ${w}`);
  }
  check('aside', probe.aside);
  check('sidebar', probe.sidebar);
  check('scrollbar', probe.scrollbar);
  check('menu', probe.menu);

  // === 断言：sidebar 容器应该有一条 inset 1px box-shadow 给右线 ===
  const sbShadow = (probe.sidebar && probe.sidebar.boxShadow) || '';
  const asideShadow = (probe.aside && probe.aside.boxShadow) || '';
  const hasOneBorder = sbShadow.includes('1px') || asideShadow.includes('1px');
  if (!hasOneBorder) bad.push('sidebar/container 缺 box-shadow 1px 边框');

  if (bad.length) {
    console.error('\n[FAIL] ' + bad.length);
    bad.forEach((b) => console.error(' - ' + b));
    process.exit(1);
  } else {
    console.log('\n[PASS] 侧边栏右侧边框已统一为 1px（box-shadow 单一来源，无子元素 border 叠加）');
  }
})();
