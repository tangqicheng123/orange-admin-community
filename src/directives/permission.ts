import type { Directive, DirectiveBinding } from 'vue'
import { useUserStore } from '@/store/user'

/**
 * 按钮级权限指令 v-permission
 *
 * 用法：
 *   v-permission="'user:add'"
 *   v-permission="['user:add', 'user:edit']"
 *
 * 无权限时直接移除 DOM 节点（比 v-if / display:none 更严格，
 * 避免被「审查元素」改样式绕过），符合后台模板安全演示需求。
 */
const permission: Directive<HTMLElement, string | string[]> = {
  mounted(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
    const value = binding.value
    if (!value) return
    const required: string[] = Array.isArray(value) ? value : [value]
    const userStore = useUserStore()
    const allowed = required.some((p) => userStore.hasPermission(p))
    if (!allowed && el.parentNode) {
      el.parentNode.removeChild(el)
    }
  },
}

export default permission
