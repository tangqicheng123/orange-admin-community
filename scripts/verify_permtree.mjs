// 复刻修复后的 buildPermTree，验证 key 唯一性 & 父子关系正确
const MENUS_SEED = [
  { id: 1, parentId: 0, title: '仪表盘', name: 'dashboard', component: 'dashboard/index', permission: 'dashboard:view' },
  { id: 2, parentId: 0, title: '系统管理', name: 'system', component: 'Layout', permission: '' },
  { id: 3, parentId: 0, title: '组件演示', name: 'components', component: 'Layout', permission: '' },
  { id: 4, parentId: 2, title: '用户管理', name: 'user', component: 'system/User', permission: 'user:view' },
  { id: 5, parentId: 2, title: '角色管理', name: 'role', component: 'system/Role', permission: 'role:view' },
  { id: 6, parentId: 2, title: '菜单管理', name: 'menu', component: 'system/Menu', permission: 'menu:view' },
  { id: 7, parentId: 2, title: '部门管理', name: 'dept', component: 'system/Dept', permission: 'dept:view' },
  { id: 8, parentId: 2, title: '字典管理', name: 'dict', component: 'system/Dict', permission: 'dict:view' },
  { id: 9, parentId: 3, title: '表格', name: 'table', component: 'components/Table', permission: 'table:view' },
  { id: 10, parentId: 3, title: '表单', name: 'form', component: 'components/Form', permission: 'form:view' },
  { id: 11, parentId: 3, title: '图表', name: 'chart', component: 'components/Chart', permission: 'chart:view' },
  // 模拟用户新增的「测试菜单」挂在「系统管理」(parentId=2) 下
  { id: 12, parentId: 2, title: '测试菜单', name: 'demo', component: 'system/Demo', permission: 'demo:view' },
]
function buildPermTree(list) {
  const map = new Map()
  list.forEach((m) => map.set(m.id, { id: String(m.id), label: m.title, children: [], raw: m }))
  const roots = []
  map.forEach((node) => {
    const p = node.raw.parentId ? map.get(node.raw.parentId) : undefined
    if (p) p.children.push(node)
    else roots.push(node)
  })
  const toPerm = (n) => {
    const raw = n.raw
    const isContainer = !raw.component || raw.component === 'Layout'
    if (isContainer) {
      const node = { id: `m_${raw.id}`, label: raw.title }
      if (n.children.length) node.children = n.children.map(toPerm)
      return node
    }
    const permKey = raw.permission || `${raw.name}:view`
    return { id: permKey, label: raw.title }
  }
  return roots.map(toPerm)
}
const tree = buildPermTree(MENUS_SEED)
const allIds = []
const parentIds = new Set()
;(function walk(ns) {
  for (const n of ns) {
    allIds.push(n.id)
    if (n.children && n.children.length) {
      parentIds.add(n.id)
      walk(n.children)
    }
  }
})(tree)
const dup = allIds.filter((v, i) => allIds.indexOf(v) !== i)
console.log('总节点数:', allIds.length)
console.log('重复 key:', dup.length ? dup : '无')
console.log('父节点集合:', [...parentIds])
const leafPerms = allIds.filter((id) => !parentIds.has(id))
console.log('叶子权限点(应全部出现在保存集合):', leafPerms)
const misClassified = leafPerms.filter((id) => parentIds.has(id))
console.log('被误判为父节点的权限点:', misClassified.length ? misClassified : '无')
const sysNode = tree.find((n) => n.id === 'm_2')
const hasDemo = sysNode && sysNode.children.some((c) => c.id === 'demo:view')
console.log('测试菜单(demo:view)出现在系统管理下:', hasDemo)
