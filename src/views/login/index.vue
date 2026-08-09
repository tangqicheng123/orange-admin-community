<template>
  <div class="login-page">
    <el-card class="login-card" shadow="always">
      <div class="brand">
        <span class="logo">O</span>
        <h2>{{ t('login.title') }}</h2>
        <p class="subtitle">{{ t('login.subtitle') }}</p>
      </div>

      <div class="value-tags">
        <span class="vtag">{{ t('login.tagNoBackend') }}</span>
        <span class="vtag">{{ t('login.tagFast') }}</span>
        <span class="vtag">{{ t('login.tagCommercial') }}</span>
        <span class="vtag">{{ t('login.tagTheme') }}</span>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" size="large" @submit.prevent>
        <el-form-item prop="username">
          <el-input v-model="form.username" :placeholder="t('login.usernamePlaceholder')" :prefix-icon="User" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            :placeholder="t('login.passwordPlaceholder')"
            show-password
            :prefix-icon="Lock"
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-button type="primary" :loading="loading" class="submit" @click="handleLogin">
          {{ t('login.submit') }}
        </el-button>
      </el-form>

      <div class="tips">
        <p>{{ t('login.demoTips') }}</p>
        <p>{{ t('login.adminDemo') }}</p>
        <p>{{ t('login.userDemo') }}</p>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/user'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const formRef = ref<FormInstance>()
const loading = ref(false)
const form = reactive({ username: 'admin', password: '123456' })

const rules: FormRules = {
  username: [{ required: true, message: t('login.pleaseInputUsername'), trigger: 'blur' }],
  password: [{ required: true, message: t('login.pleaseInputPassword'), trigger: 'blur' }],
}

async function handleLogin() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    await userStore.login({ username: form.username, password: form.password })
    ElMessage.success(t('login.loginSuccess'))
    const redirect = (route.query.redirect as string) || '/dashboard'
    router.push(redirect)
  } catch {
    // 错误已在 request 拦截器提示
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 浅米 + 淡橙渐变：避免与品牌橙按钮撞色、保留品牌氛围；卡片在淡背景上更突出 */
  background: linear-gradient(135deg, #fff7ed 0%, #ffe8d0 100%);
}
.login-card {
  width: 380px;
  border-radius: 12px;
}
.brand {
  text-align: center;
  margin-bottom: 20px;
}
.logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--el-color-primary);
  color: #fff;
  font-size: 26px;
  font-weight: 700;
}
.brand h2 {
  margin: 12px 0 4px;
  font-size: 20px;
}
.subtitle {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  margin: 0;
}
.value-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin: 0 0 18px;
}
.vtag {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 20px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  border: 1px solid var(--el-color-primary-light-7);
}
.submit {
  width: 100%;
}
.tips {
  margin-top: 16px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.8;
}
.tips p {
  margin: 0;
}
</style>