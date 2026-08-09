// ECharts 使用组合式封装：
// - 自动 init / setOption / resize / dispose
// - 监听主题色与暗黑模式变化，自动重绘（与 Element Plus 主色、暗黑主题联动）
import { onBeforeUnmount, onMounted, watch, type Ref } from 'vue'
import type { EChartsOption } from 'echarts'
import echarts from '@/utils/echarts'
import { useAppStore } from '@/store/app'

export function useEcharts(elRef: Ref<HTMLElement | null>, getOption: () => EChartsOption) {
  const appStore = useAppStore()
  let chart: ReturnType<typeof echarts.init> | null = null
  const resize = () => chart?.resize()

  onMounted(() => {
    if (!elRef.value) return
    chart = echarts.init(elRef.value)
    chart.setOption(getOption(), true)
    window.addEventListener('resize', resize)
  })

  // 主题色 / 暗黑 / 语言切换时，重算配色与文案并重绘
  watch(
    () => `${appStore.isDark}|${appStore.themeColor}|${appStore.locale}`,
    () => {
      if (chart) chart.setOption(getOption(), true)
    },
  )

  onBeforeUnmount(() => {
    window.removeEventListener('resize', resize)
    chart?.dispose()
    chart = null
  })

  return { resize }
}
