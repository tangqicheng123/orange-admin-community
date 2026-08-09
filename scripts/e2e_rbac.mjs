// OrangeAdmin RBAC 端到端验证（复刻生产逻辑，不依赖浏览器）
// 覆盖：种子加载+超级管理员自愈 / 登录拿角色 / 菜单可见性过滤 /
//       按钮指令权限 / 路由守卫 meta.permission / 权限分配持久化 / 权限树动态生成
// 同时对比「修复前 hasPermission（含 menuPermissions 短路）」与「修复后」，证明本轮修复生效。

let pass = 0
let fail = 0
function assert(cond, msg) {
  if (cond) { pass++; console.log('  ✅', msg) }
  else { fail++; console.error('  ❌ FAIL', msg) }
}

// ---------- 真实种子（与 src/mock/browser.ts 一致）----------
const MENUS_SEED = [
  { id: 1, parentId: 0, title: '仪表盘', name: 'dashboard', path: '/dashboard', component: 'dashboard/index', permission: 'dashboard:view', affix: true, status: 1 },
  { id: 2, parentId: 0, title: '系统管理', name: 'system', path: '/system', component: 'Layout', permission: '', status: 1 },
  { id: 3, parentId: 0, title: '组件演示', name: 'components', path: '/components', component: 'Layout', permission: '', status: 1 },
  { id: 4, parentId: 2, title: '用户管理', name: 'user', path: '/system/user', component: 'system/User', permission: 'user:view', status: 1 },
  { id: 5, parentId: 2, title: '角色管理', name: 'role', path: '/system/role', component: 'system/Role', permission: 'role:view', status: 1 },
  { id: 6, parentId: 2, title: '菜单管理', name: 'menu', path: '/system/menu', component: 'system/Menu', permission: 'menu:view', status: 1 },
  { id: 7, parentId: 2, title: '部门管理', name: 'dept', path: '/system/dept', component: 'system/Dept', permission: 'dept:view', status: 1 },
  { id: 8, parentId: 2, title: '字典管理', name: 'dict', path: '/system/dict', component: 'system/Dict', permission: 'dict:view', status: 1 },
  { id: 9, parentId: 3, title: '表格', name: 'table', path: '/components/table', component: 'components/Table', permission: 'table:view', status: 1 },
  { id: 10, parentId: 3, title: '表单', name: 'form', path: '/components/form', component: 'components/Form', permission: 'form:view', status: 1 },
  { id: 11, parentId: 3, title: '图表', name: 'chart', path: '/components/chart', component: 'components/Chart', permission: 'chart:view', status: 1 },
]

const MODULE_OPS = {
  user: ['view', 'add', 'edit', 'delete', 'export'],
  role: ['view', 'assign'],
  menu: ['view', 'add', 'edit', 'delete'],
  dept: ['view', 'add', 'edit', 'delete'],
  dict: ['view', 'add', 'edit', 'delete'],
}

// ---------- 内存 mock 存储 ----------
const storage = {}
const getItem = (k) => (k in storage ? JSON.parse(storage[k]) : null)
const setItem = (k, v) => { storage[k] = JSON.stringify(v) }

let roles = [
  { id: 1, name: '超级管理员', code: 'admin', permissions: ['*'] },
  { id: 2, name: '普通用户', code: 'user', permissions: [
    'dashboard:view', 'user:view', 'role:view', 'menu:view', 'dept:view', 'dict:view',
    'table:view', 'form:view', 'chart:view', 'profile:edit',
  ] },
]

// 角色权限持久化（复刻 browser.ts）
const ROLE_PERM_KEY = 'orange-admin-role-perms'
function saveRolePermOverride() {
  const map = {}
  for (const r of roles) map[r.id] = r.permissions
  setItem(ROLE_PERM_KEY, map)
}
function loadRolePermOverride() { return getItem(ROLE_PERM_KEY) || {} }

// 加载逻辑（含持久化覆盖 + 超级管理员自愈）
function initRoles() {
  const ov = loadRolePermOverride()
  for (const r of roles) if (ov[r.id]) r.permissions = ov[r.id]
  const sa = roles.find((r) => r.code === 'admin')
  if (sa) {
    const p = sa.permissions
    const isEmpty = p.length === 0
    const isPolluted = p.length > 0 && !p.includes('*') && p.every((x) => x.endsWith(':view'))
    if (isEmpty || isPolluted) { sa.permissions = ['*']; saveRolePermOverride() }
  }
}

// ---------- 两套 hasPermission 逻辑（对比用）----------
// 「修复前」：含 menuPermissions 短路 —— 把全量菜单 perm 当成可见性授权
function hasPermissionOld(perm, rolePerms, menuPerms) {
  if (!perm) return true
  if (rolePerms.includes('*')) return true
  if (rolePerms.includes(perm)) return true
  return menuPerms.includes(perm) // ← 短路：全量菜单 perm 永远命中
}
// 「修复后」：只按角色权限判断
function hasPermissionNew(perm, rolePerms) {
  if (!perm) return true
  if (rolePerms.includes('*')) return true
  return rolePerms.includes(perm)
}

