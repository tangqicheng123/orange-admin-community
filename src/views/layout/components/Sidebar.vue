<template>
  <div class="sidebar">
    <div class="logo">
      <span v-if="appStore.sidebarCollapsed">O</span>
      <div v-else class="logo-expanded">
        <span class="logo-name">OrangeAdmin 橙枢</span>
        <span class="logo-slogan">{{ t('app.slogan') }}</span>
      </div>
    </div>
    <el-scrollbar>
      <el-menu
        :default-active="activeMenu"
        :collapse="appStore.sidebarCollapsed"
        :collapse-transition="false"
        router
        background-color="transparent"
        :unique-opened="true"
        @select="appStore.drawerVisible = false"
      >
        <template v-for="item in menuItems" :key="item.path">
          <el-sub-menu v-if="item.children && item.children.length" :index="item.path">
            <template #title>
              <el-icon v-if="item.meta?.icon"><component :is="item.meta.icon" /></el-icon>
              <span>{{ displayTitle(item.title) }}</span>
            </template>
            <el-menu-item
              v-for="child in item.children"
              :key="child.path"
              :index="child.path"
            >
              <el-icon v-if="child.meta?.icon"><component :is="child.meta?.icon" /></el-icon>
              <template #title>{{ displayTitle(child.title) }}</template>
            </el-menu-item>
          </el-sub-menu>
          <el-menu-item v-else :index="item.path">
            <el-icon v-if="item.meta?.icon"><component :is="item.meta.icon" /></el-icon>
            <template #title>{{ displayTitle(item.title) }}</template>
          </el-menu-item>
        </template>
      </el-menu>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { buildMenuTree } from '@/router/dynamic'
import { useUserStore } from '@/store/user'
import { useMenuStore } from '@/store/menu'
import { useAppStore } from '@/store/app'

// 菜单项结构（与菜单表对齐）
interface MenuMeta {
  title?: string
  icon?: string
  permission?: string
  hidden?: boolean
}
interface MenuItem {
  path: string
  title?: string
  meta?: MenuMeta
  children?: MenuItem[]
}

const route = useRoute()
const userStore = useUserStore()
const menuStore = useMenuStore()
const appStore = useAppStore()
const { t, te } = useI18n()

const activeMenu = computed(() => route.path)

/**
 * 渲染菜单/标签 title：menu 表里 title 已改为 i18n key（如 'menu.dashboard'），
 * 但用户手动新增的自定义菜单可能仍是中文。te() 检测 key 是否注册：
 * - 注册了：用 t(key) 国际化
 * - 未注册：原样回退显示原 title（兼容自定义菜单）
 * 当 locale 切换时整棵菜单自动重渲染。
 */
function displayTitle(title?: string): string {
  if (!title) return ''
  return te(title) ? t(title) : title
}

onMounted(() => {
  // 确保菜单数据已加载（首屏由 router 注入前可能尚未拉取）
  if (!menuStore.loaded) menuStore.fetchMenus()
})

// 从菜单表构建侧边栏菜单，并按权限过滤可见项
const menuItems = computed<MenuItem[]>(() => {
  const tree = buildMenuTree(menuStore.menus)
  const mapPerm = (n: (typeof tree)[number]): MenuItem | null => {
    // 容器节点（无 component 或 Layout）视为分组，无需权限即可作为容器；
    // 但其下若没有可见子项则整组隐藏。
    const children = n.children && n.children.length ? n.children.map(mapPerm).filter((x): x is MenuItem => x !== null) : undefined
    if (n.children && n.children.length) {
      // 有子节点：容器分组。子全不可见则隐藏。
      if (!children || children.length === 0) return null
      return { path: n.path, title: n.title, meta: { title: n.title, icon: n.icon, permission: n.permission || undefined }, children }
    }
    // 叶子菜单：按 permission 过滤可见性
    if (n.permission && !userStore.hasPermission(n.permission)) return null
    return { path: n.path, title: n.title, meta: { title: n.title, icon: n.icon, permission: n.permission || undefined } }
  }
  return tree.map(mapPerm).filter((x): x is MenuItem => x !== null)
})
</script>

<style scoped>
.sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.logo {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  color: var(--el-color-primary);
  /* 与 TabsView 完全对齐：用同一个 token + box-shadow 替代 border，
     避免被 el-menu 自带的 border-top 叠加成 2px 视觉粗细。 */
  box-shadow: inset 0 -1px 0 var(--el-border-color-light);
  white-space: nowrap;
  overflow: hidden;
  flex-shrink: 0;
}
.logo-expanded {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.2;
}
.logo-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--el-color-primary);
}
.logo-slogan {
  font-size: 11px;
  font-weight: 500;
  color: var(--el-color-warning);
  margin-top: 2px;
}
/* 兜底：EP el-menu 自带 1px 上/右/下边框 + 4px 上下 padding，
   会与 .sidebar-container 的外框叠加，并在 logo 下方叠出第二条线、
   在有菜单项区域叠出第二条竖线（造成"竖线粗细不一"）。:deep 穿透 scoped 打掉它。*/
.sidebar :deep(.el-menu),
.sidebar :deep(.el-menu--collapse),
.sidebar :deep(.el-menu--popup),
.sidebar :deep(.el-menu.el-menu--horizontal),
.sidebar :deep(.el-menu > .el-menu-item:first-child),
.sidebar :deep(.el-sub-menu .el-menu),
.sidebar :deep(.el-scrollbar),
.sidebar :deep(.el-scrollbar__wrap) {
  border-top: 0 !important;
  border-right: 0 !important;
  border-bottom: 0 !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}
</style>