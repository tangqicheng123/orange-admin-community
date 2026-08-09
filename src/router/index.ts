import { createRouter, createWebHashHistory } from 'vue-router'
import { routes } from './routes'
import { generateRoutes, type MenuRowLike } from './dynamic'
import { getToken } from '@/utils/auth'
import { useUserStore } from '@/store/user'
import { useMenuStore } from '@/store/menu'

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// 记录已注入的动态路由（用于菜单变动后清理重注入）
let dynamicAdded = false
// 当前注入的业务路由（用于重注入前移除）
let addedRouteNames: string[] = []
// 上次注入路由时对应的角色标识：用于检测「切换账号」后重新注入，
// 否则登出再登录其他角色时，菜单/路由仍是上一个角色的陈旧状态（侧边栏权限过滤失效）。
let lastInjectRole = ''

async function injectDynamicRoutes(): Promise<void> {
  const menuStore = useMenuStore()
  const userStore = useUserStore()
  // force=true：切换账号时强制重新拉取菜单，避免使用上一个角色缓存的菜单数据
  const list = await menuStore.fetchMenus(true)
  // 把菜单里的 permission 同步给用户 store，供路由守卫/侧边栏做权限判断
  userStore.setMenuPermissions(list)
  // 移除上一次注入的（避免重复/陈旧路由）
  addedRouteNames.forEach((n) => router.removeRoute(n))
  addedRouteNames = []
  // 生成路由并挂到根布局（name: 'Root'）下
  const dynamicRoutes = generateRoutes(list as MenuRowLike[])
  dynamicRoutes.forEach((r) => {
    router.addRoute('Root', r)
    if (r.name) addedRouteNames.push(r.name as string)
  })
  dynamicAdded = true
  lastInjectRole = (userStore.userInfo?.roles || []).join('|')
}

// 菜单增删改后，重注入动态路由
window.addEventListener('menu-changed', () => {
  injectDynamicRoutes().catch(() => {
    /* 忽略重注入异常 */
  })
})

router.beforeEach(async (to) => {
  const token = getToken()

  // 未登录：只允许登录页 / 刷新中转页直接放行，其余跳登录
  if (!token) {
    if (to.name === 'Login' || to.name === 'Redirect') return true
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  const userStore = useUserStore()
  // 首屏：拉取用户信息（仅一次）
  if (!userStore.userInfo) {
    try {
      await userStore.fetchUserInfo()
    } catch {
      return { path: '/login' }
    }
  }

  // 注入动态业务菜单路由：首屏一次；角色变化时（切换账号）也必须重新注入，
  // 否则登出再登录其他角色时，侧边栏/路由仍是上一个角色的陈旧状态（权限过滤失效）。
  // 关键：必须在「放行/权限」判断之前完成。否则 /dashboard 等动态路径会被通配 404 先行匹配，
  // 而 404 标记为 public 导致守卫直接放行、跳过注入，最终停留在 404 页。
  const curRole = (userStore.userInfo?.roles || []).join('|')
  if (!dynamicAdded || curRole !== lastInjectRole) {
    try {
      await injectDynamicRoutes()
    } catch {
      /* 菜单拉取失败不阻断登录，仅业务菜单缺失 */
    }
    // 重新解析目标路由（动态路由刚加入，需要再 next 一次才能匹配）。
    // 注意：必须返回「纯 location」（path/query/hash），绝不能展开 `to`——
    // 否则会把第一次匹配时命中的 404（to.matched=[404]）原样带回，
    // vue-router 不会重新去 matcher 里查找刚注入的 /dashboard，导致登录后直接 404，
    // 而手动点「回到首页」时路由早已就绪才正常。
    return { path: to.path, query: to.query, hash: to.hash, replace: true }
  }

  // 已登录访问登录页 -> 跳首页
  if (to.name === 'Login') return { path: '/' }

  // 路由级权限校验（动态菜单的 permission 已由 setMenuPermissions 注入权限集合）
  const permission = to.meta.permission as string | undefined
  if (permission && !userStore.hasPermission(permission)) {
    return { path: '/403' }
  }

  return true
})

export default router
