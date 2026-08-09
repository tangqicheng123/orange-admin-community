// 浏览器端 Mock（零额外依赖，纯函数匹配）
// 作用：在 preview / 部署 Demo 等没有 vite-plugin-mock 服务端中间件的场景下，
// 通过 axios adapter 在浏览器内直接拦截 /api 请求并返回 mock 数据。
// dev 模式 vite-plugin-mock 已通过服务端中间件生效，本模块不会重复拦截（见 request.ts 判断）。
//
// 合规：本文件仅包含演示数据，无第三方版权素材，可随模板售卖。

export interface MockRequest {
  url: string
  method: string
  headers?: Record<string, string>
  body?: unknown
  params?: Record<string, unknown>
}

export interface MockResult {
  status: number
  data: unknown
}

type Handler = (req: MockRequest) => MockResult

interface Route {
  method: string
  // 支持 :param 占位（如 /system/user/:id）
  pattern: string
  handler: Handler
}

// ---- 鉴权 ----
function isAdmin(headers: Record<string, string> = {}): boolean {
  const auth = headers.authorization || headers.Authorization || ''
  return auth.includes('admin')
}

// ---- 通用本地持久化（模拟后端存储，新增/修改结果刷新后不丢）----
function loadOverride<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function saveOverride(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

// ---- 系统管理 Mock 数据集 ----
const users = [
  { id: 1, username: 'admin', nickname: '超级管理员', dept: '技术部', role: 'admin', status: 1, email: 'admin@orange.com', phone: '13800000001' },
  { id: 2, username: 'user', nickname: '张三', dept: '产品部', role: 'user', status: 1, email: 'zhangsan@orange.com', phone: '13800000002' },
  { id: 3, username: 'lisi', nickname: '李四', dept: '设计部', role: 'user', status: 0, email: 'lisi@orange.com', phone: '13800000003' },
  { id: 4, username: 'wangwu', nickname: '王五', dept: '市场部', role: 'user', status: 1, email: 'wangwu@orange.com', phone: '13800000004' },
]

// 用户数据持久化覆盖（个人中心编辑昵称/邮箱/手机后刷新不丢，与 menus/roles 同模式）
const USER_OVERRIDE_KEY = 'orange-admin-users'
const _userOverride = loadOverride<Record<number, Partial<(typeof users)[number]>>>(
  USER_OVERRIDE_KEY,
  {},
)
for (const u of users) {
  const ov = _userOverride[u.id]
  if (ov) Object.assign(u, ov)
}
function saveUserOverride() {
  const map: Record<number, Partial<(typeof users)[number]>> = {}
  for (const u of users) {
    map[u.id] = { nickname: u.nickname, email: u.email, phone: u.phone, dept: u.dept }
  }
  saveOverride(USER_OVERRIDE_KEY, map)
}

const roles = [
  { id: 1, name: '超级管理员', code: 'admin', permissions: ['*'], remark: '系统最高权限', createTime: '2025-01-01' },
  {
    id: 2,
    name: '普通用户',
    code: 'user',
    // 默认开放各模块「查看」权限（菜单可见），admin 分配时按需关闭。
    // 注意：父菜单（系统管理/组件演示）不再依赖独立的 system:view/components:view
    // 权限点，而是「子菜单全部不可见时父菜单自动隐藏」，故此处只给叶子 view 权限。
    permissions: [
      'dashboard:view',
      'user:view', 'role:view', 'menu:view', 'dept:view', 'dict:view',
      'table:view', 'form:view', 'chart:view',
      'profile:edit',
    ],
    remark: '受限权限',
    createTime: '2025-01-02',
  },
]

// 角色权限覆盖持久化（模拟后端存储）：分配结果写入 localStorage，
// 避免刷新页面 / 切换角色（reload）后运行时内存被重置导致分配失效。
const ROLE_PERM_KEY = 'orange-admin-role-perms'
function loadRolePermOverride(): Record<number, string[]> {
  try {
    const raw = localStorage.getItem(ROLE_PERM_KEY)
    return raw ? (JSON.parse(raw) as Record<number, string[]>) : {}
  } catch {
    return {}
  }
}
function saveRolePermOverride() {
  const map: Record<number, string[]> = {}
  for (const r of roles) map[r.id] = r.permissions
  try {
    localStorage.setItem(ROLE_PERM_KEY, JSON.stringify(map))
  } catch {
    /* 忽略存储异常 */
  }
}
// 模块加载时应用持久化覆盖（刷新/重载后恢复分配结果）
const _roleOverride = loadRolePermOverride()
for (const r of roles) {
  if (_roleOverride[r.id]) r.permissions = _roleOverride[r.id]
}
// 超级管理员自愈（收窄版）：仅在「权限为空」或「被旧事故拍平成纯 view 集合」时，
// 自动恢复为 ['*']，避免「能看页面却没操作按钮」的疑难问题。超级管理员本就该拥有全部权限。
// 注意：若用户主动编辑过超级管理员（含任意操作权限点，即非纯 view），则尊重用户选择，
// 不再强制劫持回 ['*']——否则会出现「取消部分权限后所有权限又被加回来」的怪现象。
const _superAdmin = roles.find((r) => r.code === 'admin')
if (_superAdmin) {
  const _saPerms = _superAdmin.permissions
  const _isEmpty = _saPerms.length === 0
  const _isPolluted =
    _saPerms.length > 0 && !_saPerms.includes('*') && _saPerms.every((p) => p.endsWith(':view'))
  if (_isEmpty || _isPolluted) {
    _superAdmin.permissions = ['*']
    saveRolePermOverride()
  }
}

const MENUS_SEED = [
  { id: 1, parentId: 0, title: 'menu.dashboard', name: 'dashboard', path: '/dashboard', component: 'dashboard/index', icon: 'Odometer', sort: 1, status: 1, permission: 'dashboard:view', affix: true },
  { id: 2, parentId: 0, title: 'menu.system', name: 'system', path: '/system', component: 'Layout', icon: 'Setting', sort: 2, status: 1, permission: '' },
  { id: 3, parentId: 0, title: 'menu.components', name: 'components', path: '/components', component: 'Layout', icon: 'Grid', sort: 3, status: 1, permission: '' },
  { id: 4, parentId: 2, title: 'menu.user', name: 'user', path: '/system/user', component: 'system/User', icon: 'User', sort: 1, status: 1, permission: 'user:view' },
  { id: 5, parentId: 2, title: 'menu.role', name: 'role', path: '/system/role', component: 'system/Role', icon: 'UserFilled', sort: 2, status: 1, permission: 'role:view' },
  { id: 6, parentId: 2, title: 'menu.menu', name: 'menu', path: '/system/menu', component: 'system/Menu', icon: 'Menu', sort: 3, status: 1, permission: 'menu:view' },
  { id: 7, parentId: 2, title: 'menu.dept', name: 'dept', path: '/system/dept', component: 'system/Dept', icon: 'OfficeBuilding', sort: 4, status: 1, permission: 'dept:view' },
  { id: 8, parentId: 2, title: 'menu.dict', name: 'dict', path: '/system/dict', component: 'system/Dict', icon: 'Collection', sort: 5, status: 1, permission: 'dict:view' },
  { id: 9, parentId: 3, title: 'menu.table', name: 'table', path: '/components/table', component: 'components/Table', icon: 'Grid', sort: 1, status: 1, permission: 'table:view' },
  { id: 10, parentId: 3, title: 'menu.form', name: 'form', path: '/components/form', component: 'components/Form', icon: 'Document', sort: 2, status: 1, permission: 'form:view' },
  { id: 11, parentId: 3, title: 'menu.chart', name: 'chart', path: '/components/chart', component: 'components/Chart', icon: 'PieChart', sort: 3, status: 1, permission: 'chart:view' },
  // 帮助中心（容器，所有人可见，不进权限树）
  { id: 12, parentId: 0, title: 'menu.help', name: 'help', path: '/help', component: 'Layout', icon: 'QuestionFilled', sort: 4, status: 1, permission: '' },
  { id: 13, parentId: 12, title: 'menu.doc', name: 'doc', path: '/help/doc', component: 'help/Docs', icon: 'Document', sort: 1, status: 1, permission: '' },
  { id: 14, parentId: 12, title: 'menu.pricing', name: 'pricing', path: '/help/pricing', component: 'help/Pricing', icon: 'Goods', sort: 2, status: 1, permission: '' },
  // 交付样板（容器，所有人可见，不进权限树）
  { id: 15, parentId: 0, title: 'menu.samples', name: 'samples', path: '/samples', component: 'Layout', icon: 'Box', sort: 5, status: 1, permission: '' },
  { id: 16, parentId: 15, title: 'menu.sampleEcom', name: 'sampleEcom', path: '/samples/ecommerce', component: 'samples/Ecommerce', icon: 'ShoppingCart', sort: 1, status: 1, permission: '' },
  { id: 17, parentId: 15, title: 'menu.sampleCrm', name: 'sampleCrm', path: '/samples/crm', component: 'samples/Crm', icon: 'Connection', sort: 2, status: 1, permission: '' },
]
// 菜单数据工作副本（可被 localStorage 覆盖；MENUS_SEED 保留原始种子用于自愈）
const menus = [...MENUS_SEED]
// 菜单数据持久化覆盖（模拟后端存储，新增/修改/删除刷新后不丢）
const menuOverride = loadOverride<any[]>('orange-admin-menus', [])
if (menuOverride.length) {
  menus.length = 0
  menus.push(...menuOverride)
}
// 种子自愈：核心骨架菜单（id 1/2/3：仪表盘/系统管理/组件演示）始终存在，
// 缺失则从种子补回，避免脏数据删骨架导致整系统 404。
for (const s of MENUS_SEED) {
  if (s.id <= 3 && !menus.some((m) => m.id === s.id)) {
    menus.push({ ...s })
  }
}
let menuSeq = menus.reduce((m, d) => Math.max(m, d.id), 0)
function saveMenuOverride() {
  saveOverride('orange-admin-menus', menus)
}

const depts = [
  { id: 1, name: '技术部', leader: '王工', sort: 1, status: 1, createTime: '2025-01-01' },
  { id: 2, name: '产品部', leader: '李总', sort: 2, status: 1, createTime: '2025-01-01' },
  { id: 3, name: '设计部', leader: '赵设', sort: 3, status: 0, createTime: '2025-01-01' },
]
// 部门数据持久化覆盖（模拟后端存储，新增的部门刷新后不丢）
const deptOverride = loadOverride<any[]>('orange-admin-depts', [])
if (deptOverride.length) {
  depts.length = 0
  depts.push(...deptOverride)
}
let deptSeq = depts.reduce((m, d) => Math.max(m, d.id), 0)
function saveDeptOverride() {
  saveOverride('orange-admin-depts', depts)
}

const dicts = [
  { id: 1, name: '用户状态', type: 'user_status', status: 1, remark: '账号启用/禁用' },
  { id: 2, name: '性别', type: 'gender', status: 1, remark: '男/女' },
]
// 字典数据持久化覆盖（模拟后端存储，新增/修改/删除刷新后不丢）
const dictOverride = loadOverride<any[]>('orange-admin-dicts', [])
if (dictOverride.length) {
  dicts.length = 0
  dicts.push(...dictOverride)
}
let dictSeq = dicts.reduce((m, d) => Math.max(m, d.id), 0)
function saveDictOverride() {
  saveOverride('orange-admin-dicts', dicts)
}

// ---------- 交付样板：电商订单 / CRM 线索 演示数据 ----------
const ecomProducts = ['无线蓝牙耳机', '智能手表 Pro', '便携充电宝', '机械键盘', '4K 摄像头', '人体工学椅', '空气净化器', '游戏鼠标']
const ecomStatuses = ['paid', 'pending', 'shipped', 'done', 'refund'] as const
const orders: { id: number; no: string; customer: string; product: string; amount: number; status: (typeof ecomStatuses)[number]; time: string }[] = []
for (let i = 1; i <= 58; i++) {
  const st = ecomStatuses[i % ecomStatuses.length]
  orders.push({
    id: i,
    no: 'EC' + String(20260000 + i),
    customer: '客户 ' + String.fromCharCode(65 + (i % 26)) + (1000 + i),
    product: ecomProducts[i % ecomProducts.length],
    amount: Math.round((99 + (i * 37) % 1900) * 100) / 100,
    status: st,
    time: '2026-0' + (1 + (i % 8)) + '-' + String(10 + (i % 18)).padStart(2, '0') + ' ' + String(8 + (i % 12)).padStart(2, '0') + ':30',
  })
}

const crmStages = ['lead', 'contact', 'proposal', 'won', 'lost'] as const
const crmOwners = ['张经理', '李销售', '王顾问', '赵代表']
const leads: { id: number; account: string; contact: string; stage: (typeof crmStages)[number]; amount: number; owner: string; time: string }[] = []
for (let i = 1; i <= 46; i++) {
  const st = crmStages[i % crmStages.length]
  leads.push({
    id: i,
    account: (['星辰科技', '云图网络', '锐捷智能', '恒通物流', '美邻生鲜', '智造工业', '百川金融', '优品电商'])[i % 8] + '有限公司',
    contact: '联系人 ' + String.fromCharCode(65 + (i % 26)) + (200 + i),
    stage: st,
    amount: Math.round((2000 + (i * 53) % 48000) * 100) / 100,
    owner: crmOwners[i % crmOwners.length],
    time: '2026-0' + (1 + (i % 8)) + '-' + String(10 + (i % 18)).padStart(2, '0') + ' ' + String(9 + (i % 11)).padStart(2, '0') + ':15',
  })
}

// 权限树：由菜单表动态生成。每个叶子菜单拆成「模块分组节点」+ 多个「操作权限点」
// （查看/新增/编辑/删除/导出等），与页面按钮 v-permission 标识一一对应。
// 这样在菜单管理里新增的菜单会自动出现；操作权限点可与按钮指令对应，RBAC 才完整。
// 目录/分组节点 id 统一用 m_<id> 保证全局唯一；操作权限点 id = `${模块}:${操作}`（如 user:add）。
interface PermNode {
  id: string
  label: string
  children?: PermNode[]
}

interface RawMenu {
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
}

// 各模块的「操作权限点」定义，必须与页面按钮 v-permission 标识一一对应。
// 未在此列出的模块（如 dashboard）默认只生成 view 权限点。
interface PermOp {
  key: string
  label: string
}
const MODULE_OPS: Record<string, PermOp[]> = {
  user: [
    { key: 'view', label: '查看' },
    { key: 'add', label: '新增' },
    { key: 'edit', label: '编辑' },
    { key: 'delete', label: '删除' },
    { key: 'export', label: '导出' },
  ],
  role: [
    { key: 'view', label: '查看' },
    { key: 'assign', label: '分配权限' },
  ],
  menu: [
    { key: 'view', label: '查看' },
    { key: 'add', label: '新增' },
    { key: 'edit', label: '编辑' },
    { key: 'delete', label: '删除' },
  ],
  dept: [
    { key: 'view', label: '查看' },
    { key: 'add', label: '新增' },
    { key: 'edit', label: '编辑' },
    { key: 'delete', label: '删除' },
  ],
  dict: [
    { key: 'view', label: '查看' },
    { key: 'add', label: '新增' },
    { key: 'edit', label: '编辑' },
    { key: 'delete', label: '删除' },
  ],
}

// 权限树：由菜单表动态生成。目录节点只做分组；叶子菜单扩展为「模块分组 + 操作权限点」。
function buildPermTree(list: RawMenu[]): PermNode[] {
  interface Tmp extends PermNode {
    raw: RawMenu
    children: Tmp[]
  }
  const map = new Map<number, Tmp>()
  list.forEach((m) => map.set(m.id, { id: String(m.id), label: m.title, children: [], raw: m }))
  const roots: Tmp[] = []
  map.forEach((node) => {
    const parent = node.raw.parentId ? map.get(node.raw.parentId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  })
  const toPerm = (n: Tmp): PermNode => {
    const raw = n.raw
    const isContainer = !raw.component || raw.component === 'Layout'
    if (isContainer) {
      // 目录/分组节点：仅 UI 分组，不挂权限点，id 用 m_<id> 保证全局唯一
      const node: PermNode = { id: `m_${raw.id}`, label: raw.title }
      if (n.children.length) node.children = n.children.map(toPerm)
      return node
    }
    // 叶子菜单 -> 模块分组节点，下挂操作权限点（至少包含 view）
    const base = raw.permission || `${raw.name}:view`
    const mod = base.split(':')[0]
    const ops = MODULE_OPS[mod] || [{ key: 'view', label: '查看' }]
    const children: PermNode[] = ops.map((op) => ({
      id: `${mod}:${op.key}`,
      label: op.label,
    }))
    return { id: `m_${raw.id}`, label: raw.title, children }
  }
  return roots.map(toPerm)
}

function getPermTree(): PermNode[] {
  // 菜单可能因新增/删除变化，每次重新生成（数据规模小，成本可忽略）
  return buildPermTree(menus as RawMenu[])
}

function ok(data: unknown): MockResult {
  return { status: 200, data: { code: 0, message: 'ok', data } }
}
function fail(message: string): MockResult {
  return { status: 200, data: { code: 1, message, data: null } }
}

const routes: Route[] = [
  {
    method: 'post',
    pattern: '/api/auth/login',
    handler: ({ body }) => {
      const { username, password } = (body as { username?: string; password?: string }) || {}
      if (!username || !password) return fail('请输入用户名和密码')
      if (password !== '123456') return fail('用户名或密码错误')
      const token = username === 'admin' ? 'mock-token-admin' : `mock-token-${username}`
      return ok({ token })
    },
  },
  {
    method: 'get',
    pattern: '/api/auth/userinfo',
    handler: ({ headers }) => {
      const h = headers || {}
      const auth = h.authorization || h.Authorization || ''
      // 从 token 还原 username：'mock-token-<username>'
      const m = auth.match(/mock-token-(.+)/)
      const username = m ? m[1] : (isAdmin(h) ? 'admin' : 'user')
      const u = users.find((x) => x.username === username) || users[0]
      const r = roles.find((x) => x.code === u.role)
      return ok({
        id: u.id,
        username: u.username,
        nickname: u.nickname,
        avatar: '',
        roles: [u.role],
        permissions: r ? r.permissions : [],
        dept: u.dept,
        email: u.email,
        phone: u.phone,
      })
    },
  },
  {
    method: 'post',
    pattern: '/api/auth/logout',
    handler: () => ok(null),
  },

  // 个人中心：获取当前用户完整信息（与 userinfo 同源，独立接口便于以后拆分后端）
  {
    method: 'get',
    pattern: '/api/user/profile',
    handler: ({ headers }) => {
      const h = headers || {}
      const auth = h.authorization || h.Authorization || ''
      const m = auth.match(/mock-token-(.+)/)
      const username = m ? m[1] : (isAdmin(h) ? 'admin' : 'user')
      const u = users.find((x) => x.username === username) || users[0]
      const r = roles.find((x) => x.code === u.role)
      return ok({
        id: u.id,
        username: u.username,
        nickname: u.nickname,
        avatar: '',
        roles: [u.role],
        permissions: r ? r.permissions : [],
        dept: u.dept,
        email: u.email,
        phone: u.phone,
      })
    },
  },
  // 个人中心：更新基本资料（昵称/邮箱/手机）
  {
    method: 'put',
    pattern: '/api/user/profile',
    handler: ({ body, headers }) => {
      const h = headers || {}
      const auth = h.authorization || h.Authorization || ''
      const m = auth.match(/mock-token-(.+)/)
      const username = m ? m[1] : (isAdmin(h) ? 'admin' : 'user')
      const u = users.find((x) => x.username === username)
      if (!u) return fail('用户不存在')
      const b = (body as Record<string, unknown>) || {}
      if (typeof b.nickname === 'string') u.nickname = b.nickname.trim()
      if (typeof b.email === 'string') u.email = b.email.trim()
      if (typeof b.phone === 'string') u.phone = b.phone.trim()
      saveUserOverride()
      const r = roles.find((x) => x.code === u.role)
      return ok({
        id: u.id,
        username: u.username,
        nickname: u.nickname,
        avatar: '',
        roles: [u.role],
        permissions: r ? r.permissions : [],
        dept: u.dept,
        email: u.email,
        phone: u.phone,
      })
    },
  },
  // 个人中心：修改密码（演示：原密码需为 123456，新密码至少 6 位）
  {
    method: 'put',
    pattern: '/api/user/password',
    handler: ({ body }) => {
      const b = (body as { oldPassword?: string; newPassword?: string }) || {}
      if (b.oldPassword !== '123456') return fail('原密码错误（演示密码为 123456）')
      if (!b.newPassword || b.newPassword.length < 6) return fail('新密码至少 6 位')
      return ok(null)
    },
  },

  // 用户管理（分页 + 搜索 + 增删改查）
  {
    method: 'get',
    pattern: '/api/system/user',
    handler: ({ params }) => {
      const p = (params as Record<string, unknown>) || {}
      const page = Number(p.page) || 1
      const pageSize = Number(p.pageSize) || 10
      const keyword = (p.keyword as string) || ''
      let list = [...users]
      if (keyword) list = list.filter((u) => u.username.includes(keyword) || u.nickname.includes(keyword))
      const total = list.length
      const start = (page - 1) * pageSize
      return ok({ list: list.slice(start, start + pageSize), total })
    },
  },
  {
    method: 'post',
    pattern: '/api/system/user',
    handler: ({ body }) => {
      const item = body as Record<string, unknown>
      const id = users.length ? Math.max(...users.map((u) => u.id)) + 1 : 1
      users.push({ id, ...(item as object) } as (typeof users)[number])
      return ok(null)
    },
  },
  {
    method: 'put',
    pattern: '/api/system/user/:id',
    handler: ({ body, params }) => {
      const id = Number((params as Record<string, string>).id)
      const idx = users.findIndex((u) => u.id === id)
      if (idx >= 0) users[idx] = { ...users[idx], ...(body as object) } as (typeof users)[number]
      return ok(null)
    },
  },
  {
    method: 'delete',
    pattern: '/api/system/user/:id',
    handler: ({ params }) => {
      const id = Number((params as Record<string, string>).id)
      const idx = users.findIndex((u) => u.id === id)
      if (idx >= 0) users.splice(idx, 1)
      return ok(null)
    },
  },

  // 角色管理
  {
    method: 'get',
    pattern: '/api/system/role',
    handler: () => ok({ list: [...roles], total: roles.length }),
  },
  // 权限树（由菜单表动态生成，新增菜单自动出现可分配的「查看」权限点）
  {
    method: 'get',
    pattern: '/api/system/permission/tree',
    handler: () => ok({ list: getPermTree() }),
  },
  // 分配角色权限
  {
    method: 'put',
    pattern: '/api/system/role/:id/permissions',
    handler: ({ body, params }) => {
      const id = Number((params as Record<string, string>).id)
      const idx = roles.findIndex((r) => r.id === id)
      const perms = ((body as { permissions?: string[] }) || {}).permissions || []
      if (idx >= 0) roles[idx] = { ...roles[idx], permissions: perms }
      // 持久化到 localStorage，模拟后端存储，刷新/切角色不丢
      saveRolePermOverride()
      return ok(null)
    },
  },
  // 菜单管理
  {
    method: 'get',
    pattern: '/api/system/menu',
    handler: () => ok({ list: [...menus], total: menus.length }),
  },
  {
    method: 'post',
    pattern: '/api/system/menu',
    handler: ({ body }) => {
      const d = (body as Record<string, unknown>) || {}
      const id = ++menuSeq
      const item = {
        id,
        parentId: (d.parentId as number) ?? 0,
        title: (d.title as string) || '',
        name: (d.name as string) || '',
        path: (d.path as string) || '',
        component: (d.component as string) || '',
        icon: (d.icon as string) || '',
        sort: (d.sort as number) ?? id,
        status: (d.status as number) ?? 1,
        permission: (d.permission as string) || `${(d.name as string) || ''}:view`,
      }
      menus.push(item)
      saveMenuOverride()
      return ok(item)
    },
  },
  {
    method: 'put',
    pattern: '/api/system/menu/:id',
    handler: ({ body, params }) => {
      const id = Number((params as Record<string, string>).id)
      const idx = menus.findIndex((m) => m.id === id)
      if (idx >= 0) menus[idx] = { ...menus[idx], ...(body as Record<string, unknown>) }
      saveMenuOverride()
      return ok(menus[idx])
    },
  },
  {
    method: 'delete',
    pattern: '/api/system/menu/:id',
    handler: ({ params }) => {
      const id = Number((params as Record<string, string>).id)
      // 同时删除其子菜单
      const removeIds = new Set<number>([id])
      let changed = true
      while (changed) {
        changed = false
        for (const m of menus) {
          if (m.parentId && removeIds.has(m.parentId) && !removeIds.has(m.id)) {
            removeIds.add(m.id)
            changed = true
          }
        }
      }
      for (let i = menus.length - 1; i >= 0; i--) {
        if (removeIds.has(menus[i].id)) menus.splice(i, 1)
      }
      saveMenuOverride()
      return ok(null)
    },
  },
  // 部门管理
  {
    method: 'get',
    pattern: '/api/system/dept',
    handler: () => ok({ list: [...depts], total: depts.length }),
  },
  {
    method: 'post',
    pattern: '/api/system/dept',
    handler: ({ body }) => {
      const d = (body as Record<string, unknown>) || {}
      const id = ++deptSeq
      const item = {
        id,
        name: (d.name as string) || '',
        leader: (d.leader as string) || '',
        sort: (d.sort as number) ?? id,
        status: (d.status as number) ?? 1,
        createTime: new Date().toISOString().slice(0, 10),
      }
      depts.push(item)
      saveDeptOverride()
      return ok(item)
    },
  },
  // 字典管理
  {
    method: 'get',
    pattern: '/api/system/dict',
    handler: () => ok({ list: [...dicts], total: dicts.length }),
  },
  {
    method: 'post',
    pattern: '/api/system/dict',
    handler: ({ body }) => {
      const d = (body as Record<string, unknown>) || {}
      const id = ++dictSeq
      const item = {
        id,
        name: (d.name as string) || '',
        type: (d.type as string) || '',
        status: (d.status as number) ?? 1,
        remark: (d.remark as string) || '',
      }
      dicts.push(item)
      saveDictOverride()
      return ok(item)
    },
  },
  {
    method: 'put',
    pattern: '/api/system/dict/:id',
    handler: ({ body, params }) => {
      const id = Number((params as Record<string, string>).id)
      const idx = dicts.findIndex((m) => m.id === id)
      if (idx >= 0) dicts[idx] = { ...dicts[idx], ...(body as Record<string, unknown>) }
      saveDictOverride()
      return ok(dicts[idx])
    },
  },
  {
    method: 'delete',
    pattern: '/api/system/dict/:id',
    handler: ({ params }) => {
      const id = Number((params as Record<string, string>).id)
      const idx = dicts.findIndex((m) => m.id === id)
      if (idx >= 0) dicts.splice(idx, 1)
      saveDictOverride()
      return ok(null)
    },
  },

  // 交付样板：电商订单（分页 + 搜索 + 状态筛选 + 汇总）
  {
    method: 'get',
    pattern: '/api/samples/ecommerce/orders',
    handler: ({ params }) => {
      const p = (params as Record<string, unknown>) || {}
      const page = Number(p.page) || 1
      const pageSize = Number(p.pageSize) || 10
      const keyword = (p.keyword as string) || ''
      const status = (p.status as string) || ''
      let list = [...orders]
      if (keyword) list = list.filter((o) => o.no.includes(keyword) || o.customer.includes(keyword))
      if (status) list = list.filter((o) => o.status === status)
      const total = list.length
      const start = (page - 1) * pageSize
      const summary = {
        total: orders.length,
        amount: Math.round(orders.reduce((s, o) => s + o.amount, 0) * 100) / 100,
        paid: orders.filter((o) => o.status === 'paid' || o.status === 'done').length,
        pending: orders.filter((o) => o.status === 'pending').length,
      }
      return ok({ list: list.slice(start, start + pageSize), total, summary })
    },
  },

  // 交付样板：CRM 线索（分页 + 搜索 + 阶段筛选 + 汇总）
  {
    method: 'get',
    pattern: '/api/samples/crm/leads',
    handler: ({ params }) => {
      const p = (params as Record<string, unknown>) || {}
      const page = Number(p.page) || 1
      const pageSize = Number(p.pageSize) || 10
      const keyword = (p.keyword as string) || ''
      const stage = (p.stage as string) || ''
      let list = [...leads]
      if (keyword) list = list.filter((l) => l.account.includes(keyword) || l.contact.includes(keyword))
      if (stage) list = list.filter((l) => l.stage === stage)
      const total = list.length
      const start = (page - 1) * pageSize
      const summary = {
        total: leads.length,
        value: Math.round(leads.reduce((s, l) => s + l.amount, 0) * 100) / 100,
        won: leads.filter((l) => l.stage === 'won').length,
        follow: leads.filter((l) => l.stage === 'lead' || l.stage === 'contact' || l.stage === 'proposal').length,
      }
      return ok({ list: list.slice(start, start + pageSize), total, summary })
    },
  },
]

function matchPattern(pattern: string, path: string): Record<string, string> | null {
  const pp = pattern.split('/').filter(Boolean)
  const ap = path.split('/').filter(Boolean)
  if (pp.length !== ap.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(':')) {
      params[pp[i].slice(1)] = decodeURIComponent(ap[i])
    } else if (pp[i] !== ap[i]) {
      return null
    }
  }
  return params
}

// 浏览器端 mock 派发：返回 true 表示已拦截（由调用方构造响应），false 表示不拦截
export function dispatchMock(req: MockRequest): MockResult | null {
  const path = req.url.replace(/^.*\/api/, '/api')
  for (const r of routes) {
    if (r.method.toLowerCase() !== req.method.toLowerCase()) continue
    const params = matchPattern(r.pattern, path)
    if (params === null) continue
    return r.handler({ ...req, params: { ...(req.params || {}), ...params } })
  }
  return null
}
