// 全局 UI 状态：侧边栏、暗黑模式、主题色、多标签、语言
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { setLocale as applyI18nLocale } from '@/i18n'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

// 业务 locale 与 EP 内置 locale 对象的映射（社区版仅中文，多语言为 Pro 解锁项）
const EP_LOCALE_MAP: Record<'zh-CN', import('element-plus/es/locale').Language> = {
  'zh-CN': zhCn as import('element-plus/es/locale').Language,
}

export type LocaleType = 'zh-CN'
export const SUPPORTED_LOCALES = ['zh-CN'] as const

// 颜色混合（生成 Element Plus 主色系的 light/dark 变体）
function mix(color1: string, color2: string, weight: number): string {
  const toRgb = (c: string) => [
    parseInt(c.slice(1, 3), 16),
    parseInt(c.slice(3, 5), 16),
    parseInt(c.slice(5, 7), 16),
  ]
  const [r1, g1, b1] = toRgb(color1)
  const [r2, g2, b2] = toRgb(color2)
  const r = Math.round(r1 * weight + r2 * (1 - weight))
  const g = Math.round(g1 * weight + g2 * (1 - weight))
  const b = Math.round(b1 * weight + b2 * (1 - weight))
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`
}

export interface VisitedView {
  path: string
  title: string
  affix?: boolean
}

// sessionStorage 持久化：同一浏览器 tab 内刷新不丢；不同 tab 独立（避免多 tab 串标签）
const VISITED_KEY = 'orange-admin-visited'

function loadVisited(): VisitedView[] {
  try {
    const raw = sessionStorage.getItem(VISITED_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as VisitedView[]) : []
  } catch {
    return []
  }
}

function saveVisited(views: VisitedView[]) {
  try {
    sessionStorage.setItem(VISITED_KEY, JSON.stringify(views))
  } catch {
    /* ignore */
  }
}

export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false)
  const isDark = ref(localStorage.getItem('orange-admin-dark') === '1')
  const themeColor = ref(localStorage.getItem('orange-admin-color') || '#ff7a00')
  // 社区版锁定桌面布局：移动端抽屉/响应式适配为 Pro 解锁项，device 恒为 desktop
  const device = ref<'desktop' | 'mobile'>('desktop')
  // 移动端抽屉侧边栏开关
  const drawerVisible = ref(false)
  const isMobile = ref(false)
  const visitedViews = ref<VisitedView[]>(loadVisited())
  // 当前路由 path 的镜像，便于在 store 内部动作（如关闭其他）时定位
  const currentPath = ref('')
  // 语言（社区版仅中文，多语言为 Pro 解锁项）
  const locale = ref<LocaleType>('zh-CN')
  const elLocale = computed(() => EP_LOCALE_MAP[locale.value])

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function toggleDark() {
    isDark.value = !isDark.value
    document.documentElement.classList.toggle('dark', isDark.value)
    localStorage.setItem('orange-admin-dark', isDark.value ? '1' : '0')
  }

  function setThemeColor(color: string) {
    themeColor.value = color
    const el = document.documentElement
    el.style.setProperty('--el-color-primary', color)
    for (let i = 1; i <= 9; i++) {
      el.style.setProperty(`--el-color-primary-light-${i}`, mix('#ffffff', color, i * 0.1))
    }
    el.style.setProperty('--el-color-primary-dark-2', mix('#000000', color, 0.2))
    localStorage.setItem('orange-admin-color', color)
  }

  // 切换语言：业务 $t 走 i18n；EP 内置组件文案走 ElConfigProvider :locale（自动同步）。
  async function setLocale(next: LocaleType) {
    if (next === locale.value) return
    locale.value = next
    await applyI18nLocale(next)
  }

  function addVisitedView(view: VisitedView) {
    const exist = visitedViews.value.find((v) => v.path === view.path)
    if (exist) {
      // 已存在时合并 affix 标记，避免重复添加
      if (view.affix) exist.affix = true
      saveVisited(visitedViews.value)
      return
    }
    visitedViews.value.push(view)
    saveVisited(visitedViews.value)
  }

  function removeVisitedView(path: string) {
    visitedViews.value = visitedViews.value.filter((v) => v.path !== path)
    saveVisited(visitedViews.value)
  }

  // 关闭除 keep 之外的所有标签（保留 affix 固定标签）
  function closeOthers(keepPath: string) {
    visitedViews.value = visitedViews.value.filter(
      (v) => v.path === keepPath || v.affix === true,
    )
    saveVisited(visitedViews.value)
  }

  // 关闭全部（仅保留 affix 固定标签）
  function closeAll() {
    visitedViews.value = visitedViews.value.filter((v) => v.affix === true)
    saveVisited(visitedViews.value)
  }

  // 批量替换标签顺序（拖拽排序后调用），并落盘
  function setVisitedViews(views: VisitedView[]) {
    visitedViews.value = views
    saveVisited(visitedViews.value)
  }

  function initTheme() {
    if (isDark.value) document.documentElement.classList.add('dark')
    setThemeColor(themeColor.value)
  }

  // 社区版锁定桌面布局：移动端响应式为 Pro 解锁项，initDevice 不再监听视口
  function initDevice() {
    device.value = 'desktop'
    isMobile.value = false
  }
  function destroyDevice() {
    /* no-op：社区版无移动端监听 */
  }

  return {
    sidebarCollapsed,
    isDark,
    themeColor,
    device,
    visitedViews,
    currentPath,
    locale,
    elLocale,
    toggleSidebar,
    toggleDark,
    setThemeColor,
    setLocale,
    addVisitedView,
    removeVisitedView,
    closeOthers,
    closeAll,
    setVisitedViews,
    initTheme,
    drawerVisible,
    isMobile,
    initDevice,
    destroyDevice,
  }
})
