<template>
  <div class="header">
    <div class="left">
      <el-icon v-if="!appStore.isMobile" class="trigger" @click="appStore.toggleSidebar()">
        <Fold v-if="!appStore.sidebarCollapsed" />
        <Expand v-else />
      </el-icon>
      <el-icon v-else class="trigger" @click="appStore.drawerVisible = true">
        <Menu />
      </el-icon>
      <el-breadcrumb separator="/" class="breadcrumb">
        <el-breadcrumb-item v-for="(b, i) in breadcrumbs" :key="i">{{ b }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="right">
      <el-tooltip :content="appStore.isDark ? t('app.switchLight') : t('app.switchDark')">
        <el-icon class="action" @click="appStore.toggleDark()">
          <Sunny v-if="appStore.isDark" />
          <Moon v-else />
        </el-icon>
      </el-tooltip>

      <el-color-picker
        :model-value="appStore.themeColor"
        @change="onColorChange"
        size="small"
      />

      <el-tooltip :content="t('app.fullscreen')">
        <el-icon class="action fullscreen" @click="toggleFullscreen()">
          <FullScreen />
        </el-icon>
      </el-tooltip>

      <el-dropdown @command="switchRole" trigger="click">
        <el-tag class="role-tag" :type="currentRoleType" effect="plain">
          {{ currentRoleLabel }}<el-icon class="caret"><ArrowDown /></el-icon>
        </el-tag>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="admin">{{ t('app.adminAll') }}</el-dropdown-item>
            <el-dropdown-item command="user">{{ t('app.userPart') }}</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <el-dropdown @command="onCommand" trigger="click">
        <span class="user">
          <el-avatar :size="28">{{ userStore.userInfo?.username?.charAt(0)?.toUpperCase() || 'U' }}</el-avatar>
          <span class="username">{{ userStore.userInfo?.username || t('app.guest') }}</span>
          <el-icon><ArrowDown /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">{{ t('app.profile') }}</el-dropdown-item>
            <el-dropdown-item command="logout" divided>{{ t('app.logout') }}</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useAppStore } from '@/store/app'
import { useUserStore } from '@/store/user'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()
const { t, te } = useI18n()

const breadcrumbs = computed(() => {
  // 用匹配到的路由记录标题拼面包屑；菜单 title 已 i18n key 化，需 te/t 翻译并随语言切换刷新
  return route.matched
    .filter((r) => r.meta?.title)
    .map((r) => {
      const title = r.meta.title as string
      return te(title) ? t(title) : title
    })
})

const currentRoleLabel = computed(() => {
  const r = userStore.roles[0]
  if (r === 'admin') return t('common.roleAdmin')
  if (r === 'user') return t('common.roleUser')
  return r || t('common.unknown')
})
const currentRoleType = computed(() => (userStore.roles.includes('admin') ? 'danger' : 'info'))

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    document.documentElement.requestFullscreen()
  }
}

function onColorChange(color: string | null) {
  if (color) appStore.setThemeColor(color)
}

// 角色演示切换：重新登录对应账号并刷新，便于直观看到菜单与按钮级权限差异
async function switchRole(role: string) {
  try {
    await userStore.login({ username: role, password: '123456' })
    await userStore.fetchUserInfo()
    window.location.reload()
  } catch {
    ElMessage.error(t('app.roleSwitchFailed'))
  }
}

async function onCommand(command: string) {
  if (command === 'logout') {
    await ElMessageBox.confirm(t('app.logoutConfirm'), t('common.tip'), { type: 'warning' })
    await userStore.logout()
    router.push('/login')
  } else if (command === 'profile') {
    router.push('/profile')
  }
}
</script>

<style scoped>
.header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  width: 100%;
  box-sizing: border-box;
}
.left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.trigger {
  font-size: 20px;
  cursor: pointer;
}
.right {
  display: flex;
  align-items: center;
  gap: 16px;
}
.action {
  font-size: 18px;
  cursor: pointer;
}
.lang-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  cursor: pointer;
  user-select: none;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-blank);
  color: var(--el-text-color-regular);
}
.lang-btn:hover {
  color: var(--el-color-primary);
  border-color: var(--el-color-primary-light-5);
}
.lang-label {
  font-weight: 500;
}
.role-tag {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  user-select: none;
}
.caret {
  font-size: 12px;
}
.user {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  outline: none;
}
.username {
  font-size: 14px;
}
/* 移动端：隐藏面包屑与次要操作（全屏/角色/语言文字/用户名），
   顶部只留汉堡 + 暗黑 + 语言图标 + 用户头像，避免窄屏拥挤 */
@media (max-width: 992px) {
  .breadcrumb,
  .action.fullscreen,
  .role-tag,
  .lang-label,
  .username {
    display: none;
  }
}
</style>