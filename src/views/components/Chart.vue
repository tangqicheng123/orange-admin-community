<template>
  <div class="chart-demo">
    <el-card shadow="never" class="mb">
      <template #header>
        <div class="hd">
          <span>{{ t('component.chartTitle') }}</span>
          <el-tag type="info" size="small">{{ t('component.chartTagline') }}</el-tag>
        </div>
      </template>
      <el-alert
        :closable="false"
        type="primary"
        :title="t('component.chartDesc')"
        :description="t('component.chartDescText')"
      />
    </el-card>

    <el-row :gutter="16">
      <el-col :xs="24" :lg="16">
        <el-card shadow="never" :header="t('component.chartLineArea')"><VisitTrend /></el-card>
      </el-col>
      <el-col :xs="24" :lg="8">
        <el-card shadow="never" :header="t('component.chartPie')"><SourcePie /></el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="mt">
      <el-col :xs="24" :lg="12">
        <el-card shadow="never" :header="t('component.chartBar')"><SalesBar /></el-card>
      </el-col>
      <el-col :xs="24" :lg="12">
        <el-card shadow="never" :header="t('component.chartGauge')"><MonitorGauge /></el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import VisitTrend from '@/views/dashboard/components/VisitTrend.vue'
import SourcePie from '@/views/dashboard/components/SourcePie.vue'
import SalesBar from '@/views/dashboard/components/SalesBar.vue'
import MonitorGauge from '@/views/dashboard/components/MonitorGauge.vue'

const { t } = useI18n()
</script>

<style scoped>
.mb {
  margin-bottom: 16px;
}
.mt {
  margin-top: 16px;
}
.hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>