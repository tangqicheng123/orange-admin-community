// ECharts 使用组合式封装：
// - 自动 init / setOption / resize / dispose
// - 监听主题色与暗黑模式变化，自动重绘（与 Element Plus 主色、暗黑主题联动）
import { onBeforeUnmount, onMounted, watch, type Ref } from 'vue'
import type { EChartsOption } from 'echarts'
import echarts from '@/utils/echarts'
import { useAppStore } from '@/store/app'

export function useEcharts(
  elRef: Ref<HTMLElement | null>,
  getOption: () => EChartsOption,
  deps: Ref<unknown>[] = [],
) {
  const appStore = useAppStore()
  let chart: ReturnType<typeof echarts.init> | null = null
  const resize = () => chart?.resize()

  onMounted(() => {
    if (!elRef.value) return
    chart = echarts.init(elRef.value)
    chart.setOption(getOption(), true)
    window.addEventListener('resize', resize)
    // 容器尺寸变化时重绘（响应 el-col 断点切换、抽屉开合、菜单折叠等不触发 window.resize 的场景）
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => chart?.resize())
      ro.observe(elRef.value)
      ;(chart as unknown as { __ro?: ResizeObserver }).__ro = ro
    }
  })

  // 主题色 / 暗黑 / 语言切换时，重算配色与文案并重绘
  watch(
    () => `${appStore.isDark}|${appStore.themeColor}|${appStore.locale}`,
    () => {
      if (chart) chart.setOption(getOption(), true)
    },
  )

  // 业务依赖（如时间范围、指标切换）变化时同步重绘
  deps.forEach((dep) =>
    watch(dep, () => {
      if (chart) chart.setOption(getOption(), true)
    }),
  )

  onBeforeUnmount(() => {
    window.removeEventListener('resize', resize)
    const ro = (chart as unknown as { __ro?: ResizeObserver } | null)?.__ro
    ro?.disconnect()
    chart?.dispose()
    chart = null
  })

  return { resize }
}
