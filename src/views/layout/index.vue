<template>
  <el-container class="app-wrapper">
    <!-- 桌面：常驻侧边栏（可折叠）；移动端：改用抽屉 -->
    <el-aside v-if="!appStore.isMobile" :width="appStore.sidebarCollapsed ? '64px' : '220px'" class="sidebar-container">
      <Sidebar />
    </el-aside>
    <el-drawer
      v-else
      v-model="appStore.drawerVisible"
      direction="ltr"
      :with-header="false"
      size="220px"
      class="mobile-sidebar-drawer"
    >
      <Sidebar />
    </el-drawer>
    <el-container class="main-container">
      <el-header class="header-container" height="56px">
        <Header />
      </el-header>
      <TabsView />
      <el-main class="content-container">
        <router-view v-slot="{ Component, route }">
          <transition name="fade-transform" mode="out-in">
            <keep-alive>
              <component :is="Component" :key="route.fullPath" />
            </keep-alive>
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/store/app'
import Sidebar from './components/Sidebar.vue'
import Header from './components/Header.vue'
import TabsView from './components/TabsView.vue'

const route = useRoute()
const appStore = useAppStore()

// 移动端抽屉：路由跳转后自动收起，避免遮挡内容
watch(
  () => route.fullPath,
  () => {
    appStore.drawerVisible = false
  },
)

// 挂载时启动视口监听（移动端抽屉开关），卸载时移除避免泄漏
onMounted(() => appStore.initDevice())
onUnmounted(() => appStore.destroyDevice())
</script>

<style scoped>
.app-wrapper {
  height: 100vh;
}
.sidebar-container {
  transition: width 0.28s;
  background: var(--el-bg-color);
  /* 用 box-shadow 替代 border-right，避免与 el-scrollbar/el-menu
     内部的边界叠加成 2px 视觉粗线（有菜单项区域特别明显）。 */
  box-shadow: inset -1px 0 0 var(--el-border-color-light);
  overflow: hidden;
}
.main-container {
  flex-direction: column;
}
.header-container {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color);
  padding: 0;
}
.content-container {
  background: var(--el-bg-color-page);
  padding: 16px;
}
/* 移动端：内容区内边距收紧，避免窄屏拥挤 */
@media (max-width: 992px) {
  .content-container {
    padding: 10px;
  }
}
.fade-transform-enter-active,
.fade-transform-leave-active {
  transition: all 0.3s;
}
.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}
.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
