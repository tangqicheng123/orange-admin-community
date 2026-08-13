import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { get } from '@/utils/request'

export interface PermNode {
  id: string
  // 真实权限码（仅叶子权限点），如 ai:view
  perm?: string
  label: string
  children?: PermNode[]
}

const permToLabel = ref<Map<string, string>>(new Map())
let loaded = false

// 递归翻译树节点：菜单 seed 里很多 title 写的是 i18n key（如 'menu.user'），
// mock 层 buildPermTree 直接用 raw.title，渲染出来是原始 key 而非中文。
// 若 label 是 i18n key 形式（'xx.yy'）就走 t()，否则保留原文。
export function translateTree(nodes: PermNode[], t: (k: string) => string): PermNode[] {
  return nodes.map((n) => {
    const isI18nKey = /^[a-z][a-z0-9_-]*\.[a-z][a-z0-9_]*$/i.test(n.label)
    const label = isI18nKey ? t(n.label) : n.label
    return {
      ...n,
      label,
      children: n.children ? translateTree(n.children, t) : undefined,
    }
  })
}

// 遍历翻译后的权限树，把叶子真实权限码（ai:view）映射到「菜单名 · 操作名」中文标签，
// 供角色/个人中心的权限 tag 展示（否则只会显示 user:add 这类原始码）。
function buildPermLabels(nodes: PermNode[], parentLabel = '') {
  for (const n of nodes) {
    if (n.children && n.children.length) {
      buildPermLabels(n.children, n.label)
    } else if (n.perm) {
      permToLabel.value.set(n.perm, parentLabel ? `${parentLabel} · ${n.label}` : n.label)
    }
  }
}

export function usePermLabel() {
  const { t } = useI18n()

  // 拉一次权限树构建映射（模块级缓存，多页面共享，只拉一次）
  async function ensurePermLabels() {
    if (loaded) return
    loaded = true
    try {
      const res = await get<{ list: PermNode[] }>('/system/permission/tree')
      buildPermLabels(translateTree(res.list, t))
    } catch {
      // 拉取失败不影响主流程，tag 退化为显示原始权限码
    }
  }

  // 字典兜底：权限树里没有、但真实存在的游离权限码（如 profile/dashboard 这类
  // 不属于「角色可分配菜单」的模块），映射缺失时按「模块中文 · 操作中文」翻译。
  // 与 buildPermLabels 的精确映射互补——树里有的优先用树映射，这里只兜底树里没有的。
  const MODULE_CN: Record<string, string> = {
    dashboard: '仪表盘',
    user: '用户管理',
    role: '角色管理',
    menu: '菜单管理',
    dept: '部门管理',
    dict: '字典管理',
    ai: 'AI 应用管理',
    profile: '个人中心',
  }
  const OP_CN: Record<string, string> = {
    view: '查看',
    create: '创建',
    add: '新增',
    edit: '编辑',
    delete: '删除',
    upload: '上传',
  }
  function fallbackLabel(p: string): string {
    const [mod, op] = p.split(':')
    if (!op) return p
    const m = MODULE_CN[mod]
    const o = OP_CN[op]
    if (m && o) return `${m} · ${o}`
    return p
  }

  function translatePerm(p: string): string {
    if (p === '*') return t('common.allPermissions')
    return permToLabel.value.get(p) || fallbackLabel(p)
  }

  return { ensurePermLabels, translatePerm }
}
