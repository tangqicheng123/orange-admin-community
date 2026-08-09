// 菜单 store：拉取菜单表、暴露给侧边栏渲染、并在菜单变动时触发动态路由重注入
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { get } from '@/utils/request'
import type { MenuRowLike } from '@/router/dynamic'

export const useMenuStore = defineStore('menu', () => {
  const menus = ref<MenuRowLike[]>([])
  const loaded = ref(false)

  async function fetchMenus(force = false): Promise<MenuRowLike[]> {
    if (loaded.value && !force) return menus.value
    const res = await get<{ list: MenuRowLike[]; total: number }>('/system/menu')
    menus.value = res.list
    loaded.value = true
    return menus.value
  }

  // 菜单增删改后调用：刷新菜单数据 + 触发动态路由重注入
  async function refresh(): Promise<void> {
    await fetchMenus(true)
    // 通过自定义事件通知 router 重注入（避免 store 直接依赖 router 造成循环引用）
    window.dispatchEvent(new CustomEvent('menu-changed'))
  }

  return { menus, loaded, fetchMenus, refresh }
})
