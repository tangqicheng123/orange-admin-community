<template>
  <el-card shadow="never" :header="title" class="pro-table">
    <!-- 搜索区：根据 columns 中声明了 search 的列自动生成查询表单 -->
    <div v-if="hasSearch" class="pt-toolbar">
      <el-form :inline="true" @submit.prevent>
        <el-form-item v-for="col in searchColumns" :key="col.prop" :label="col.label">
          <el-input
            v-if="col.search!.type === 'input'"
            v-model="query[col.prop]"
            :placeholder="col.search!.placeholder || col.label"
            clearable
            class="pt-input"
          />
          <el-select
            v-else-if="col.search!.type === 'select'"
            v-model="query[col.prop]"
            :placeholder="col.search!.placeholder || col.label"
            clearable
            class="pt-input"
          >
            <el-option
              v-for="opt in col.search!.options"
              :key="String(opt.value)"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="'Search'" @click="onSearch">查询</el-button>
          <el-button :icon="'Refresh'" @click="onReset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-table
      :data="pagedData"
      border
      stripe
      style="width: 100%"
      :max-height="height"
      v-loading="loading"
    >
      <el-table-column v-if="showIndex" type="index" label="#" width="60" align="center" />
      <ProTableColumn
        v-for="col in renderColumns"
        :key="col.prop"
        :col="col"
        :slots="$slots"
      />
      <el-table-column
        v-if="$slots.action"
        label="操作"
        :width="actionWidth"
        fixed="right"
        align="center"
      >
        <template #default="{ row }">
          <slot name="action" :row="(row as T)" />
        </template>
      </el-table-column>
    </el-table>

    <div class="pt-pager">
      <el-pagination
        v-model:current-page="current"
        v-model:page-size="size"
        :total="total"
        :page-sizes="pageSizes"
        :layout="pagerLayout"
        :small="appStore.isMobile"
        :pager-count="appStore.isMobile ? 5 : 7"
        background
      />
    </div>
  </el-card>
</template>

<script setup lang="ts" generic="T = any">
import { computed, reactive, ref, watch } from 'vue'
import { useUserStore } from '@/store/user'
import { useAppStore } from '@/store/app'
import ProTableColumn from './ProTableColumn'

/** 列定义：驱动表格渲染、搜索、权限与自定义插槽 */
export interface ProColumn<T = any> {
  /** 字段名，对应 row 的属性 */
  prop: string
  /** 列标题 */
  label: string
  /** 列宽（px 或 '120' 等字符串） */
  width?: number | string
  /** 最小列宽，配合 show-overflow-tooltip 自适应 */
  minWidth?: number | string
  /** 是否可排序 */
  sortable?: boolean
  /** 固定列：'left' | 'right' | true */
  fixed?: 'left' | 'right' | boolean
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right'
  /** 自定义单元格插槽名；传入后由父组件通过 #slotName 渲染 */
  slot?: string
  /** 列级权限点；无权限（非 admin）时整列隐藏 */
  auth?: string
  /** 声明后自动在搜索区生成对应表单项 */
  search?: {
    type: 'input' | 'select'
    placeholder?: string
    options?: { label: string; value: string | number }[]
  }
  /** 格式化函数：返回字符串，覆盖默认文本 */
  formatter?: (row: T) => string
}

interface Props<T = any> {
  /** 列定义 */
  columns: ProColumn<T>[]
  /** 客户端模式：直接传入全量数据，由组件做前端筛选 + 分页 */
  data?: T[]
  /** 服务端模式：传入请求函数，组件负责分页/查询参数回传（与 data 二选一） */
  request?: (params: { page: number; size: number; query: Record<string, unknown> }) => Promise<{ list: T[]; total: number }>
  /** 行 key 字段，默认 id */
  rowKey?: string
  /** 卡片标题 */
  title?: string
  /** 表格最大高度（超出滚动） */
  height?: number | string
  /** 是否显示序号列 */
  showIndex?: boolean
  /** 默认每页条数 */
  pageSize?: number
  /** 每页条数选项 */
  pageSizes?: number[]
  /** 操作列宽度 */
  actionWidth?: number | string
}

