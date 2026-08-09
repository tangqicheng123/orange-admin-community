<template>
  <el-card shadow="never" :header="t('user.title')">
    <el-alert
      type="success"
      :closable="false"
      show-icon
      :title="t('user.alertTitle', { role: currentRoleLabel })"
      :description="t('user.alertDesc')"
    />

    <!-- 搜索栏 -->
    <div class="toolbar">
      <el-input
        v-model="query.keyword"
        :placeholder="t('user.keywordPh')"
        clearable
        style="width: 200px"
        @keyup.enter="loadData"
      />
      <el-select v-model="query.status" :placeholder="t('user.statusPh')" clearable style="width: 120px">
        <el-option :label="t('common.active')" :value="1" />
        <el-option :label="t('common.inactive')" :value="0" />
      </el-select>
      <el-button type="primary" :icon="'Search'" @click="loadData">{{ t('common.search') }}</el-button>
      <el-button :icon="'Refresh'" @click="resetQuery">{{ t('common.reset') }}</el-button>
      <span class="spacer" />
      <el-button type="primary" v-permission="'user:add'" :icon="'Plus'" @click="openAdd">{{ t('common.add') }}</el-button>
      <el-button v-permission="'user:export'" :icon="'Download'" @click="onExport">{{ t('common.export') }}</el-button>
    </div>

    <!-- 表格 -->
    <el-table :data="tableData" v-loading="loading" border stripe style="width: 100%">
      <el-table-column prop="id" :label="t('user.colId')" width="70" />
      <el-table-column prop="username" :label="t('user.colUsername')" min-width="120" />
      <el-table-column prop="nickname" :label="t('user.colNickname')" min-width="120" />
      <el-table-column prop="dept" :label="t('user.colDept')" width="110" />
      <el-table-column prop="email" :label="t('user.colEmail')" min-width="180" show-overflow-tooltip />
      <el-table-column prop="phone" :label="t('user.colPhone')" width="130" />
      <el-table-column prop="status" :label="t('user.colStatus')" width="90" align="center">
        <template #default="{ row }">
          <el-switch
            v-model="row.status"
            :active-value="1"
            :inactive-value="0"
            v-permission="'user:edit'"
            @change="(val: string | number | boolean) => toggleStatus(row as UserRow, val as number)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('user.colAction')" width="150" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" size="small" v-permission="'user:edit'" :icon="'Edit'" @click="openEdit(row as UserRow)">{{ t('common.edit') }}</el-button>
          <el-button link type="danger" size="small" v-permission="'user:delete'" :icon="'Delete'" @click="onDelete(row as UserRow)">{{ t('common.delete') }}</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @current-change="loadData"
        @size-change="loadData"
      />
    </div>

    <!-- 新增 / 编辑 弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogType === 'add' ? t('user.addUserTitle') : t('user.editUserTitle')" width="520px" @closed="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item :label="t('user.colUsername')" prop="username">
          <el-input v-model="form.username" :disabled="dialogType === 'edit'" :placeholder="t('user.usernamePh')" />
        </el-form-item>
        <el-form-item :label="t('user.colNickname')" prop="nickname">
          <el-input v-model="form.nickname" :placeholder="t('user.nicknamePh')" />
        </el-form-item>
        <el-form-item :label="t('user.colDept')" prop="dept">
          <el-select v-model="form.dept" :placeholder="t('user.deptPh')" filterable style="width: 100%">
            <el-option v-for="d in deptOptions" :key="d.id" :label="d.name" :value="d.name" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('user.colEmail')" prop="email">
          <el-input v-model="form.email" :placeholder="t('user.emailPh')" />
        </el-form-item>
        <el-form-item :label="t('user.colPhone')" prop="phone">
          <el-input v-model="form.phone" :placeholder="t('user.phonePh')" />
        </el-form-item>
        <el-form-item :label="t('user.colStatus')" prop="status">
          <!-- 用 el-switch 替代 el-radio-group，避免 ElRadio 不能作为 ElFormItem 子节点的告警；语义也更贴合状态开关 -->
          <el-switch
            v-model="form.status"
            :active-value="1"
            :inactive-value="0"
            :active-text="t('common.active')"
            :inactive-text="t('common.inactive')"
            inline-prompt
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="submit">{{ t('common.confirm') }}</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { get, post, put, del } from '@/utils/request'
import { useUserStore } from '@/store/user'

