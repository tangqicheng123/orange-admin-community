<template>
  <el-card shadow="never" :header="t('component.formTitle')">
    <el-alert
      class="mb"
      type="success"
      :closable="false"
      :title="t('component.formAbility')"
      :description="t('component.formAbilityDesc')"
    />

    <el-form ref="formRef" :model="form" :rules="rules" label-width="92px" class="form" status-icon>
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12">
          <el-form-item :label="t('component.formUsername')" prop="username">
            <el-input v-model="form.username" :placeholder="t('component.formUsernamePh')" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="t('component.formEmail')" prop="email">
            <el-input v-model="form.email" :placeholder="t('component.formEmailPh')" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="t('component.formRole')" prop="role">
            <el-select v-model="form.role" :placeholder="t('component.formRolePh')" style="width: 100%">
              <el-option :label="t('component.roleAdmin')" value="admin" />
              <el-option :label="t('component.roleEditor')" value="editor" />
              <el-option :label="t('component.roleGuest')" value="guest" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="t('component.formDept')" prop="dept">
            <el-select v-model="form.dept" :placeholder="t('component.formDeptPh')" style="width: 100%">
              <el-option :label="t('component.deptRd')" value="rd" />
              <el-option :label="t('component.deptPm')" value="pm" />
              <el-option :label="t('component.deptOps')" value="ops" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="t('component.formGender')" prop="gender">
            <el-radio-group v-model="form.gender">
              <el-radio value="male">{{ t('component.formGenderMale') }}</el-radio>
              <el-radio value="female">{{ t('component.formGenderFemale') }}</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="t('component.formStatus')" prop="status">
            <el-switch v-model="form.status" :active-text="t('common.enable')" :inactive-text="t('common.disable')" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="t('component.formHobby')" prop="hobbies">
            <el-checkbox-group v-model="form.hobbies">
              <el-checkbox value="code" :label="t('component.hobbyCoding')" />
              <el-checkbox value="game" :label="t('component.hobbyGame')" />
              <el-checkbox value="music" :label="t('component.hobbyMusic')" />
            </el-checkbox-group>
          </el-form-item>
        </el-col>
        <el-col :xs="24">
          <el-form-item :label="t('component.formScore')" prop="score">
            <el-rate v-model="form.score" />
          </el-form-item>
        </el-col>
        <el-col :xs="24">
          <el-form-item :label="t('component.formLevel')" prop="level">
            <el-slider v-model="form.level" :marks="levelMarks" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="t('component.formJoinDate')" prop="joinDate">
            <el-date-picker v-model="form.joinDate" type="date" :placeholder="t('component.formDatePh')" style="width: 100%" value-format="YYYY-MM-DD" />
          </el-form-item>
        </el-col>
        <el-col :xs="24">
          <el-form-item :label="t('component.formRemark')" prop="remark">
            <el-input v-model="form.remark" type="textarea" :rows="3" maxlength="200" show-word-limit :placeholder="t('component.formRemarkPh')" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item>
        <el-button type="primary" :icon="'Check'" @click="submit">{{ t('component.submitValidate') }}</el-button>
        <el-button :icon="'RefreshLeft'" @click="resetForm">{{ t('common.reset') }}</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import 'element-plus/es/components/message/style/css'

interface FormModel {
  username: string
  email: string
  role: string
  dept: string
  gender: string
  status: boolean
  hobbies: string[]
  score: number
  level: number
  joinDate: string
  remark: string
}

const { t } = useI18n()

const formRef = ref<FormInstance>()
const form = reactive<FormModel>({
  username: '',
  email: '',
  role: '',
  dept: '',
  gender: 'male',
  status: true,
  hobbies: [],
  score: 0,
  level: 50,
  joinDate: '',
  remark: '',
})

const levelMarks = computed(() => ({
  0: t('component.formLevelLow'),
  50: t('component.formLevelMid'),
  100: t('component.formLevelHigh'),
}))

const rules: FormRules<FormModel> = {
  username: [
    { required: true, message: () => `${t('common.pleaseInput')}${t('component.formUsername')}`, trigger: 'blur' },
    { min: 3, max: 16, message: () => t('component.lengthRule'), trigger: 'blur' },
  ],
  email: [
    { required: true, message: () => `${t('common.pleaseInput')}${t('component.formEmail')}`, trigger: 'blur' },
    { type: 'email', message: () => t('component.emailFormat'), trigger: 'blur' },
  ],
  role: [{ required: true, message: () => `${t('common.pleaseSelect')}${t('component.formRole')}`, trigger: 'change' }],
  dept: [{ required: true, message: () => `${t('common.pleaseSelect')}${t('component.formDept')}`, trigger: 'change' }],
  gender: [{ required: true, message: () => `${t('common.pleaseSelect')}${t('component.formGender')}`, trigger: 'change' }],
}

async function submit() {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (valid) {
      ElMessage.success(t('component.validateOk'))
    } else {
      ElMessage.error(t('component.validateFail'))
    }
  })
}

function resetForm() {
  formRef.value?.resetFields()
}
</script>

<style scoped>
.mb {
  margin-bottom: 16px;
}
.form {
  max-width: 920px;
}
</style>