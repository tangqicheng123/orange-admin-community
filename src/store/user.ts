// 用户与权限状态
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as loginApi, getUserInfo as getUserInfoApi, logout as logoutApi } from '@/api/user'
import { setToken, removeToken, getToken } from '@/utils/auth'
import type { LoginParams, UserInfo } from '@/types/user'

export const useUserStore = defineStore('user', () => {
  const token = ref(getToken())
  const userInfo = ref<UserInfo | null>(null)

  const roles = computed(() => userInfo.value?.roles || [])
  const permissions = computed(() => userInfo.value?.permissions || [])
  // 动态菜单的 permission 集合（由菜单表注入，供路由守卫/侧边栏判断）
  const menuPermissions = ref<string[]>([])

  async function login(params: LoginParams) {
    const { token: t } = await loginApi(params)
    setToken(t)
    token.value = t
  }

  async function fetchUserInfo() {
    userInfo.value = await getUserInfoApi()
    return userInfo.value
  }

  // 权限判断：'*' 表示超级管理员拥有全部权限
  // ⚠️ 不再短路 menuPermissions：菜单 permission 是「资源-权限映射」定义，不能反过来用它当可见性授权。
  // 历史坑：早期 `menuPermissions` 存的是全量菜单的 permission 集合，等于永远命中，导致角色权限过滤失效。
  function hasPermission(perm?: string): boolean {
    if (!perm) return true
    if (permissions.value.includes('*')) return true
    return permissions.value.includes(perm)
  }

  // 已废弃：保留签名兼容，调用方为 router/index.ts 在注入动态路由时调用。
  // 菜单权限判断应完全由 `permissions`（角色权限）决定；菜单表只是声明每个路由的所需权限点，
  // 由路由守卫按当前用户角色权限拦截。侧边栏按 hasPermission(菜单.permission) 渲染可见性。
  function setMenuPermissions(_list: { permission?: string }[]) {
    void _list
    /* no-op：保留向后兼容，无副作用。 */
  }

  async function logout() {
    try {
      await logoutApi()
    } catch {
      // 忽略接口异常，仍清除本地状态
    }
    removeToken()
    token.value = ''
    userInfo.value = null
  }

  return { token, userInfo, roles, permissions, menuPermissions, login, fetchUserInfo, hasPermission, setMenuPermissions, logout }
})
