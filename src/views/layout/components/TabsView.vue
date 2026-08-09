<template>
  <div class="tabs-view">
    <div ref="scrollRef" class="tabs-scroll" @wheel.prevent="onWheel">
      <div class="tabs">
        <router-link
          v-for="tab in appStore.visitedViews"
          :key="tab.path"
          :to="tab.path"
          custom
          v-slot="{ navigate, isActive }"
        >
          <span
            class="tab-item"
            :class="{ active: isActive, dragging: draggingPath === tab.path }"
            :draggable="!isAffix(tab)"
            @click="navigate"
            @contextmenu.stop.prevent="openMenu(tab, $event)"
            @dragstart="onDragStart($event, tab)"
            @dragover.prevent="onDragOver($event, tab)"
            @dragend="onDragEnd"
          >
            {{ displayTitle(tab.title) }}
            <el-icon
              v-if="!isAffix(tab)"
              class="close"
              @click.stop="closeTab(tab)"
            >
              <Close />
            </el-icon>
          </span>
        </router-link>
      </div>
    </div>

    <!-- 右键菜单 -->
    <ul
      v-show="menu.visible"
      class="context-menu"
      :style="{ left: menu.left + 'px', top: menu.top + 'px' }"
    >
      <li @click="refreshSelected">
        <el-icon><Refresh /></el-icon> {{ t('tabs.refresh') }}
      </li>
      <li :class="{ disabled: !selectedTab || isAffix(selectedTab) }" @click="closeSelected">
        <el-icon><Close /></el-icon> {{ t('tabs.close') }}
      </li>
      <li :class="{ disabled: onlyAffixLeft }" @click="closeOthers">
        <el-icon><CircleClose /></el-icon> {{ t('tabs.closeOthers') }}
      </li>
      <li :class="{ disabled: onlyAffixLeft }" @click="closeAll">
        <el-icon><FolderDelete /></el-icon> {{ t('tabs.closeAll') }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  useRoute,
  useRouter,
  type LocationQuery,
  type LocationQueryRaw,
} from 'vue-router'
import { useAppStore, type VisitedView } from '@/store/app'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const { t, te } = useI18n()

// tab.title 来自 route.meta.title（已 i18n key 化）；用户自定义菜单可能仍是中文。
// te() 检测 key 是否注册：注册则 t()、未注册则原样显示。
function displayTitle(title: string): string {
  return te(title) ? t(title) : title
}

// 把 fullPath 去掉 query 部分得到 base path，用于和 affix 基础路径比对
function getBasePath(p: string): string {
  const i = p.indexOf('?')
  return i === -1 ? p : p.slice(0, i)
}

// affix（固定）标签不可关闭、不被"关闭其他/全部"清除、不可拖动；允许 null/undefined（避免模板求值崩）
// 实时从已注册路由（含动态注入的菜单）里查 meta.affix，确保动态菜单的 affix 也生效。
function isAffix(tab: VisitedView | null | undefined): boolean {
  if (!tab) return false
  const base = getBasePath(tab.path)
  const matched = router.getRoutes().find((r) => r.path === base)
  return !!matched?.meta?.affix
}
const onlyAffixLeft = computed(
  () => appStore.visitedViews.filter((v) => !isAffix(v)).length === 0,
)

// 多开标签时，标题末尾追加 query 摘要以便区分
function makeTitle(baseTitle: string, query: LocationQuery): string {
  const keys = Object.keys(query || {})
  if (keys.length === 0) return baseTitle
  const summary = keys
    .slice(0, 2)
    .map((k) => `${k}=${query[k]}`)
    .join(' ')
  return keys.length > 2 ? `${baseTitle}（${summary}…）` : `${baseTitle}（${summary}）`
}

// 路由变化时把当前页加入访问记录；以 fullPath 为唯一键，支持同一路由不同 query 多开
watch(
  () => route.fullPath,
  () => {
    appStore.currentPath = route.fullPath
    if (route.meta.public) return
    const baseTitle = route.meta.title as string | undefined
    if (!baseTitle) return
    appStore.addVisitedView({
      path: route.fullPath,
      title: makeTitle(baseTitle, route.query),
      affix: route.meta.affix === true,
    })
  },
  { immediate: true },
)

// ---------- 关闭逻辑 ----------
function closeTab(tab: VisitedView) {
  if (isAffix(tab)) return
  const views = appStore.visitedViews
  const index = views.findIndex((v) => v.path === tab.path)
  if (index === -1) return

  appStore.removeVisitedView(tab.path)

  if (tab.path !== route.fullPath) return

  const nextViews = appStore.visitedViews
  if (nextViews.length === 0) {
    router.push('/dashboard')
    return
  }
  const target = nextViews[index] || nextViews[index - 1] || nextViews[0]
  router.push(target.path)
}

// 刷新当前页：借助 /redirect 中转，强制组件重新挂载（query 透传）
function refreshCurrent() {
  const query: LocationQueryRaw = { ...route.query }
  router
    .replace({ path: '/redirect' + route.path, query })
    .catch(() => {})
}

function closeOthers() {
  if (!selectedTab.value) return closeMenu()
  // 以「右键选中的标签」为保留项，而不是当前激活页：关闭其他 == 只留选中的 + 固定标签
  const keepPath = selectedTab.value.path
  appStore.closeOthers(keepPath)
  // 若当前正在打开的不是保留项（保留项多为非激活标签），跳转过去
  if (route.fullPath !== keepPath) {
    router.push(keepPath)
  }
  closeMenu()
}
function closeAll() {
  appStore.closeAll()
  router.push('/dashboard')
}

