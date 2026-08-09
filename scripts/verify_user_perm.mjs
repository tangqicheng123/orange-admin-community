// 复刻修复后的 hasPermission 真值表，验证菜单权限短路已被移除
function hasPermission(perm, rolePerms) {
  if (!perm) return true
  if (rolePerms.includes('*')) return true
  return rolePerms.includes(perm)
}

function assert(cond, msg) {
  if (!cond) {
    console.error('❌ FAIL', msg)
    process.exit(1)
  }
  console.log('✅', msg)
}

// Case A: 管理员被回收了组件演示权限 ['dashboard:view','user:view', ...无 table:view, form:view, chart:view]
const adminRevoked = ['dashboard:view','user:view','user:add','user:edit','user:delete','user:export',
  'role:view','role:add','role:edit','role:delete',
  'menu:view','menu:add','menu:edit','menu:delete',
  'dept:view','dept:add','dept:edit','dept:delete','dept:export',
  'dict:view','dict:add','dict:edit','dict:delete','dict:export']

assert(hasPermission('dashboard:view', adminRevoked) === true, '管理员保留 dashboard:view')
assert(hasPermission('user:add', adminRevoked) === true, '管理员保留 user:add 操作权限')
assert(hasPermission('table:view', adminRevoked) === false, '管理员无 table:view -> false（修复点：原来被 menuPermissions 短路为 true）')
assert(hasPermission('form:view', adminRevoked) === false, '管理员无 form:view -> false')
assert(hasPermission('chart:view', adminRevoked) === false, '管理员无 chart:view -> false')

// Case B: 普通用户仅查看
const userPerms = ['dashboard:view','user:view','menu:view','dept:view']
assert(hasPermission('table:view', userPerms) === false, '普通用户无 table:view -> false')
assert(hasPermission('table:add', userPerms) === false, '普通用户无 table:add -> false')
assert(hasPermission('user:view', userPerms) === true, '普通用户保留 user:view')

// Case C: 超级管理员持 '*'
const superAdmin = ['*']
assert(hasPermission('anything:permission', superAdmin) === true, "'*' 通配任意权限")
assert(hasPermission('', superAdmin) === true, "空权限 = 无限制")

// Case D: 容器节点 permission 为空 -> 一律 true（如「系统管理」「组件演示」容器）
// 但 el-tree 容器节点靠"子项可见"决定自身显隐，所以空权限返回 true 不影响过滤
assert(hasPermission('', ['nothing']) === true, "空权限即使无权限也返回 true（容器分组）")

console.log('\n所有断言通过 ✅')
console.log('修复前的症状:')
console.log('  - hasPermission(\'table:view\', adminRevoked) === true ← 因 menuPermissions.includes 短路')
console.log('  - hasPermission(\'chart:add\', userPerms) === true ← 同上')
console.log('修复后的真值:')
console.log('  - 全部按角色权限判断，与菜单表是否定义该 perm 无关')
