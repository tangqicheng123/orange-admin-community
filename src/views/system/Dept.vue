<template>
  <el-card shadow="never" :header="t('dept.title')">
    <el-alert
      type="success"
      :closable="false"
      show-icon
      :title="t('dept.alertTitle')"
      :description="t('dept.alertDesc')"
    />

    <div class="toolbar">
      <el-button type="primary" v-permission="'dept:add'" :icon="'Plus'" @click="openAdd">{{ t('dept.addDept') }}</el-button>
      <el-button type="warning" plain :icon="'RefreshLeft'" @click="resetDefault">{{ t('common.resetDefault') }}</el-button>
    </div>

    <el-table :data="list" v-loading="loading" border stripe style="width: 100%; margin-top: 16px">
      <el-table-column prop="id" :label="t('dept.colId')" width="70" />
      <el-table-column prop="name" :label="t('dept.colName')" min-width="140" />
      <el-table-column prop="leader" :label="t('dept.colLeader')" width="120" />
      <el-table-column prop="sort" :label="t('dept.colSort')" width="80" align="center" />
      <el-table-column prop="status" :label="t('dept.colStatus')" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">{{ row.status === 1 ? t('common.enable') : t('common.inactive') }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createTime" :label="t('dept.colCreatedAt')" width="140" />
    </el-table>

    <el-dialog v-model="dialogVisible" :title="t('dept.addDeptTitle')" width="480px" @closed="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item :label="t('dept.nameLabel')" prop="name">
          <el-input v-model="form.name" :placeholder="t('dept.namePh')" />
        </el-form-item>
        <el-form-item :label="t('dept.leaderLabel')" prop="leader">
          <el-input v-model="form.leader" :placeholder="t('dept.leaderPh')" />
        </el-form-item>
        <el-form-item :label="t('dept.sortLabel')" prop="sort">
          <el-input-number v-model="form.sort" :min="0" :max="999" />
        </el-form-item>
        <el-form-item :label="t('dept.statusLabel')" prop="status">
          <el-switch
            v-model="form.status"
            :active-value="1"
            :inactive-value="0"
            :active-text="t('common.enable')"
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
import { onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { get, post } from '@/utils/request'

interface DeptRow {
  id: number
  name: string
  leader: string
  sort: number
  status: number
  createTime: string
}

const { t } = useI18n()

const loading = ref(false)
const list = ref<DeptRow[]>([])

async function loadData() {
  loading.value = true
  try {
    const res = await get<{ list: DeptRow[]; total: number }>('/system/dept')
    list.value = res.list
  } finally {
    loading.value = false
  }
}

// ---------- 新增部门 ----------
const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const form = reactive({ name: '', leader: '', sort: 1, status: 1 })
const rules: FormRules = {
  name: [{ required: true, message: () => t('dept.pleaseInputName'), trigger: 'blur' }],
}
function openAdd() {
  dialogVisible.value = true
}
function resetForm() {
  formRef.value?.resetFields()
  form.name = ''
  form.leader = ''
  form.sort = 1
  form.status = 1
}
async function submit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    await post('/system/dept', { ...form })
    ElMessage.success(t('dept.addSuccess'))
    dialogVisible.value = false
    loadData()
  })
}

// 恢复默认部门：清空 localStorage 覆盖，回到初始部门
async function resetDefault() {
  try {
    await ElMessageBox.confirm(t('dept.confirmReset'), t('common.tip'), { type: 'warning' })
  } catch {
    return
  }
  localStorage.removeItem('orange-admin-depts')
  ElMessage.success(t('common.resetDone'))
  await loadData()
}

onMounted(loadData)
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 16px 0;
}
</style>