// ---------- 滚轮横向滚动 ----------
// 标签过多时，竖向滚轮转为横向滚动；去掉 el-scrollbar 以免竖向滚动被吞
const scrollRef = ref<HTMLElement | null>(null)
function onWheel(e: WheelEvent) {
  const el = scrollRef.value
  if (!el) return
  // 优先用横向 deltaX，否则把竖向 deltaY 转为横向位移
  const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
  el.scrollLeft += delta
}

// ---------- 拖拽排序 ----------
// 仅非 affix 标签可拖；拖拽结束后把 affix 项统一置顶，保证仪表盘永远在第一个
const draggingPath = ref<string>('')

function onDragStart(e: DragEvent, tab: VisitedView) {
  if (isAffix(tab)) return
  draggingPath.value = tab.path
  e.dataTransfer?.setData('text/plain', tab.path)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

function onDragOver(_e: DragEvent, tab: VisitedView) {
  if (!draggingPath.value || isAffix(tab) || draggingPath.value === tab.path) return
  const list = [...appStore.visitedViews]
  const from = list.findIndex((v) => v.path === draggingPath.value)
  const to = list.findIndex((v) => v.path === tab.path)
  if (from === -1 || to === -1) return
  const [moved] = list.splice(from, 1)
  list.splice(to, 0, moved)
  // 先写临时顺序（含 affix 原位），结束拖拽时再统一钉顶
  appStore.setVisitedViews(list)
}

function onDragEnd() {
  draggingPath.value = ''
  // 拖拽结束后，把 affix 项移动到最前面，其余按当前顺序保持
  const list = [...appStore.visitedViews]
  const affixItems = list.filter((v) => v.affix === true)
  const rest = list.filter((v) => v.affix !== true)
  appStore.setVisitedViews([...affixItems, ...rest])
}

// ---------- 右键菜单 ----------
const selectedTab = ref<VisitedView | null>(null)
const menu = reactive({ visible: false, left: 0, top: 0 })

function openMenu(tab: VisitedView, e: MouseEvent) {
  selectedTab.value = tab
  const menuWidth = 110
  const menuHeight = 160
  const left =
    e.clientX + menuWidth > window.innerWidth ? e.clientX - menuWidth : e.clientX
  const top =
    e.clientY + menuHeight > window.innerHeight ? e.clientY - menuHeight : e.clientY
  menu.left = left
  menu.top = top
  menu.visible = true
}

function closeMenu() {
  menu.visible = false
}

function refreshSelected() {
  if (!selectedTab.value) return closeMenu()
  if (selectedTab.value.path !== route.fullPath) {
    router.push(selectedTab.value.path).then(() => refreshCurrent())
  } else {
    refreshCurrent()
  }
  closeMenu()
}
function closeSelected() {
  if (selectedTab.value && !isAffix(selectedTab.value)) {
    closeTab(selectedTab.value)
  }
  closeMenu()
}
function onBodyEvent() {
  if (menu.visible) closeMenu()
}

onMounted(() => {
  document.body.addEventListener('click', onBodyEvent)
  document.body.addEventListener('contextmenu', onBodyEvent)
})
onBeforeUnmount(() => {
  document.body.removeEventListener('click', onBodyEvent)
  document.body.removeEventListener('contextmenu', onBodyEvent)
})
</script>

<style scoped>
.tabs-view {
  position: relative;
  height: 42px;
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color);
  display: flex;
  align-items: center;
  overflow: hidden;
}
.tabs-view :deep(.tabs-scroll) {
  width: 100%;
  height: 100%;
}
.tabs-scroll {
  width: 100%;
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
}
.tabs-scroll::-webkit-scrollbar {
  height: 6px;
}
.tabs-scroll::-webkit-scrollbar-thumb {
  background: var(--el-border-color-darker, #c0c4cc);
  border-radius: 3px;
}
.tabs {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  padding: 0 12px;
  white-space: nowrap;
  height: 100%;
}
.tab-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 13px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--el-text-color-regular);
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-blank);
  user-select: none;
}
.tab-item[draggable='true'] {
  cursor: grab;
}
.tab-item.active {
  color: var(--el-color-white);
  background: var(--el-color-primary);
  border-color: var(--el-color-primary);
}
.tab-item.dragging {
  opacity: 0.4;
}
.close {
  font-size: 12px;
  border-radius: 50%;
}
.tab-item:hover .close {
  background: var(--el-color-primary-light-5);
}
.context-menu {
  position: fixed;
  z-index: 3000;
  margin: 0;
  padding: 5px 0;
  list-style: none;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  box-shadow: var(--el-box-shadow-light);
  font-size: 13px;
  color: var(--el-text-color-regular);
}
.context-menu li {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  cursor: pointer;
  white-space: nowrap;
}
.context-menu li:hover {
  background: var(--el-fill-color-light);
  color: var(--el-color-primary);
}
.context-menu li.disabled {
  color: var(--el-text-color-disabled);
  cursor: not-allowed;
}
.context-menu li.disabled:hover {
  background: transparent;
  color: var(--el-text-color-disabled);
}
</style>