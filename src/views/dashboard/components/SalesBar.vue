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
  return {
    color: [color],
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 44, right: 20, top: 24, bottom: 30 },
    xAxis: {
      type: 'category',
      data: [t('charts.catElectronics'), t('charts.catApparel'), t('charts.catFood'), t('charts.catHome'), t('charts.catBeauty'), t('charts.catBooks')],
      axisLine: { lineStyle: { color: axisColor } },
      axisLabel: { color: textColor },
    },
    yAxis: {
      type: 'value',
      name: t('charts.salesUnit'),
      nameTextStyle: { color: textColor },
      axisLabel: { color: textColor },
      splitLine: { lineStyle: { color: splitColor } },
    },
    series: [
      {
        name: t('charts.salesMonth'),
        type: 'bar',
        barWidth: '46%',
        itemStyle: { borderRadius: [6, 6, 0, 0] },
        data: [120, 200, 150, 80, 170, 110],
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