const props = withDefaults(defineProps<Props<T>>(), {
  data: () => [],
  rowKey: 'id',
  title: '',
  height: 460,
  showIndex: true,
  pageSize: 10,
  pageSizes: () => [10, 20, 50],
  actionWidth: 160,
})

// 开放具名插槽：列级自定义单元格 (#metric/#channel/#enabled 等由业务页声明) + #action 操作列。
// 用索引签名声明，避免传 :slots="$slots" 后类型被收窄成只有 action。
defineSlots<{
  [name: string]: (props: { row: T }) => any
}>()

const userStore = useUserStore()
// 移动端：分页器精简为「上一页/页码/下一页」，避免 total/sizes/jumper 在窄屏溢出换行
const appStore = useAppStore()
const pagerLayout = computed(() =>
  appStore.isMobile ? 'prev, pager, next' : 'total, sizes, prev, pager, next, jumper',
)
const query = reactive<Record<string, any>>({})
const current = ref(1)
const size = ref(props.pageSize)
const serverList = ref<any[]>([])
const serverTotal = ref(0)
const loading = ref(false)

const searchColumns = computed(() => props.columns.filter((c) => c.search))
const hasSearch = computed(() => searchColumns.value.length > 0)
/** 列级权限过滤：无权限的列不渲染 */
const renderColumns = computed(() =>
  props.columns.filter((c) => !c.auth || userStore.hasPermission(c.auth)),
)

/** 客户端模式：按搜索条件过滤 */
const filteredData = computed<any[]>(() => {
  if (props.request) return []
  return (props.data as any[]).filter((row) => {
    return searchColumns.value.every((col) => {
      const q = query[col.prop]
      if (q === '' || q === undefined || q === null) return true
      if (col.search!.type === 'select') return (row as Record<string, unknown>)[col.prop] === q
      return String((row as Record<string, unknown>)[col.prop] ?? '')
        .toLowerCase()
        .includes(String(q).toLowerCase())
    })
  })
})

const total = computed(() => (props.request ? serverTotal.value : filteredData.value.length))
const pagedData = computed<any[]>(() => {
  if (props.request) return serverList.value
  const start = (current.value - 1) * size.value
  return filteredData.value.slice(start, start + size.value)
})

async function loadServer() {
  if (!props.request) return
  loading.value = true
  try {
    const res = await props.request({ page: current.value, size: size.value, query: { ...query } })
    serverList.value = res.list
    serverTotal.value = res.total
  } finally {
    loading.value = false
  }
}

function onSearch() {
  current.value = 1
  if (props.request) loadServer()
}
function onReset() {
  searchColumns.value.forEach((c) => (query[c.prop] = ''))
  current.value = 1
  if (props.request) loadServer()
}

watch([current, size], () => {
  if (props.request) loadServer()
})

// 初始化查询条件默认值
searchColumns.value.forEach((c) => {
  if (!(c.prop in query)) query[c.prop] = ''
})
if (props.request) loadServer()

/** 暴露刷新方法：父组件在数据变更后调用 */
defineExpose({ reload: () => (props.request ? loadServer() : (current.value = 1)) })
</script>

<style scoped>
.pt-toolbar {
  margin-bottom: 16px;
}
/* 搜索框：桌面固定宽；移动端满宽并允许换行，避免窄屏横向溢出 */
.pt-input {
  width: 200px;
}
.pt-pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  overflow-x: auto;
  /* 内容超出时留出滚动条空间，避免盖住翻页按钮 */
  padding-bottom: 4px;
}
@media (max-width: 992px) {
  .pt-input {
    width: 100%;
  }
  .pt-toolbar :deep(.el-form-item) {
    margin-right: 8px;
    margin-bottom: 12px;
  }
  .pt-pager {
    /* 居中溢出会导致左半部分（上一页）被裁切且无法左滑；
       改用左对齐，配合 overflow-x:auto 整个翻页器可横向滑动看全 */
    justify-content: flex-start;
  }
}
</style>
