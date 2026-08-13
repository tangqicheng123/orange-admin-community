<template>
  <div class="page-pager">
    <el-pagination
      :current-page="currentPage"
      :page-size="pageSize"
      :total="total"
      :page-sizes="pageSizes"
      :layout="pagerLayout"
      :small="appStore.isMobile"
      :pager-count="appStore.isMobile ? 5 : 7"
      background
      @update:current-page="$emit('update:currentPage', $event)"
      @update:page-size="$emit('update:pageSize', $event)"
      @current-change="$emit('current-change', $event)"
      @size-change="$emit('size-change', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/store/app'

// 注意：props/emit 不在 <script> 中引用（模板直接用解包后的 currentPage/pageSize 等，
// 并用 $emit 触发事件），故不赋值给 const，否则在 noUnusedLocals 下被 vue-tsc 报未使用。
withDefaults(
  defineProps<{
    currentPage: number
    pageSize: number
    total: number
    pageSizes?: number[]
  }>(),
  { pageSizes: () => [10, 20, 50] },
)

defineEmits<{
  'update:currentPage': [value: number]
  'update:pageSize': [value: number]
  'current-change': [value: number]
  'size-change': [value: number]
}>()

// 移动端：分页器精简为「上一页/页码/下一页」，避免 total/sizes/jumper 在窄屏溢出换行后被裁切
const appStore = useAppStore()
const pagerLayout = computed(() =>
  appStore.isMobile ? 'prev, pager, next' : 'total, sizes, prev, pager, next, jumper',
)
</script>

<style scoped>
.page-pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  /* 极端窄屏下仍允许横向滑动看全，避免翻页按钮被裁切 */
  overflow-x: auto;
  padding-bottom: 4px;
}
/* 与全站移动断点保持一致（992px）；左对齐 + 横滑，可完整查看整个翻页器 */
@media (max-width: 992px) {
  .page-pager {
    justify-content: flex-start;
  }
}
</style>
