# CHANGELOG（社区版）

社区版与 Pro 同步至功能基线 v1.0.0，差异仅在**锁定项**（不含移动端响应式与多语言，且禁止商业用途）。

## [1.1.2] — 2026-08-10（ProTable v-for 列渲染回归修复 · 社区版同步修复）

用量告警（以及所有用 ProTable 的 AI 列表页）出现「只剩 2 列（启用 + 操作）」的渲染回归的修复。

### 🐛 修复
- **ProTable 动态列渲染回归**：原 `<el-table-column v-for>` 内嵌 `<template v-if="col.slot" #default="{ row }"><slot :name="col.slot" :row="row"/></template>` 时，Vue 3 在 v-for + v-slot 组合下会把 `col` 闭包「串味」——只有最后一个 v-for 迭代的具名插槽能解析到父级 `#metric`/`#channel`/...，其余列 cell 渲染为空 → Element Plus `el-table` 收不到 cell → 整列不注册到 store，header/body 全无（实测 `hidden-columns` 7 个 div 中前 5 个为空）。
  - **修复**：把每列抽成 `src/components/ProTableColumn.ts` 子组件，`col` 作为组件 prop 下传（每个实例一份稳定值，不再是 v-for 闭包变量），用 render 函数 `h(ElTableColumn, props, { default })` 渲染：default 插槽里若 `col.slot` 命中父级同名插槽就调用（通过 `:slots="$slots"` 传下去），否则回退 `row[col.prop]`（保留 `formatter` 支持）。`index`/`action` 列保持原状。
  - **类型**：ProTable 用 `defineSlots<{ [name: string]: (props: { row: T }) => any }>()` 开放具名插槽，避免 `:slots="$slots"` 收窄后父级 `#metric` 等报错。

### 🔄 社区版本次同步
- **本修复仅影响 Pro 版**：`ProTable` 为 Pro 版内部组件（`src/components/ProTable.vue`），社区版不包含 `src/components/` 目录，AI 列表页若呈现走原生 `el-table` 或 `src/views/components/Table.vue`，无此 bug，**无需源码同步**。
- 仅在 Pro 版 `dist` 与 GitHub Pages 演示站（`orange-admin-demo`）生效；社区版功能基线不受影响。

### 验证
- TypeScript 0 错；`vite build` 通过；dev + preview 双端口 Playwright 验证：
  - Alerts 7 列（`#` / 名称 / 指标 / 阈值 / 通知方式 / 启用 / 操作）
  - ApiKeys 9 列（含 `formatter`：`quota: 1,000,000`）
  - Knowledge 8 列 · Logs 11 列 · Models 8 列
  - 0 console error。

## [1.1.1] — 2026-08-10（Pro 视觉打磨补丁 · 社区版同步展示层）

登录页 5 大卖点 tag 替换 + 侧栏 logo 区视觉打磨。

### ✨ 视觉打磨
- **登录页 5 大卖点 tag**：将原「免后端依赖 / 半小时交付 / 合规可商用 / 暗黑+移动端」4 个 tag，替换为新 5 大卖点——
  - **纯 Mock 开箱即用** · **所见即所得** · **付费可商用** · **完整开发文档** · **售后一对一服务**
  - 突出「零门槛落地、可商用合规、有兜底服务」三个购买信号，对个人/兼职接单用户更精准。
  - 同时移除原副标题「接单交付利器 · 套一套就能交付专业后台」，让卡片更克制。
- **侧栏 logo 区重塑**：「OrangeAdmin 橙枢」前方新增 **32px 橙色方块 logo mark**（与登录页 logo 视觉同源，圆角 8px，主题色填充），让品牌符号在 Dashboard 顶部一眼可见；移除原副标题「接单交付利器」。
- **i18n 调整**（`src/i18n/locales/zh-CN.ts` + `en-US.ts`）：
  - 新增 5 个 key：`login.tagMock / tagWYSIWYG / tagCommercial / tagDocs / tagSupport`。
  - 删除：`login.subtitle`、`app.slogan`（均不再展示）。

