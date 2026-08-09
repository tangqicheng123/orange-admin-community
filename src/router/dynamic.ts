// 动态路由：把后端（此处为 mock 菜单表）返回的菜单转换为 RouteRecordRaw。
// 业务菜单全部由此动态生成，不再写死在 routes.ts 里。
import type { RouteRecordRaw } from 'vue-router'

export interface MenuNode {
  id: number
  parentId?: number
  title: string
  name: string
  path: string
  component: string
  icon: string
  sort: number
  status: number
  permission: string
  affix?: boolean
  children?: MenuNode[]
}

export interface MenuRowLike {
  id: number
  parentId?: number
  title: string
  name: string
  path: string
  component: string
  icon: string
  sort: number
  status: number
  permission: string
  affix?: boolean
}

// component 字符串 -> 懒加载组件。找不到的视图回退到 404，避免出现空白页。
// 关键修复：之前用 import(/* @vite-ignore */ '@/views/${component}.vue')，
// @vite-ignore 让 vite 跳过静态分析、'@' 别名浏览器运行时又不认识，导致 production
// 构建根本不打包这些视图 chunk，运行时加载失败 → 全部静默 fallback 到 404。
// 改用 import.meta.glob 在「构建期」静态收集所有视图模块（每个视图生成独立 chunk），
// 运行时按 component 字符串查表，浏览器原生支持、路径由 vite 重写。
const fallback = () => import('@/views/error/404.vue')
const viewModules = import.meta.glob('../views/**/*.vue')
const viewMap = new Map<string, () => Promise<unknown>>()
for (const [p, loader] of Object.entries(viewModules)) {
  // 不区分大小写，避免菜单 component 大小写与实际文件名不一致时匹配失败
  viewMap.set(p.toLowerCase(), loader as () => Promise<unknown>)
}
const lazyMap = new Map<string, () => Promise<unknown>>()
function resolveComponent(component: string): () => Promise<unknown> {
  // 容器节点（Layout）不挂组件，返回空组件占位
  if (!component || component === 'Layout') return () => Promise.resolve({})
  if (lazyMap.has(component)) return lazyMap.get(component)!
  const key = `../views/${component}.vue`.toLowerCase()
  const loader = viewMap.get(key)
  if (!loader) return fallback
  const wrapped = () => (loader() as Promise<unknown>).catch(() => fallback())
  lazyMap.set(component, wrapped)
  return wrapped
}

// 把扁平菜单按 parentId 组装为树，并按 sort 排序
export function buildMenuTree(list: MenuRowLike[]): MenuNode[] {
  const map = new Map<number, MenuNode>()
  list.forEach((m) => map.set(m.id, { ...m, children: [] }))
  const roots: MenuNode[] = []
  map.forEach((node) => {
    // 只纳入 status===1 的菜单（停用菜单不渲染）
    if (node.status !== 1) return
    const parent = node.parentId ? map.get(node.parentId) : undefined
    if (parent) {
      parent.children!.push(node)
    } else {
      roots.push(node)
    }
  })
  const sortRec = (nodes: MenuNode[]) => {
    nodes.sort((a, b) => a.sort - b.sort)
    nodes.forEach((n) => n.children && sortRec(n.children))
  }
  sortRec(roots)
  return roots
}

// 菜单树 -> 路由记录。目录节点（无 component 或 component==='Layout'）只作为布局容器，
// 渲染为 el-sub-menu，不挂具体组件；叶子菜单挂懒加载组件。
function menuToRoutes(nodes: MenuNode[]): RouteRecordRaw[] {
  const routes: RouteRecordRaw[] = []
  for (const n of nodes) {
    const hasChildren = n.children && n.children.length > 0
    const isContainer = !n.component || n.component === 'Layout'
    const base = {
      // 绝对 path：子路由以 / 开头时 vue-router 不会拼接父路由 path，
      // 避免 /system/system/user 这类重复拼接（相对 path 方案下父 path 会被二次拼接）
      path: n.path,
      name: n.name || `Menu_${n.id}`,
      meta: {
        title: n.title,
        icon: n.icon,
        permission: n.permission || undefined,
        ...(n.affix ? { affix: true } : {}),
      },
    } as unknown as RouteRecordRaw
    // 叶子节点挂组件（容器节点仅作分组）；组件缺失回退 404
    if (!isContainer) {
      ;(base as RouteRecordRaw & { component: () => Promise<unknown> }).component =
        resolveComponent(n.component)
    }
    // 容器且有子节点：递归子路由，并默认重定向到第一个可见子菜单
    if (hasChildren) {
      const childRoutes = menuToRoutes(n.children!)
      ;(base as RouteRecordRaw & { children: RouteRecordRaw[] }).children = childRoutes
      if (isContainer && childRoutes.length) {
        ;(base as RouteRecordRaw & { redirect: string | Record<string, never> }).redirect =
          childRoutes[0].path
      }
    }
    routes.push(base)
  }
  return routes
}

// 生成「业务菜单」动态路由（不含骨架路由 /login、/403 等）
export function generateRoutes(list: MenuRowLike[]): RouteRecordRaw[] {
  return menuToRoutes(buildMenuTree(list))
}
