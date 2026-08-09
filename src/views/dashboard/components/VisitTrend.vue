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
  const axisColor = appStore.isDark ? '#4c4d4f' : '#dcdfe6'
  const splitColor = appStore.isDark ? 'rgba(255,255,255,0.08)' : '#ebeef5'
  const color = appStore.themeColor
  const days = [t('charts.mon'), t('charts.tue'), t('charts.wed'), t('charts.thu'), t('charts.fri'), t('charts.sat'), t('charts.sun')]
  return {
    color: [color, '#13c2c2'],
    tooltip: { trigger: 'axis' },
    legend: { data: [t('charts.visit'), t('charts.order')], textStyle: { color: textColor } },
    grid: { left: 44, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: days,
      axisLine: { lineStyle: { color: axisColor } },
      axisLabel: { color: textColor },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: textColor },
      splitLine: { lineStyle: { color: splitColor } },
    },
    series: [
      {
        name: t('charts.visit'),
        type: 'line',
        smooth: true,
        areaStyle: { opacity: 0.15 },
        data: [3200, 3320, 3010, 3344, 3900, 3300, 4200],
      },
      {
        name: t('charts.order'),
        type: 'line',
        smooth: true,
        areaStyle: { opacity: 0.15 },
        data: [820, 932, 901, 934, 1290, 1330, 1520],
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
