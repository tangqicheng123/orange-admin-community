# 第三方开源组件许可声明（THIRD-PARTY LICENSES）

OrangeAdmin（橙枢）所依赖的第三方开源组件及其协议，全列在下方。

**合规结论**：自动扫描共 **343** 个实际安装包，违规 **0**，未知 **0**，合规 **343**。

完整协议文本可在各组件仓库或其 `node_modules/<pkg>/LICENSE` 文件中查看。各组件版权归其各自作者所有。

> 重新生成：`node scripts/gen-licenses-md.mjs`
> 合规核查：`npm run license:check`（递归扫 node_modules，禁 GPL/AGPL）

## 1. package.json 直接依赖（运行时 / 开发时 / overrides）

下表所列为 `package.json` 中明确声明的依赖；左侧为声明版本范围，右侧为当前 `node_modules` 中的实际解析版本。

| 组件 | 声明范围（package.json） | 实际安装 | 协议 | 类别 |
|---|---|---|---|---|
| `@element-plus/icons-vue` | `^2.3.1` | 2.3.2 | MIT | 运行时 |
| `@types/node` | `^22.10.1` | 22.20.1 | MIT | 开发时 |
| `@typescript-eslint/eslint-plugin` | `^8.18.0` | 8.66.0 | MIT | 开发时 |
| `@typescript-eslint/parser` | `^8.18.0` | 8.66.0 | MIT | 开发时 |
| `@vitejs/plugin-vue` | `^5.2.4` | 5.2.4 | MIT | 开发时 |
| `axios` | `^1.7.9` | 1.19.0 | MIT | 运行时 |
| `cross-env` | `^10.1.0` | 10.1.0 | MIT | 开发时 |
| `echarts` | `^5.6.0` | 5.6.0 | Apache-2.0 | 运行时 |
| `element-plus` | `^2.9.1` | 2.14.3 | MIT | 运行时 |
| `esbuild` | `^0.25.0` | 0.25.12 | MIT | override |
| `eslint` | `^8.57.1` | 8.57.1 | MIT | 开发时 |
| `eslint-plugin-vue` | `^9.32.0` | 9.33.0 | MIT | 开发时 |
| `mockjs` | `^1.1.0` | 1.1.0 | MIT | 开发时 |
| `pinia` | `^2.2.6` | 2.3.1 | MIT | 运行时 |
| `prettier` | `^3.4.2` | 3.9.6 | MIT | 开发时 |
| `stylelint` | `^16.11.0` | 16.26.1 | MIT | 开发时 |
| `stylelint-config-recommended-vue` | `^1.5.0` | 1.6.1 | MIT | 开发时 |
| `stylelint-config-standard` | `^36.0.1` | 36.0.1 | MIT | 开发时 |
| `typescript` | `^5.6.3` | 5.9.3 | Apache-2.0 | 开发时 |
| `unplugin-auto-import` | `^0.18.6` | 0.18.6 | MIT | 开发时 |
| `unplugin-vue-components` | `^0.27.5` | 0.27.5 | MIT | 开发时 |
| `vite` | `^5.4.11` | 5.4.21 | MIT | 开发时 |
| `vite-plugin-mock` | `^3.0.2` | 3.0.2 | MIT | 开发时 |
| `vite-plugin-static-copy` | `^1.0.6` | 1.0.6 | MIT | 开发时 |
| `vue` | `^3.5.13` | 3.5.41 | MIT | 运行时 |
| `vue-i18n` | `^9.14.4` | 9.14.4 | MIT | 运行时 |
| `vue-router` | `^4.4.5` | 4.6.4 | MIT | 运行时 |
| `vue-tsc` | `^2.1.10` | 2.2.12 | MIT | 开发时 |

## 2. 整体协议分布（node_modules 全量，含传递依赖）

以下数据基于 `npm run license:check` 全量扫描，仅供参考。最终数据见最新一次扫描。

| 协议 | 包数 |
|---|---|
| (MIT OR CC0-1.0) | 1 |
| 0BSD | 1 |
| Apache-2.0 | 7 |
| BSD-2-Clause | 8 |
| BSD-3-Clause | 7 |
| BlueOak-1.0.0 | 1 |
| CC0-1.0 | 1 |
| ISC | 21 |
| MIT | 293 |
| MIT-0 | 2 |
| Python-2.0 | 1 |

**合计**：343 个安装包；合规 343，违规 0，未知 0。

## 3. 素材来源（图标 / 字体 / 插画）
- 图标：@element-plus/icons-vue（MIT）、Iconify 开源图标集（各类宽松协议）。
- 字体：系统字体栈 / Inter（OFL，如需可后续引入，本包默认不打包字体文件）。
- 插画：如有，均来自 unDraw 等免费商用授权来源，并标注出处；本模板不打包任何付费素材。

## 4. 声明
OrangeAdmin 的原创代码、设计、文档版权归作者所有，受商业授权（`LICENSE`）约束；
上述第三方组件的版权归各自作者所有，遵循其原始协议。

> 最近更新：2026-08-08（本文件由脚本生成）