### 🔄 社区版本次同步
- **登录页 5 tag + 侧栏 logo mark** 为纯展示层改动，社区版 `src/views/login/index.vue` 与 `src/views/layout/components/Sidebar.vue` 同步刷新（**不影响锁定边界**）。
- 注：社区版仍不含 i18n 完整功能；新增的 5 个 i18n key 在社区版单语言环境下无实际显示效果，仅作结构对齐。
- 注：移动端响应式适配仍为 **Pro 解锁项**，社区版不含；本次仅刷新桌面端视觉。

### 验证
- TypeScript 类型检查 0 错；`vite build` 通过；Playwright 自动化截 4 张关键画面（亮/暗 × 登录页 / Dashboard 顶部）共 **0 console error**。
- 已推送至 **私有仓** `e6d5acc` 与 **公开 Demo** `bfbb68f`。

---

## [1.1.0] — 2026-08-10（Pro 发布 · 社区版同步展示层修复）

OrangeAdmin Pro 本轮大版本更新，聚焦 **AI 智能模块** 与 **工程打磨**；社区版同步其中不影响锁定边界的修复。

### ✨ Pro 新增（解锁项，社区版不含）
- **AI 智能模块（7 页，纯前端 Mock）**：API Key 管理、模型管理、对话日志、用量统计、知识库、告警中心、成本分析。开箱即用，零后端依赖。
- **移动端响应式适配**：ProTable 分页器窄屏精简 + 搜索框满宽；登录卡改流体宽度 `min(380px,92vw)`；全局 dialog / message-box 窄屏 `92vw`；侧栏转抽屉汉堡。

### 🛠 工程打磨（Pro 构建优化）
- **体积优化**：移除全量 Element Plus CSS 改按需引入，CSS gzip **≈70KB → ≈38KB（约 -45%）**；`manualChunks` 仅拆 echarts + vue-vendor（不拆 EP 以免破坏 tree-shaking）；生成 `.gz / .br` 预压缩。
- **暗黑模式**：Docs 帮助中心代码块深色可读性修复（原 `--el-fill-color-darker` 实为浅灰 `#e8eaed` 导致暗黑下看不见，改为稳定深色）。

### 🔄 社区版本次同步
- 暗黑模式 Docs 代码块修复（展示层修复，**不影响锁定边界**）。
- 注：AI 模块与移动端适配为 **Pro 解锁项**，社区版仍不含；社区版**禁止任何商业用途**。

## [1.0.2] — 2026-08-09

修复表单演示页「满意度」与「入职日期」间距问题（与 Pro 同步展示层修复）。

### 修复
- 表单演示（`src/views/components/Form.vue`）：「满意度」字段从 `xs="24"` 改为 `xs="24" :sm="12"`，与「入职日期」并排，靠 `el-row :gutter="20"` 提供 20px 间距。
- 注：社区版仍不含移动端响应式与多语言完整功能，本次仅为桌面 sm 视口下排版修复。

## [1.0.1] — 2026-08-09

修复帮助中心定价页两处展示问题（与 Pro 同步样式修复，功能锁定项不变）。

### 修复
- 定价页「商业版」卡片：描述文字 `word-break` + 左对齐，解决窄屏/长文案横向溢出与怪异居中；推荐徽章移至 `el-card` 外部，避免被卡片 `overflow:hidden` 裁切。
- 布局标签栏（TabsView）：≤992px 移动端紧凑适配——文字包 `.tab-title` 支持省略号、隐藏关闭图标、修正 flex 高度被压扁导致文字上下裁切。
- 注：社区版仍不含移动端响应式与多语言完整功能，上述仅为标签栏显示层修复。

## [1.0.0] — 2026-08-09

- RBAC 权限 + 动态菜单、仪表盘 + ECharts、表格/表单范式、暗黑模式、交付样板页（电商/CRM）、系统管理（用户/角色/菜单/部门/字典）、个人中心、帮助中心。
- 明确社区版仅限学习/评估，**禁止商业用途**；商业交付需购 Pro（含商业授权 + 去版权）。
- 重构 README 话术：Pro 解锁项以「商业授权 / 去版权」为首。
