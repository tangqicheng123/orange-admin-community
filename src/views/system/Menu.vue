<template>
  <el-card shadow="never" :header="t('menuMgmt.title')">
    <div class="toolbar">
      <el-button
        v-permission="'menu:add'"
        type="primary"
        :icon="'Plus'"
        @click="openCreate"
      >
        {{ t('menuMgmt.addMenu') }}
      </el-button>
      <el-button
        type="warning"
        plain
        :icon="'RefreshLeft'"
        @click="resetDefault"
      >
        {{ t('common.resetDefault') }}
      </el-button>
    </div>

    <el-table
      :data="tree"
      v-loading="loading"
      border
      stripe
      row-key="id"
      :tree-props="{ children: 'children' }"
      style="width: 100%; margin-top: 16px"
    >
      <el-table-column prop="title" :label="t('menuMgmt.colTitle')" min-width="160" />
      <el-table-column prop="name" :label="t('menuMgmt.colName')" min-width="120" />
      <el-table-column prop="path" :label="t('menuMgmt.colPath')" min-width="160" show-overflow-tooltip />
      <el-table-column prop="component" :label="t('menuMgmt.colComponent')" min-width="160" show-overflow-tooltip />
      <el-table-column prop="icon" :label="t('menuMgmt.colIcon')" width="100" />
      <el-table-column prop="sort" :label="t('menuMgmt.colSort')" width="70" align="center" />
      <el-table-column prop="status" :label="t('menuMgmt.colStatus')" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
            {{ row.status === 1 ? t('common.enable') : t('common.inactive') }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column :label="t('menuMgmt.colAction')" width="150" align="center">
        <template #default="{ row }">
          <el-button
            v-permission="'menu:edit'"
            link
            type="primary"
            :icon="'Edit'"
            @click="openEdit(row as MenuRow)"
          >
            {{ t('menuMgmt.edit') }}
          </el-button>
          <el-button
            v-permission="'menu:delete'"
            link
            type="danger"
            :icon="'Delete'"
            @click="remove(row as MenuRow)"
          >
            {{ t('menuMgmt.delete') }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'create' ? t('menuMgmt.addMenuTitle') : t('menuMgmt.editMenuTitle')"
      width="560px"
      append-to-body
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item :label="t('menuMgmt.parentLabel')" prop="parentId">
          <el-tree-select
            v-model="form.parentId"
            :data="parentOptions"
            check-strictly
            :render-after-expand="false"
            default-expand-all
            node-key="id"
            :props="{ label: 'title', value: 'id', children: 'children' } as Record<string, string>"
            :placeholder="t('menuMgmt.parentPh')"
            clearable
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item :label="t('menuMgmt.titleLabel')" prop="title">
          <el-input v-model="form.title" :placeholder="t('menuMgmt.titlePh')" />
        </el-form-item>
        <el-form-item :label="t('menuMgmt.nameLabel')" prop="name">
          <el-input v-model="form.name" :placeholder="t('menuMgmt.namePh')" />
        </el-form-item>
        <el-form-item :label="t('menuMgmt.pathLabel')" prop="path">
          <el-input v-model="form.path" :placeholder="t('menuMgmt.pathPh')" />
        </el-form-item>
        <el-form-item :label="t('menuMgmt.componentLabel')" prop="component">
          <el-input v-model="form.component" :placeholder="t('menuMgmt.componentPh')" />
        </el-form-item>
        <el-form-item :label="t('menuMgmt.permLabel')" prop="permission">
          <el-input v-model="form.permission" :placeholder="t('menuMgmt.permPh')" />
        </el-form-item>
        <el-form-item :label="t('menuMgmt.iconLabel')" prop="icon">
          <el-input v-model="form.icon" :placeholder="t('menuMgmt.iconPh')" />
        </el-form-item>
        <el-form-item :label="t('menuMgmt.sortLabel')" prop="sort">
          <el-input-number v-model="form.sort" :min="0" controls-position="right" />
        </el-form-item>
        <el-form-item :label="t('menuMgmt.statusLabel')" prop="status">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" inline-prompt :active-text="t('common.enable')" :inactive-text="t('common.inactive')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="saving" @click="submit">{{ t('common.confirm') }}</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { get, post, put, del } from '@/utils/request'
import { useMenuStore } from '@/store/menu'

const { t } = useI18n()
const menuStore = useMenuStore()

interface MenuRow {
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
  children?: MenuRow[]
}

const loading = ref(false)
const tree = ref<MenuRow[]>([])
const flat = ref<MenuRow[]>([])

async function loadData() {
  loading.value = true
  try {
    const res = await get<{ list: MenuRow[]; total: number }>('/system/menu')
    flat.value = res.list
    tree.value = buildTree(res.list)
  } finally {
    loading.value = false
  }
}

// 扁平菜单按 parentId 组装为树；parentId 为 0 或父不存在者当作一级
function buildTree(list: MenuRow[]): MenuRow[] {
  const map = new Map<number, MenuRow>()
  list.forEach((m) => map.set(m.id, { ...m, children: [] }))
  const roots: MenuRow[] = []
  map.forEach((node) => {
    const parent = node.parentId ? map.get(node.parentId) : undefined
    if (parent) parent.children!.push(node)
    else roots.push(node)
  })
  return roots
}

// 父菜单下拉：仅允许选「目录/菜单」作为上级，删除当前节点自身及其子树避免循环
const parentOptions = ref<MenuRow[]>([])
function buildParentOptions(editingId?: number) {
  const filtered = editingId
    ? flat.value.filter((m) => m.id !== editingId && !isDescendant(m.id, editingId))
    : flat.value
  parentOptions.value = buildTree(filtered)
}
function isDescendant(candidateId: number, ancestorId: number): boolean {
  const children = flat.value.find((m) => m.id === ancestorId)?.children
  if (!children) return false
  return children.some((c) => c.id === candidateId || isDescendant(candidateId, c.id))
}

// ---------- 弹窗 ----------
const dialogVisible = ref(false)
const dialogType = ref<'create' | 'edit'>('create')
const saving = ref(false)
const formRef = ref<FormInstance | null>(null)
const editingId = ref<number | null>(null)

const form = reactive({
  parentId: 0,
  title: '',
  name: '',
  path: '',
  component: '',
  permission: '',
  icon: '',
  sort: 0,
  status: 1,
})

const rules: FormRules = {
  title: [{ required: true, message: () => t('menuMgmt.pleaseInputTitle'), trigger: 'blur' }],
  name: [{ required: true, message: () => t('menuMgmt.pleaseInputName'), trigger: 'blur' }],
  component: [
    {
      // 叶子菜单（有父级或自身非容器）必须绑定组件；顶级目录可留空
      validator: (_rule, _value, callback) => {
        const isTopDir = form.parentId === 0 && !form.component
        if (isTopDir) return callback()
        if (!form.component) return callback(new Error(t('menuMgmt.componentRequired')))
        return callback()
      },
      trigger: 'blur',
    },
  ],
}

function resetForm() {
  form.parentId = 0
  form.title = ''
  form.name = ''
  form.path = ''
  form.component = ''
  form.permission = ''
  form.icon = ''
  form.sort = 0
  form.status = 1
  editingId.value = null
  formRef.value?.clearValidate()
}

function openCreate() {
  dialogType.value = 'create'
  resetForm()
  buildParentOptions()
  dialogVisible.value = true
}

function openEdit(row: MenuRow) {
  dialogType.value = 'edit'
  editingId.value = row.id
  form.parentId = row.parentId ?? 0
  form.title = row.title
  form.name = row.name
  form.path = row.path
  form.component = row.component
  form.permission = row.permission || ''
  form.icon = row.icon
  form.sort = row.sort
  form.status = row.status
  formRef.value?.clearValidate()
  buildParentOptions(row.id)
  dialogVisible.value = true
}

async function submit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    saving.value = true
    try {
      if (dialogType.value === 'create') {
        await post('/system/menu', { ...form })
        ElMessage.success(t('user.addSuccess'))
      } else {
        await put(`/system/menu/${editingId.value}`, { ...form })
        ElMessage.success(t('user.editSuccess'))
      }
      dialogVisible.value = false
      await loadData()
      // 菜单变动：触发动态路由 + 侧边栏重注入（新增/编辑后立即可见）
      await menuStore.refresh()
    } finally {
      saving.value = false
    }
  })
}

async function remove(row: MenuRow) {
  try {
    await ElMessageBox.confirm(
      t('menuMgmt.deleteConfirm', { name: row.title }),
      t('common.tip'),
      { type: 'warning' },
    )
  } catch {
    return
  }
  await del(`/system/menu/${row.id}`)
  ElMessage.success(t('user.deleteSuccess'))
  await loadData()
  // 菜单变动：触发动态路由 + 侧边栏重注入（删除后侧边栏同步移除）
  await menuStore.refresh()
}

// 恢复默认菜单：清空 localStorage 覆盖，回到系统初始菜单，并触发路由重注入
async function resetDefault() {
  try {
    await ElMessageBox.confirm(
      t('menuMgmt.confirmReset'),
      t('common.tip'),
      { type: 'warning' },
    )
  } catch {
    return
  }
  localStorage.removeItem('orange-admin-menus')
  ElMessage.success(t('common.resetDone'))
  await loadData()
  await menuStore.refresh()
}

onMounted(loadData)
</script>