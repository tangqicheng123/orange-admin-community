<template>
  <el-card shadow="never" :header="t('role.title')">
    <div style="margin-bottom: 12px">
      <el-button type="warning" plain :icon="'RefreshLeft'" @click="resetDefault">{{ t('common.resetDefault') }}</el-button>
    </div>
    <el-table :data="list" v-loading="loading" border stripe style="width: 100%">
      <el-table-column prop="id" :label="t('role.colId')" width="70" />
      <el-table-column prop="name" :label="t('role.colName')" min-width="120" />
      <el-table-column prop="code" :label="t('role.colCode')" min-width="120" />
      <el-table-column prop="remark" :label="t('role.colRemark')" min-width="160" show-overflow-tooltip />
      <el-table-column prop="createTime" :label="t('role.colCreatedAt')" width="140" />
      <el-table-column :label="t('role.colPermScope')" min-width="200">
        <template #default="{ row }">
          <el-tag v-if="row.permissions.includes('*')" type="danger" size="small">{{ t('common.allPermissions') }}</el-tag>
          <el-tag v-else v-for="p in row.permissions" :key="p" size="small" style="margin-right: 4px">{{ p }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column :label="t('role.colAction')" width="120" fixed="right">
        <template #default="{ row }">
          <el-button
            v-permission="'role:assign'"
            type="primary"
            link
            :icon="'Setting'"
            @click="openPermDialog(row as RoleRow)"
          >{{ t('role.assignPerm') }}</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 权限分配弹窗 -->
    <el-dialog v-model="permDialog" :title="currentRole ? t('role.permDialogTitle', { name: currentRole.name }) : ''" width="460px" @closed="treeRef?.setCheckedKeys([])">
      <el-tree
        ref="treeRef"
        :data="permTree"
        :props="{ label: 'label', children: 'children' }"
        node-key="id"
        show-checkbox
        default-expand-all
      />
      <template #footer>
        <el-button @click="permDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="saving" @click="savePerm">{{ t('common.confirm') }}</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { get, put } from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/store/user'

interface RoleRow {
  id: number
  name: string
  code: string
  permissions: string[]
  remark: string
  createTime: string
}

interface PermNode {
  id: string
  label: string
  children?: PermNode[]
}

const { t } = useI18n()

const loading = ref(false)
const list = ref<RoleRow[]>([])
const permTree = ref<PermNode[]>([])

const permDialog = ref(false)
const saving = ref(false)
const currentRole = ref<RoleRow | null>(null)
const treeRef = ref<{ setCheckedKeys: (keys: string[]) => void; getCheckedKeys: () => string[]; getHalfCheckedKeys: () => string[] } | null>(null)

// 所有「父节点」id 集合（有 children 的节点）。父节点仅用于 UI 分组，
// 绝不持久化，否则下次 setCheckedKeys 给父节点会递归勾选其全部子节点 -> 看起来"自动全选"。
const parentIds = ref<Set<string>>(new Set())
function collectParentIds(nodes: PermNode[]) {
  for (const n of nodes) {
    if (n.children && n.children.length) {
      parentIds.value.add(n.id)
      collectParentIds(n.children)
    }
  }
}

// 收集权限树中所有「叶子」节点 id（用于「*」时全选）
function collectAllLeafKeys(nodes: PermNode[], acc: string[] = []): string[] {
  for (const n of nodes) {
    if (n.children && n.children.length) collectAllLeafKeys(n.children, acc)
    else acc.push(n.id)
  }
  return acc
}

// 只保留叶子权限（剔除父节点）
function toLeafKeys(ids: string[]): string[] {
  return ids.filter((id) => !parentIds.value.has(id))
}

async function openPermDialog(row: RoleRow) {
  currentRole.value = row
  permDialog.value = true
  // 每次打开都重新拉取权限树：菜单管理里新增/删除菜单后，权限树必须同步刷新，
  // 否则新菜单不会出现在分配树中（旧逻辑只在首次为空时拉取，导致缓存过期）。
  const res = await get<{ list: PermNode[] }>('/system/permission/tree')
  permTree.value = res.list
  // 重置父节点集合，避免菜单增减后残留旧的父节点 id（影响 toLeafKeys 过滤）
  parentIds.value = new Set()
  collectParentIds(permTree.value)
  // 「*」代表全部权限 -> 勾选全部叶子；否则按已保存的权限（只取叶子）勾选
  const checked = row.permissions.includes('*')
    ? collectAllLeafKeys(permTree.value)
    : toLeafKeys(row.permissions)
  await nextTick()
  treeRef.value?.setCheckedKeys(checked)
}

async function savePerm() {
  if (!currentRole.value) return
  saving.value = true
  try {
    const allLeaf = collectAllLeafKeys(permTree.value)
    // 只保存叶子节点（剔除父节点与半选父），避免父节点被持久化后下次递归全勾
    const keys = toLeafKeys(treeRef.value?.getCheckedKeys() || [])
    // 若勾选了全部操作权限 -> 等价于「*」全部权限，存 ['*'] 而非拍平的叶子集合，
    // 否则超级管理员一旦被编辑就会丢失 '*' 通配，导致所有操作按钮消失。
    const isAll = allLeaf.length > 0 && keys.length === allLeaf.length
    const finalPerms = isAll ? ['*'] : keys
    await put(`/system/role/${currentRole.value.id}/permissions`, { permissions: finalPerms })
    // 同步本地列表展示
    currentRole.value.permissions = finalPerms
    // 即时同步当前登录用户：若被编辑的角色就是当前用户拥有的角色之一，
    // 立即更新 userStore.permissions，让侧边栏/按钮/路由守卫马上按新权限过滤（无需刷新）。
    const userStore = useUserStore()
    const info = userStore.userInfo
    if (info && info.roles.includes(currentRole.value.code)) {
      info.permissions = finalPerms
    }
    ElMessage.success(t('role.permAssigned'))
    permDialog.value = false
  } finally {
    saving.value = false
  }
}

async function loadData() {
  loading.value = true
  try {
    const res = await get<{ list: RoleRow[]; total: number }>('/system/role')
    list.value = res.list
  } finally {
    loading.value = false
  }
}

// 恢复默认角色：清空 localStorage 覆盖（含权限分配），回到初始角色
async function resetDefault() {
  try {
    await ElMessageBox.confirm(t('role.confirmReset'), t('common.tip'), { type: 'warning' })
  } catch {
    return
  }
  localStorage.removeItem('orange-admin-roles')
  // 关键：一并清空角色权限覆盖，否则超级管理员被污染成非 '*' 时点了也救不回
  localStorage.removeItem('orange-admin-role-perms')
  ElMessage.success(t('common.resetDone'))
  // 清了 localStorage 后需重新加载模块才能让 roles 回到种子值（含超级管理员 '*'）
  setTimeout(() => location.reload(), 600)
}

onMounted(loadData)
</script>