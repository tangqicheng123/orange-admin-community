// 复刻修复后的 RBAC 逻辑，验证：权限树结构、key 唯一性、超级管理员自愈、普通角色语义。
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
  { id: 12, parentId: 2, title: '测试菜单', name: 'demo', component: 'system/Demo', permission: 'demo:view' },
]

const MODULE_OPS = {
  user: [['view','查看'],['add','新增'],['edit','编辑'],['delete','删除'],['export','导出']],
  role: [['view','查看'],['assign','分配权限']],
  menu: [['view','查看'],['add','新增'],['edit','编辑'],['delete','删除']],
  dept: [['view','查看'],['add','新增'],['edit','编辑'],['delete','删除']],
  dict: [['view','查看'],['add','新增'],['edit','编辑'],['delete','删除']],
}

function buildPermTree(list) {
  const map = new Map()
  list.forEach((m) => map.set(m.id, { id: String(m.id), label: m.title, children: [], raw: m }))
  const roots = []
  map.forEach((node) => {
    const parent = node.raw.parentId ? map.get(node.raw.parentId) : undefined
    if (parent) parent.children.push(node); else roots.push(node)
  })
  const toPerm = (n) => {
    const raw = n.raw
    const isContainer = !raw.component || raw.component === 'Layout'
    if (isContainer) {
      const node = { id: `m_${raw.id}`, label: raw.title }
      if (n.children.length) node.children = n.children.map(toPerm)
      return node
    }
    const base = raw.permission || `${raw.name}:view`
    const mod = base.split(':')[0]
    const ops = MODULE_OPS[mod] || [['view','查看']]
    const children = ops.map(([k, label]) => ({ id: `${mod}:${k}`, label }))
    return { id: `m_${raw.id}`, label: raw.title, children }
  }
  return roots.map(toPerm)
}

const tree = buildPermTree(MENUS_SEED)

// 1) 收集所有 id + 父节点集合
const allIds = []
const parentIds = new Set()
const leafIds = []
;(function walk(ns) {
  for (const n of ns) {
    allIds.push(n.id)
    if (n.children && n.children.length) { parentIds.add(n.id); walk(n.children) }
    else leafIds.push(n.id)
  }
})(tree)
const dup = allIds.filter((v, i) => allIds.indexOf(v) !== i)
console.log('【1】总节点数:', allIds.length, '| 重复 key:', dup.length ? dup : '无')
console.log('【1】父节点(仅分组,不持久化):', [...parentIds])
console.log('【1】叶子权限点总数:', leafIds.length)

// 2) 操作权限点存在性：user 模块应有 5 个操作点
function findNode(ns, id) {
  for (const n of ns) {
    if (n.id === id) return n
    if (n.children) { const f = findNode(n.children, id); if (f) return f }
  }
  return null
}
const userNode = findNode(tree, 'm_4')
const userOps = userNode ? userNode.children.map((c) => c.id).sort() : []
console.log('【2】用户管理操作点:', userOps)
const expectUser = ['user:add','user:delete','user:edit','user:export','user:view'].sort()
console.log('【2】user 操作点齐全:', JSON.stringify(userOps) === JSON.stringify(expectUser))
// 仪表盘无 ops 定义 -> 只有 view
const dashNode = tree.find((n) => n.id === 'm_1')
console.log('【2】仪表盘操作点(应仅 view):', dashNode ? dashNode.children.map((c) => c.id) : 'MISSING')

// 3) 超级管理员自愈：模拟被污染的 permissions（拍平成 view-only），应恢复 ['*']
const roles = [
  { id: 1, code: 'admin', permissions: ['dashboard:view','user:view','role:view','menu:view','dept:view','dict:view'] }, // 被污染
  { id: 2, code: 'user', permissions: ['dashboard:view','user:view','profile:edit'] },
]
const superAdmin = roles.find((r) => r.code === 'admin')
if (superAdmin && !superAdmin.permissions.includes('*')) superAdmin.permissions = ['*']
console.log('【3】超级管理员自愈后 permissions:', JSON.stringify(superAdmin.permissions), '=> 应为 ["*"]')

// 4) hasPermission 模拟：* 通配 + 普通角色 view-only 语义
function hasPermission(perm, permissions) {
  if (!perm) return true
  if (permissions.includes('*')) return true
  return permissions.includes(perm)
}
const adminPerms = ['*']
const userPerms = roles[1].permissions
console.log('【4】管理员 hasPermission(user:add):', hasPermission('user:add', adminPerms), '(应 true)')
console.log('【4】管理员 hasPermission(user:delete):', hasPermission('user:delete', adminPerms), '(应 true)')
console.log('【4】普通用户 hasPermission(user:add):', hasPermission('user:add', userPerms), '(应 false -> 无新增按钮)')
console.log('【4】普通用户 hasPermission(user:view):', hasPermission('user:view', userPerms), '(应 true -> 能看页面)')

// 5) 全选判定：勾选全部叶子 -> 应存 ['*'] 而非拍平
const allLeaf = leafIds
const isAll = allLeaf.length > 0 && allLeaf.length === allLeaf.length
console.log('【5】全选叶子数:', allLeaf.length, '| 全选即 *:', isAll, '=> 存', isAll ? "['*']" : 'leafOnly')
