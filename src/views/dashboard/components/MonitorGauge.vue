<template>
  <div ref="el" class="chart" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { EChartsOption } from 'echarts'
import { useEcharts } from '@/composables/useEcharts'
import { useAppStore } from '@/store/app'
import { useI18n } from 'vue-i18n'

const el = ref<HTMLElement | null>(null)
const appStore = useAppStore()
const { t } = useI18n()

const genOption = (): EChartsOption => {
  const textColor = appStore.isDark ? '#cfd3dc' : '#303133'
  const splitColor = appStore.isDark ? 'rgba(255,255,255,0.1)' : '#ebeef5'
  const color = appStore.themeColor
  return {
    series: [
      {
        type: 'gauge',
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: 100,
        progress: { show: true, width: 14, itemStyle: { color } },
        axisLine: { lineStyle: { width: 14, color: [[1, splitColor]] } },
        axisLabel: { color: textColor, fontSize: 10, distance: -42 },
        axisTick: { show: false },
        splitLine: { length: 10, lineStyle: { color: splitColor } },
        pointer: { width: 4, itemStyle: { color } },
        detail: { valueAnimation: true, fontSize: 28, color: textColor, offsetCenter: [0, '40%'] },
        data: [{ value: 72, name: t('charts.load') }],
        title: { color: textColor, offsetCenter: [0, '72%'] },
      },
    ],
  } as EChartsOption
}

useEcharts(el, genOption)
</script>

<style scoped>
.chart {
  width: 100%;
  height: 320px;
}
</style>