// 全量菜单 perm 集合（即旧 setMenuPermissions 存的内容）
const ALL_MENU_PERMS = MENUS_SEED.map((m) => m.permission).filter(Boolean)

// ---------- 侧边栏菜单过滤（复刻 Sidebar.vue）----------
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
  const sort = (ns) => { ns.sort((a, b) => a.sort - b.sort); ns.forEach((n) => n.children && sort(n.children)) }
  sort(roots)
  return roots
}

function filterMenu(tree, hasPerm) {
  const out = []
  for (const n of tree) {
    if (n.children && n.children.length) {
      const children = filterMenu(n.children, hasPerm).filter((x) => x !== null)
      if (children.length === 0) continue // 容器无可见子 -> 隐藏
      out.push({ title: n.title, children })
    } else {
      if (n.permission && !hasPerm(n.permission)) continue
      out.push({ title: n.title })
    }
  }
  return out
}

function visibleTitles(filtered) {
  const acc = []
  for (const n of filtered) {
    acc.push(n.title)
    if (n.children) acc.push(...n.children.map((c) => c.title))
  }
  return acc.sort()
}

// ---------- 权限树（复刻 buildPermTree）----------
function buildPermTree(list) {
  const map = new Map()
  list.forEach((m) => map.set(m.id, { id: String(m.id), label: m.title, children: [], raw: m }))
  const roots = []
  map.forEach((node) => {
    const parent = node.raw.parentId ? map.get(node.raw.parentId) : undefined
    if (parent) parent.children.push(node)
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
    const base = raw.permission || `${raw.name}:view`
    const mod = base.split(':')[0]
    const ops = MODULE_OPS[mod] || ['view']
    return { id: `m_${raw.id}`, label: raw.title, children: ops.map((op) => ({ id: `${mod}:${op}`, label: op })) }
  }
  return roots.map(toPerm)
}

// ---------- 路由守卫 meta.permission 检查（复刻 router/index.ts）----------
function routeGuard(perm, rolePerms) {
  if (!perm) return 'allow'
  if (rolePerms.includes('*')) return 'allow'
  if (rolePerms.includes(perm)) return 'allow'
  return '403'
}

// ================= 执行测试 =================
console.log('\n=== T1 种子加载 + 超级管理员自愈 ===')
initRoles()
assert(JSON.stringify(roles[0].permissions) === '["*"]', '超级管理员加载后仍为 ["*"]')

console.log('\n=== T2 admin 登录可见性（修复后应为全可见）===')
{
  const perms = roles[0].permissions // ['*']
  const tree = buildMenuTree(MENUS_SEED)
  const filteredNew = filterMenu(tree, (p) => hasPermissionNew(p, perms))
  const visNew = visibleTitles(filteredNew)
  assert(visNew.includes('组件演示'), 'admin 可见「组件演示」分组')
  assert(visNew.includes('表格') && visNew.includes('表单') && visNew.includes('图表'), 'admin 可见组件演示下全部子项')
  assert(hasPermissionNew('user:add', perms), 'admin 拥有 user:add 操作权限（* 通配）')
}

console.log('\n=== T3 user 登录可见性（种子）===')
{
  const perms = roles[1].permissions
  const tree = buildMenuTree(MENUS_SEED)
  const vis = visibleTitles(filterMenu(tree, (p) => hasPermissionNew(p, perms)))
  assert(vis.includes('用户管理') && vis.includes('角色管理'), '普通用户可见系统管理子项')
  assert(vis.includes('表格') && vis.includes('表单') && vis.includes('图表'), '普通用户种子含组件演示 view → 可见')
  assert(!hasPermissionNew('user:add', perms), '普通用户无 user:add 操作权限 → 看不到新增按钮')
  assert(!hasPermissionNew('role:assign', perms), '普通用户无 role:assign → 看不到分配权限按钮')
  assert(hasPermissionNew('user:view', perms), '普通用户有 user:view → 可进用户管理页')
}

console.log('\n=== T4 回收「超级管理员」组件演示权限（主动编辑，含操作权限）→ 侧边栏应隐藏 ===')
{
  // 真实 savePerm 逻辑：用户在弹窗取消组件演示后保存的是「当前勾选的叶子集合」（不含 '*'，除非全选）。
  // 先收集「全选时所有叶子操作点」，再去掉 table/form/chart 相关，得到 finalPerms（含 user:add 等操作授权）。
  const tree = buildPermTree(MENUS_SEED)
  const allLeaf = []
  const collect = (ns) => ns.forEach((n) => { if (n.children && n.children.length) collect(n.children); else allLeaf.push(n.id) })
  collect(tree)
  const finalPerms = allLeaf.filter((p) => !['table', 'form', 'chart'].some((m) => p.startsWith(m + ':')))
  // 写回 + 持久化 + 重新加载（模拟刷新页面）
  roles[0].permissions = finalPerms
  saveRolePermOverride()
  initRoles()
  const after = roles[0].permissions
  assert(after.includes('user:add'), '重载后超级管理员仍保留 user:add（自愈不劫持主动编辑）')
  assert(!after.includes('*'), '重载后超级管理员不再是 *（尊重用户回收）')
  const tree2 = buildMenuTree(MENUS_SEED)
  const visNew = visibleTitles(filterMenu(tree2, (p) => hasPermissionNew(p, after)))
  const visOld = visibleTitles(filterMenu(tree2, (p) => hasPermissionOld(p, after, ALL_MENU_PERMS)))
  assert(!visNew.includes('组件演示'), '【修复后】侧边栏不再显示「组件演示」分组')
  assert(visOld.includes('组件演示'), '【修复前】侧边栏仍显示「组件演示」（短路 bug 复现）')
}

console.log('\n=== T5 回收「普通用户」组件演示权限 → 普通用户看不到组件演示 ===')
{
  const newPerms = roles[1].permissions.filter((p) => !['table:view','form:view','chart:view'].includes(p))
  roles[1].permissions = newPerms
  saveRolePermOverride()
  initRoles()
  const after = roles[1].permissions
  const tree = buildMenuTree(MENUS_SEED)
  const visNew = visibleTitles(filterMenu(tree, (p) => hasPermissionNew(p, after)))
  const visOld = visibleTitles(filterMenu(tree, (p) => hasPermissionOld(p, after, ALL_MENU_PERMS)))
  assert(!visNew.includes('图表'), '【修复后】普通用户看不到「图表」')
  assert(visOld.includes('图表'), '【修复前】普通用户仍看得到「图表」')
}

console.log('\n=== T6 给「普通用户」加 user:add 操作权限 ===')
{
  roles[1].permissions = [...roles[1].permissions, 'user:add']
  saveRolePermOverride()
  initRoles()
  const after = roles[1].permissions
  assert(hasPermissionNew('user:add', after), '普通用户现在拥有 user:add → 用户管理页出现「新增」按钮')
  const tree = buildMenuTree(MENUS_SEED)
  assert(visibleTitles(filterMenu(tree, (p) => hasPermissionNew(p, after))).includes('用户管理'), '仍可见用户管理（user:view 在）')
}

console.log('\n=== T7 路由守卫 meta.permission ===')
{
  // 普通用户（已去除 table:view）访问 /components/chart（meta.permission='chart:view'）
  const userPerms = roles[1].permissions.filter((p) => p !== 'chart:view')
  assert(routeGuard('chart:view', userPerms) === '403', '普通用户缺 chart:view → 访问图表路由被守卫拦截到 403')
  assert(routeGuard('user:view', userPerms) === 'allow', '普通用户有 user:view → 访问用户管理路由放行')
  const adminPerms = ['*']
  assert(routeGuard('anything:perm', adminPerms) === 'allow', '超级管理员 * 通配 → 任意路由放行')
}

console.log('\n=== T8 权限树动态生成 / 唯一 key ===')
{
  const tree = buildPermTree(MENUS_SEED)
  const ids = []
  const walk = (ns) => ns.forEach((n) => { ids.push(n.id); if (n.children) walk(n.children) })
  walk(tree)
  const dup = ids.filter((v, i) => ids.indexOf(v) !== i)
  assert(dup.length === 0, `权限树节点 key 全局唯一（共 ${ids.length} 个，重复 ${dup.length}）`)
  // 新增菜单自动出现在权限树
  const extended = [...MENUS_SEED, { id: 12, parentId: 2, title: '测试菜单', name: 'demo', path: '/system/demo', component: 'system/Demo', permission: 'demo:view' }]
  const t2 = buildPermTree(extended)
  const sysNode = t2.find((n) => n.id === 'm_2')
  assert(sysNode && sysNode.children.some((c) => c.id === 'm_12'), '新增菜单（挂系统管理下）自动出现在权限分配树')
}

console.log('\n=== T9 分配权限持久化 ===')
{
  // 模拟 PUT /system/role/2/permissions
  const body = { permissions: ['dashboard:view', 'user:view'] }
  const idx = roles.findIndex((r) => r.id === 2)
  roles[idx] = { ...roles[idx], permissions: body.permissions }
  saveRolePermOverride()
  const persisted = getItem(ROLE_PERM_KEY)
  assert(JSON.stringify(persisted['2']) === JSON.stringify(body.permissions), '角色权限分配已写入 localStorage（刷新/切角色不丢）')
}

console.log('\n========================================')
console.log(`结果：PASS ${pass}  FAIL ${fail}`)
console.log('========================================')
if (fail > 0) process.exit(1)
console.log('🎉 全部通过：RBAC 链路在「修复后」逻辑下完全正确，且 T4/T5 已证明「修复前」确实存在菜单不过滤的 bug。')
