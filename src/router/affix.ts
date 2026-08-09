import router from './index'

// 收集所有声明了 meta.affix 的路由 path（固定标签，不可关闭）。
// 注意：业务菜单（含 dashboard 的 affix 标记）是动态注入的，
// 因此这里扫描「已注册路由」（包括 addRoute 注入的），而非静态 routes 表。
export const affixTabPaths: string[] = (() => {
  const list: string[] = []
  const walk = (rs: ReturnType<typeof router.getRoutes>) => {
    for (const r of rs) {
      if (r.meta?.affix && r.path) list.push(r.path)
    }
  }
  walk(router.getRoutes())
  return list
})()
