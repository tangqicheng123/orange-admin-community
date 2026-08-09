import { createApp } from 'vue'
import { createPinia } from 'pinia'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import App from './App.vue'
import router from './router'
import permissionDirective from '@/directives/permission'
import { i18n } from '@/i18n'
import './assets/styles/index.css'

const app = createApp(App)

// 全局注册 Element Plus 图标（方便菜单/页面按名称引用；如追求极致体积可改为按需）
for (const [name, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(name, component)
}

// 启动期应用本地偏好（暗黑模式 / 主题色）。
// 注意：无论 localStorage 里有没有保存过用户配色，都必须先把 EP 主色变量设成
// 品牌橙（默认 #ff7a00），否则新用户/清缓存场景下 EP 会回退到默认蓝色——
// 表现为登录按钮、O logo、侧边栏激活项等全是与品牌色不一致的蓝。
const storedDark = localStorage.getItem('orange-admin-dark') === '1'
if (storedDark) document.documentElement.classList.add('dark')

const DEFAULT_THEME_COLOR = '#ff7a00'
const storedColor = localStorage.getItem('orange-admin-color') || DEFAULT_THEME_COLOR
const el = document.documentElement
el.style.setProperty('--el-color-primary', storedColor)
const mix = (c1: string, c2: string, w: number) => {
  const h = (c: string) => [
    parseInt(c.slice(1, 3), 16),
    parseInt(c.slice(3, 5), 16),
    parseInt(c.slice(5, 7), 16),
  ]
  const [r1, g1, b1] = h(c1)
  const [r2, g2, b2] = h(c2)
  const r = Math.round(r1 * w + r2 * (1 - w))
  const g = Math.round(g1 * w + g2 * (1 - w))
  const b = Math.round(b1 * w + b2 * (1 - w))
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`
}
for (let i = 1; i <= 9; i++) {
  el.style.setProperty(`--el-color-primary-light-${i}`, mix('#ffffff', storedColor, i * 0.1))
}
el.style.setProperty('--el-color-primary-dark-2', mix('#000000', storedColor, 0.2))

app.use(createPinia())
app.use(router)
app.use(i18n)
app.directive('permission', permissionDirective)

// dev 调试用：把 router/pinia/app 实例挂到 window，便于在 Console 排查动态路由注入问题。
// 生产构建不会被包含（Vite tree-shake import.meta.env.DEV === false 的分支）。
if (import.meta.env.DEV) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__app__ = app
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__router__ = router
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__pinia__ = app.config.globalProperties.$pinia
  console.info('[orange-admin] dev tools: window.__router__.getRoutes() / window.__pinia__ 可查')
}

app.mount('#app')