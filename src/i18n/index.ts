import { createI18n } from 'vue-i18n'
import zhCN from './locales/zh-CN'

// 社区版（orange-admin-community）仅内置中文。
// 多语言 i18n（英文等）为 Pro 完整版解锁项，详见仓库 README。
export const i18n = createI18n({
  legacy: false, // 组合式 API；模板里也可用 $t
  globalInjection: true,
  locale: 'zh-CN',
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
  },
})

export type LocaleType = 'zh-CN'
export const SUPPORTED_LOCALES = ['zh-CN'] as const

// 社区版不支持切换语言，保持中文。
export async function setLocale(_locale: LocaleType): Promise<void> {
  i18n.global.locale.value = 'zh-CN'
}
