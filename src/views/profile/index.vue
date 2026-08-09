<template>
  <div class="profile-page">
    <el-row :gutter="16">
      <!-- 左侧：用户信息概览 -->
      <el-col :xs="24" :sm="8">
        <el-card class="overview" shadow="hover">
          <div class="avatar-wrap">
            <el-avatar :size="72">{{ initial }}</el-avatar>
          </div>
          <h3 class="uname">{{ userInfo?.username }}</h3>
          <p class="nickname">{{ userInfo?.nickname || '-' }}</p>
          <div class="role-tags">
            <el-tag
              v-for="r in roles"
              :key="r"
              :type="r === 'admin' ? 'danger' : 'info'"
              size="small"
            >
              {{ roleLabel(r) }}
            </el-tag>
          </div>
          <el-divider />
          <div class="perm-block">
            <div class="perm-title">当前权限</div>
            <div class="perm-tags">
              <el-tag v-if="isAdmin" type="warning" size="small">全部权限</el-tag>
              <template v-else>
                <el-tag v-for="p in visiblePerms" :key="p" size="small" effect="plain">{{ p }}</el-tag>
                <el-tag v-if="hiddenPermCount > 0" size="small" type="info">+{{ hiddenPermCount }}</el-tag>
              </template>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：基本资料 / 安全设置 -->
      <el-col :xs="24" :sm="16">
        <el-card shadow="never">
          <el-tabs v-model="activeTab">
            <el-tab-pane label="基本资料" name="base">
              <el-form
                :model="baseForm"
                :rules="baseRules"
                ref="baseFormRef"
                label-width="90px"
                class="profile-form"
              >
                <el-form-item label="用户名" prop="username">
                  <el-input v-model="baseForm.username" disabled />
                </el-form-item>
                <el-form-item label="昵称" prop="nickname">
                  <el-input v-model="baseForm.nickname" placeholder="请输入昵称" maxlength="20" />
                </el-form-item>
                <el-form-item label="邮箱" prop="email">
                  <el-input v-model="baseForm.email" placeholder="请输入邮箱" />
                </el-form-item>
                <el-form-item label="手机号" prop="phone">
                  <el-input v-model="baseForm.phone" placeholder="请输入手机号" maxlength="11" />
                </el-form-item>
                <el-form-item label="部门">
                  <el-input :model-value="userInfo?.dept || '-'" disabled />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" :loading="savingBase" @click="saveBase">保存修改</el-button>
                </el-form-item>
              </el-form>
            </el-tab-pane>

            <el-tab-pane label="安全设置" name="security">
              <el-form
                :model="pwdForm"
                :rules="pwdRules"
                ref="pwdFormRef"
                label-width="90px"
                class="profile-form"
              >
                <el-form-item label="原密码" prop="oldPassword">
                  <el-input
                    v-model="pwdForm.oldPassword"
                    type="password"
                    show-password
                    placeholder="请输入原密码"
                  />
                </el-form-item>
                <el-form-item label="新密码" prop="newPassword">
                  <el-input
                    v-model="pwdForm.newPassword"
                    type="password"
                    show-password
                    placeholder="至少 6 位"
                  />
                </el-form-item>
                <el-form-item label="确认密码" prop="confirmPassword">
                  <el-input
                    v-model="pwdForm.confirmPassword"
                    type="password"
                    show-password
                    placeholder="再次输入新密码"
                  />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" :loading="savingPwd" @click="savePwd">修改密码</el-button>
                </el-form-item>
              </el-form>
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useUserStore } from '@/store/user'
import { updateProfile, changePassword } from '@/api/user'

const { t } = useI18n()
const userStore = useUserStore()
const userInfo = computed(() => userStore.userInfo)

const initial = computed(() => (userInfo.value?.username?.charAt(0) || 'U').toUpperCase())
const roles = computed(() => userInfo.value?.roles || [])
const isAdmin = computed(() => (userInfo.value?.permissions || []).includes('*'))
const perms = computed(() => {
  const p = userInfo.value?.permissions || []
  return p.includes('*') ? [] : p
})
const visiblePerms = computed(() => perms.value.slice(0, 8))
const hiddenPermCount = computed(() => Math.max(0, perms.value.length - 8))

function roleLabel(r: string) {
  if (r === 'admin') return t('common.roleAdmin')
  if (r === 'user') return t('common.roleUser')
  return r
}

const activeTab = ref('base')

// ---- 基本资料 ----
const baseFormRef = ref<FormInstance>()
const baseForm = reactive({ username: '', nickname: '', email: '', phone: '' })
const savingBase = ref(false)

function syncBaseForm() {
  baseForm.username = userInfo.value?.username || ''
  baseForm.nickname = userInfo.value?.nickname || ''
  baseForm.email = userInfo.value?.email || ''
  baseForm.phone = userInfo.value?.phone || ''
}
syncBaseForm()
watch(userInfo, syncBaseForm)

const baseRules: FormRules = {
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
}

async function saveBase() {
  if (!baseFormRef.value) return
  await baseFormRef.value.validate(async (valid) => {
    if (!valid) return
    savingBase.value = true
    try {
      const updated = await updateProfile({
        nickname: baseForm.nickname,
        email: baseForm.email,
        phone: baseForm.phone,
      })
      userStore.userInfo = updated
      ElMessage.success('资料已保存')
    } finally {
      savingBase.value = false
    }
  })
}

// ---- 修改密码 ----
const pwdFormRef = ref<FormInstance>()
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })
const savingPwd = ref(false)

const pwdRules: FormRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '新密码至少 6 位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (_rule, value, cb) => {
        if (value !== pwdForm.newPassword) cb(new Error('两次输入的密码不一致'))
        else cb()
      },
      trigger: 'blur',
    },
  ],
}

async function savePwd() {
  if (!pwdFormRef.value) return
  await pwdFormRef.value.validate(async (valid) => {
    if (!valid) return
    savingPwd.value = true
    try {
      await changePassword({ oldPassword: pwdForm.oldPassword, newPassword: pwdForm.newPassword })
      ElMessage.success('密码修改成功')
      pwdForm.oldPassword = ''
      pwdForm.newPassword = ''
      pwdForm.confirmPassword = ''
    } finally {
      savingPwd.value = false
    }
  })
}
</script>

<style scoped>
.profile-page {
  padding: 4px;
}
.overview {
  text-align: center;
}
.avatar-wrap {
  margin-bottom: 12px;
}
.uname {
  margin: 0 0 4px;
  font-size: 18px;
}
.nickname {
  margin: 0 0 12px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.role-tags {
  display: flex;
  gap: 6px;
  justify-content: center;
  flex-wrap: wrap;
}
.perm-block {
  text-align: left;
}
.perm-title {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}
.perm-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.profile-form {
  max-width: 460px;
  margin-top: 8px;
}
</style>
