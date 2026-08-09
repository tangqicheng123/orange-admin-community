// 复刻 OrangeAdmin 的「侧边栏菜单过滤」+「超级管理员自愈」逻辑，验证两个 bug：
//  Bug1: 取消超级管理员部分权限后，自愈逻辑又把 '*' 强加回去 -> 权限全回来
//  Bug2: 取消普通用户「组件演示」所有权限，切到普通用户仍能看到「组件演示」
//
// 仅做纯逻辑断言，不依赖 Vue 运行时。

// ---------- 数据 ----------
const MENUS_SEED = [
  { id: 1, parentId: 0, title: '仪表盘', name: 'dashboard', path: '/dashboard', component: 'dashboard/index', permission: 'dashboard:view', status: 1 },
  { id: 2, parentId: 0, title: '系统管理', name: 'system', path: '/system', component: 'Layout', permission: '', status: 1 },
  { id: 3, parentId: 0, title: '组件演示', name: 'components', path: '/components', component: 'Layout', permission: '', status: 1 },
  { id: 4, parentId: 2, title: '用户管理', name: 'user', path: '/system/user', component: 'system/User', permission: 'user:view', status: 1 },
  { id: 5, parentId: 2, title: '角色管理', name: 'role', path: '/system/role', component: 'system/Role', permission: 'role:view', status: 1 },
  { id: 6, parentId: 2, title: '菜单管理', name: 'menu', path: '/system/menu', component: 'system/Menu', permission: 'menu:view', status: 1 },
  { id: 9, parentId: 3, title: '表格', name: 'table', path: '/components/table', component: 'components/Table', permission: 'table:view', status: 1 },
  { id: 10, parentId: 3, title: '表单', name: 'form', path: '/components/form', component: 'components/Form', permission: 'form:view', status: 1 },
  { id: 11, parentId: 3, title: '图表', name: 'chart', path: '/components/chart', component: 'components/Chart', permission: 'chart:view', status: 1 },
]

function buildMenuTree(list) {
  const map = new Map()
  list.forEach((m) => map.set(m.id, { ...m, children: [] }))
  const roots = []
  map.forEach((node) => {
    if (node.status !== 1) return
    const parent = node.parentId ? map.get(node.parentId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  })
  const sortRec = (nodes) => { nodes.sort((a, b) => a.sort - b.sort); nodes.forEach((n) => n.children && sortRec(n.children)) }
  // 注意源码里没有显式 sort 字段，这里补默认 0 防止出错
  sortRec(roots)
  return roots
}

function hasPermission(perm, permissions, menuPermissions) {
  if (!perm) return true
  if (permissions.includes('*')) return true
  if (permissions.includes(perm)) return true
  return menuPermissions.includes(perm)
}

// 复刻 Sidebar.vue 的 mapPerm（容器看子项，叶子看 hasPermission）
function filterMenuItems(tree, permissions, menuPermissions) {
  const mapPerm = (n) => {
    const children = n.children && n.children.length
      ? n.children.map(mapPerm).filter((x) => x !== null)
      : undefined
    if (n.children && n.children.length) {
      if (!children || children.length === 0) return null
      return { title: n.title, path: n.path, children }
    }
    if (n.permission && !hasPermission(n.permission, permissions, menuPermissions)) return null
    return { title: n.title, path: n.path }
  }
  return tree.map(mapPerm).filter((x) => x !== null)
}

// 复刻当前「过度劫持」的自愈逻辑
function selfHeal_OVERAGGRESSIVE(roles) {
  const sa = roles.find((r) => r.code === 'admin')
  if (sa && !sa.permissions.includes('*')) {
    sa.permissions = ['*']
  }
  return roles
}

// 复刻改进后的「收窄」自愈逻辑：仅当权限为空，或纯 view 拍平（被旧事故污染）时恢复
function selfHeal_NARROW(roles, appliedOverride) {
  const sa = roles.find((r) => r.code === 'admin')
  if (!sa) return roles
  const perms = sa.permissions
  const isPolluted = perms.length > 0 && !perms.includes('*') && perms.every((p) => p.endsWith(':view'))
  const isEmpty = perms.length === 0
  // 已有用户主动覆盖且不污染 -> 尊重用户编辑，不劫持
  if (appliedOverride && !isPolluted) return roles
  if (isEmpty || isPolluted) sa.permissions = ['*']
  return roles
}

// ============ 断言 ============
let pass = 0, fail = 0
function assert(name, cond) {
  if (cond) { pass++; console.log('  PASS:', name) }
  else { fail++; console.log('  FAIL:', name) }
}

console.log('【Bug2 验证】普通用户取消「组件演示」全部权限后，侧边栏是否隐藏「组件演示」')
// 普通用户默认权限（seed）
let normalPerms = ['dashboard:view','user:view','role:view','menu:view','dept:view','dict:view','table:view','form:view','chart:view','profile:edit']
// 取消组件演示全部（table/form/chart 的 view 及操作点）
const afterCancel = normalPerms.filter((p) => !['table:view','form:view','chart:view','table:add','table:edit','table:delete','table:export','form:add','form:edit','form:delete','chart:add','chart:edit','chart:delete','chart:export'].includes(p))
const itemsBefore = filterMenuItems(buildMenuTree(MENUS_SEED), normalPerms, [])
const itemsAfter = filterMenuItems(buildMenuTree(MENUS_SEED), afterCancel, [])
const hasComponentsBefore = JSON.stringify(itemsBefore).includes('组件演示')
const hasComponentsAfter = JSON.stringify(itemsAfter).includes('组件演示')
console.log('  取消前 含「组件演示」:', hasComponentsBefore, '| 取消后 含「组件演示」:', hasComponentsAfter)
assert('取消组件演示全部权限后，侧边栏隐藏「组件演示」', hasComponentsBefore && !hasComponentsAfter)

console.log('\n【Bug1 验证-过度劫持】用户主动编辑超级管理员（去掉部分权限，保留部分 view+操作）')
let roles1 = [{ id:1, code:'admin', permissions:['dashboard:view','user:view','user:add'] }]
selfHeal_OVERAGGRESSIVE(roles1)
console.log('  过度劫持后 超级管理员权限:', JSON.stringify(roles1[0].permissions))
assert('过度劫持：用户主动编辑后不该被恢复成 [*]', !(roles1[0].permissions.length === 1 && roles1[0].permissions[0] === '*'))

console.log('\n【Bug1 验证-收窄】用户主动编辑超级管理员（混合权限）应被尊重')
let roles2 = [{ id:1, code:'admin', permissions:['dashboard:view','user:view','user:add'] }]
selfHeal_NARROW(roles2, true)
console.log('  收窄后 超级管理员权限:', JSON.stringify(roles2[0].permissions))
assert('收窄：用户主动编辑（含操作权限）应被尊重', JSON.stringify(roles2[0].permissions) === JSON.stringify(['dashboard:view','user:view','user:add']))

console.log('\n【Bug1 验证-收窄】旧事故污染的纯 view 仍应自愈修复')
let roles3 = [{ id:1, code:'admin', permissions:['user:view','role:view','menu:view'] }]
selfHeal_NARROW(roles3, true)
console.log('  收窄后 超级管理员权限:', JSON.stringify(roles3[0].permissions))
assert('收窄：纯 view 污染应自愈回 [*]', roles3[0].permissions.length === 1 && roles3[0].permissions[0] === '*')

console.log(`\n结果: PASS=${pass} FAIL=${fail}`)
