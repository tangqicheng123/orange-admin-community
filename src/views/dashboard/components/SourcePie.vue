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
  const color = appStore.themeColor
  return {
    color: [color, '#13c2c2', '#52c41a', '#faad14', '#f5222d'],
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, textStyle: { color: textColor } },
    series: [
      {
        name: t('charts.source'),
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: 'transparent', borderWidth: 2 },
        label: { show: false },
        data: [
          { value: 1048, name: t('charts.direct') },
          { value: 735, name: t('charts.search') },
          { value: 580, name: t('charts.social') },
          { value: 484, name: t('charts.promo') },
          { value: 300, name: t('charts.other') },
        ],
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
