<template>
  <el-card shadow="never" :header="t('dict.title')">
    <div class="toolbar">
      <el-button
        v-permission="'dict:add'"
        type="primary"
        :icon="'Plus'"
        @click="openCreate"
      >
        {{ t('dict.addDict') }}
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
      :data="list"
      v-loading="loading"
      border
      stripe
      style="width: 100%; margin-top: 16px"
    >
      <el-table-column prop="id" :label="t('dict.colId')" width="70" />
      <el-table-column prop="name" :label="t('dict.colName')" min-width="140" />
      <el-table-column prop="type" :label="t('dict.colType')" min-width="140" />
      <el-table-column prop="remark" :label="t('dict.colRemark')" min-width="180" show-overflow-tooltip />
      <el-table-column prop="status" :label="t('dict.colStatus')" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
            {{ row.status === 1 ? t('common.enable') : t('common.inactive') }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column :label="t('dict.colAction')" width="150" align="center">
        <template #default="{ row }">
          <el-button
            v-permission="'dict:edit'"
            link
            type="primary"
            :icon="'Edit'"
            @click="openEdit(row as DictRow)"
          >
            {{ t('menuMgmt.edit') }}
          </el-button>
          <el-button
            v-permission="'dict:delete'"
            link
            type="danger"
            :icon="'Delete'"
            @click="remove(row as DictRow)"
          >
            {{ t('menuMgmt.delete') }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'create' ? t('dict.addDictTitle') : t('dict.editDictTitle')"
      width="520px"
      append-to-body
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item :label="t('dict.nameLabel')" prop="name">
          <el-input v-model="form.name" :placeholder="t('dict.namePh')" />
        </el-form-item>
        <el-form-item :label="t('dict.typeLabel')" prop="type">
          <el-input v-model="form.type" :placeholder="t('dict.typePh')" />
        </el-form-item>
        <el-form-item :label="t('dict.remarkLabel')" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="2" :placeholder="t('dict.remarkPh')" />
        </el-form-item>
        <el-form-item :label="t('dict.statusLabel')" prop="status">
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

interface DictRow {
  id: number
  name: string
  type: string
  status: number
  remark: string
}

const { t } = useI18n()

const loading = ref(false)
const list = ref<DictRow[]>([])

async function loadData() {
  loading.value = true
  try {
    const res = await get<{ list: DictRow[]; total: number }>('/system/dict')
    list.value = res.list
  } finally {
    loading.value = false
  }
}

// ---------- 弹窗 ----------
const dialogVisible = ref(false)
const dialogType = ref<'create' | 'edit'>('create')
const saving = ref(false)
const formRef = ref<FormInstance | null>(null)
const editingId = ref<number | null>(null)

const form = reactive({
  name: '',
  type: '',
  remark: '',
  status: 1,
})

const rules: FormRules = {
  name: [{ required: true, message: () => t('dict.pleaseInputName'), trigger: 'blur' }],
  type: [{ required: true, message: () => t('dict.pleaseInputType'), trigger: 'blur' }],
}

function resetForm() {
  form.name = ''
  form.type = ''
  form.remark = ''
  form.status = 1
  editingId.value = null
  formRef.value?.clearValidate()
}

function openCreate() {
  dialogType.value = 'create'
  resetForm()
  dialogVisible.value = true
}

function openEdit(row: DictRow) {
  dialogType.value = 'edit'
  editingId.value = row.id
  form.name = row.name
  form.type = row.type
  form.remark = row.remark
  form.status = row.status
  formRef.value?.clearValidate()
  dialogVisible.value = true
}

async function submit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    saving.value = true
    try {
      if (dialogType.value === 'create') {
        await post('/system/dict', { ...form })
        ElMessage.success(t('user.addSuccess'))
      } else {
        await put(`/system/dict/${editingId.value}`, { ...form })
        ElMessage.success(t('user.editSuccess'))
      }
      dialogVisible.value = false
      await loadData()
    } finally {
      saving.value = false
    }
  })
}

async function remove(row: DictRow) {
  try {
    await ElMessageBox.confirm(t('dict.deleteConfirm', { name: row.name }), t('common.tip'), { type: 'warning' })
  } catch {
    return
  }
  await del(`/system/dict/${row.id}`)
  ElMessage.success(t('user.deleteSuccess'))
  await loadData()
}

// 恢复默认字典：清空 localStorage 覆盖，回到初始字典
async function resetDefault() {
  try {
    await ElMessageBox.confirm(t('dict.confirmReset'), t('common.tip'), { type: 'warning' })
  } catch {
    return
  }
  localStorage.removeItem('orange-admin-dicts')
  ElMessage.success(t('common.resetDone'))
  await loadData()
}

onMounted(loadData)
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}
</style>