<template>
  <div class="login-page">
    <!-- 主题工具：登录页无 Header，这里放「主题色 + 暗黑/亮色」切换，与全局 appStore 同步 -->
    <div class="theme-tools">
      <el-color-picker
        :model-value="appStore.themeColor"
        :predefine="predefineColors"
        size="small"
        :aria-label="t('app.themeColor')"
        @active-change="onThemeColorPreview"
        @change="onThemeColorChange"
      />
      <el-tooltip :content="appStore.isDark ? t('app.switchLight') : t('app.switchDark')" placement="bottom">
        <button class="theme-toggle" type="button" :aria-label="appStore.isDark ? t('app.switchLight') : t('app.switchDark')" @click="appStore.toggleDark()">
          <el-icon :size="18"><Sunny v-if="appStore.isDark" /><Moon v-else /></el-icon>
        </button>
      </el-tooltip>
    </div>
    <el-card class="login-card" shadow="always">
      <div class="brand">
        <span class="logo">O</span>
        <h2>{{ t('login.title') }}</h2>
      </div>

      <div class="value-tags">
        <span class="vtag">{{ t('login.tagMock') }}</span>
        <span class="vtag">{{ t('login.tagWYSIWYG') }}</span>
        <span class="vtag">{{ t('login.tagCommercial') }}</span>
        <span class="vtag">{{ t('login.tagDocs') }}</span>
        <span class="vtag">{{ t('login.tagSupport') }}</span>
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
import { ref, reactive, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { User, Lock, Sunny, Moon } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/user'
import { useAppStore } from '@/store/app'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const appStore = useAppStore()

// 主题色预设（与 Header 一致），点击即换肤，状态由 appStore 持久化
// 固定预设。predefineColors 用 computed 把「上次/当前主题色」提到最前，
// 去重后凑满 20 个，保证两排布局不变——第一行第一格永远是你上次选用的颜色。
const BASE_PRESETS = [
  // 品牌 / 热门（第一行）
  '#ff7a00', // 橙（默认品牌色）
  '#ff4d4f', // 红
  '#f5222d', // 朱红
  '#409eff', // 蓝
  '#1677ff', // 宝蓝
  '#2f54eb', // 极客蓝
  '#13c2c2', // 青
  '#67c23a', // 绿
  '#52c41a', // 草绿
  '#9c27b0', // 紫
  // 节日主题 + 哀悼灰（第二行）
  '#e60012', // 春节红
  '#de2910', // 国庆红
  '#c8102e', // 圣诞红
  '#0a6847', // 圣诞绿
  '#ff69b4', // 情人节粉
  '#ff7518', // 万圣橙
  '#fadb14', // 中秋金
  '#e91e63', // 品红
  '#595959', // 哀悼灰（深）
  '#8c8c8c', // 灰
]
const predefineColors = computed(() => {
  const cur = appStore.themeColor
  if (!cur) return BASE_PRESETS
  return [cur, ...BASE_PRESETS.filter((c) => c.toLowerCase() !== cur.toLowerCase())].slice(0, 20)
})
function onThemeColorPreview(color: string | null) {
  if (color) appStore.applyThemeColor(color)
}
function onThemeColorChange(color: string | null) {
  if (color) appStore.setThemeColor(color)
}

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
  position: relative;
  /* 浅米 + 淡橙渐变：避免与品牌橙按钮撞色、保留品牌氛围；卡片在淡背景上更突出 */
  background: linear-gradient(135deg, #fff7ed 0%, #ffe8d0 100%);
}
/* 主题工具：右上角悬浮，登录页无 Header 时也能切主题色 / 暗黑亮色 */
.theme-tools {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.theme-toggle {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 50%;
  background: var(--el-fill-color-blank);
  color: var(--el-text-color-regular);
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}
.theme-toggle:hover {
  color: var(--el-color-primary);
  border-color: var(--el-color-primary-light-5);
}
/* 暗黑模式：登录页同步切换为暖色暗调渐变，避免浅底与暗色卡片/输入框割裂 */
html.dark .login-page {
  background: linear-gradient(135deg, #1c1407 0%, #2a1c0b 100%);
}
.login-card {
  width: min(380px, 92vw);
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