interface UserRow {
  id: number
  username: string
  nickname: string
  dept: string
  email: string
  phone: string
  status: number
}

const { t } = useI18n()
const userStore = useUserStore()
const currentRoleLabel = computed(() => {
  const r = userStore.roles[0]
  if (r === 'admin') return t('common.roleAdmin')
  if (r === 'user') return t('common.roleUser')
  return r || t('common.unknown')
})

const loading = ref(false)
const tableData = ref<UserRow[]>([])
const total = ref(0)
const query = reactive({ keyword: '', status: '' as number | '', page: 1, pageSize: 10 })

// 部门下拉选项（来自部门管理真实数据）
const deptOptions = ref<{ id: number; name: string }[]>([])
async function loadDeptOptions() {
  const res = await get<{ list: { id: number; name: string }[] }>('/system/dept')
  deptOptions.value = res.list
}

async function loadData() {
  loading.value = true
  try {
    const res = await get<{ list: UserRow[]; total: number }>('/system/user', { ...query })
    tableData.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function resetQuery() {
  query.keyword = ''
  query.status = ''
  query.page = 1
  loadData()
}

// ---------- 新增 / 编辑 ----------
const dialogVisible = ref(false)
const dialogType = ref<'add' | 'edit'>('add')
const formRef = ref<FormInstance>()
const form = reactive<UserRow>({
  id: 0,
  username: '',
  nickname: '',
  dept: '',
  email: '',
  phone: '',
  status: 1,
})

const rules: FormRules = {
  username: [{ required: true, message: () => t('user.pleaseInputUsername'), trigger: 'blur' }],
  nickname: [{ required: true, message: () => t('user.pleaseInputNickname'), trigger: 'blur' }],
  email: [{ type: 'email', message: () => t('component.emailFormat'), trigger: 'blur' }],
  phone: [
    { pattern: /^1\d{10}$/, message: () => t('user.phoneFormat'), trigger: 'blur' },
  ],
}

function openAdd() {
  dialogType.value = 'add'
  dialogVisible.value = true
}
function openEdit(row: UserRow) {
  dialogType.value = 'edit'
  Object.assign(form, row)
  dialogVisible.value = true
}
function resetForm() {
  formRef.value?.resetFields()
  form.id = 0
  form.username = ''
  form.nickname = ''
  form.dept = ''
  form.email = ''
  form.phone = ''
  form.status = 1
}

async function submit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    if (dialogType.value === 'add') {
      await post('/system/user', { ...form })
      ElMessage.success(t('user.addSuccess'))
    } else {
      await put(`/system/user/${form.id}`, { ...form })
      ElMessage.success(t('user.editSuccess'))
    }
    dialogVisible.value = false
    loadData()
  })
}

// ---------- 删除 / 状态切换 ----------
async function onDelete(row: UserRow) {
  await ElMessageBox.confirm(t('user.deleteConfirm', { name: row.username }), t('common.tip'), {
    type: 'warning',
  })
  await del(`/system/user/${row.id}`)
  ElMessage.success(t('user.deleteSuccess'))
  loadData()
}

async function toggleStatus(row: UserRow, val: number) {
  await put(`/system/user/${row.id}`, { ...row, status: val })
  ElMessage.success(t('user.statusUpdated'))
}

function onExport() {
  ElMessage.info(t('common.exportDemo'))
}

onMounted(() => {
  loadData()
  loadDeptOptions()
})
</script>

<style scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin: 16px 0;
}
.toolbar .spacer {
  flex: 1;
}
.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>