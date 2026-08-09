<template>
  <div class="dashboard">
    <div class="welcome">
      <div class="welcome-title">{{ t('dashboard.welcomeTitle') }}</div>
      <div class="welcome-sub">{{ t('dashboard.welcomeSub') }}</div>
    </div>

    <div class="scenarios">
      <div class="scenarios-title">{{ t('dashboard.scenarioTitle') }}</div>
      <el-row :gutter="16">
        <el-col v-for="s in scenarios" :key="s.name" :xs="12" :sm="6">
          <el-card shadow="hover" class="scenario-card" @click="goScenario(s.path)">
            <div class="scenario-icon">{{ s.icon }}</div>
            <div class="scenario-name">{{ s.name }}</div>
            <div class="scenario-desc">{{ s.desc }}</div>
            <div class="scenario-go">→ {{ t('dashboard.scenarioEnter') }}</div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <el-row :gutter="16">
      <el-col v-for="card in statCards" :key="card.title" :xs="12" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat">
            <div class="meta">
              <div class="title">{{ card.title }}</div>
              <div class="value">{{ card.value }}</div>
              <div class="trend" :class="card.up ? 'up' : 'down'">
                <el-icon><component :is="card.up ? 'CaretTop' : 'CaretBottom'" /></el-icon>
                {{ card.rate }}
              </div>
            </div>
            <el-icon class="icon" :style="{ color: card.color }"><component :is="card.icon" /></el-icon>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="mt">
      <el-col :xs="24" :lg="16">
        <el-card shadow="never" :header="t('dashboard.chartVisit')">
          <VisitTrend />
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="8">
        <el-card shadow="never" :header="t('dashboard.chartSource')">
          <SourcePie />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="mt">
      <el-col :xs="24" :lg="12">
        <el-card shadow="never" :header="t('dashboard.chartSales')">
          <SalesBar />
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="12">
        <el-card shadow="never" :header="t('dashboard.chartMonitor')">
          <MonitorGauge />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import VisitTrend from './components/VisitTrend.vue'
import SourcePie from './components/SourcePie.vue'
import SalesBar from './components/SalesBar.vue'
import MonitorGauge from './components/MonitorGauge.vue'

const { t } = useI18n()

// 用 computed 包裹，确保切换语言时卡片标题实时刷新
const statCards = computed(() => [
  { title: t('dashboard.cardUser'), value: '1,280', icon: 'User', color: '#ff7a00', up: true, rate: '12.5%' },
  { title: t('dashboard.cardVisit'), value: '3,642', icon: 'View', color: '#409eff', up: true, rate: '8.2%' },
  { title: t('dashboard.cardOrder'), value: '892', icon: 'ShoppingCart', color: '#67c23a', up: true, rate: '3.1%' },
  { title: t('dashboard.cardTodo'), value: '36', icon: 'Warning', color: '#e6a23c', up: false, rate: '5.4%' },
])

// 可交付场景：让"接单交付"变具体可见，点击进入真实样板页
const scenarios = computed(() => [
  { icon: '🛒', name: t('dashboard.scenarioEcom'), desc: t('dashboard.scenarioEcomDesc'), path: '/samples/ecommerce' },
  { icon: '🤝', name: t('dashboard.scenarioCrm'), desc: t('dashboard.scenarioCrmDesc'), path: '/samples/crm' },
  { icon: '📊', name: t('dashboard.scenarioBoard'), desc: t('dashboard.scenarioBoardDesc'), path: '/dashboard' },
  { icon: '🏢', name: t('dashboard.scenarioInner'), desc: t('dashboard.scenarioInnerDesc'), path: '/system/user' },
])

const router = useRouter()
function goScenario(path: string) {
  router.push(path)
}
</script>

<style scoped>
.welcome {
  margin-bottom: 16px;
  padding: 18px 20px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--el-color-primary-light-9), var(--el-color-warning-light-9));
  border: 1px solid var(--el-border-color-lighter);
}
.welcome-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}
.welcome-sub {
  margin-top: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.scenarios {
  margin-bottom: 16px;
}
.scenarios-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 12px;
}
.scenario-card {
  text-align: center;
  height: 100%;
  cursor: pointer;
  transition: transform 0.15s ease;
}
.scenario-card:hover {
  transform: translateY(-3px);
}
.scenario-icon {
  font-size: 30px;
  line-height: 1;
  margin-bottom: 8px;
}
.scenario-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.scenario-desc {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.scenario-go {
  margin-top: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-color-primary);
}
.stat-card .stat {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.stat .title {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.stat .value {
  font-size: 24px;
  font-weight: 700;
  margin-top: 6px;
}
.stat .trend {
  font-size: 12px;
  margin-top: 6px;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.stat .trend.up {
  color: var(--el-color-success);
}
.stat .trend.down {
  color: var(--el-color-danger);
}
.stat .icon {
  font-size: 40px;
}
.mt {
  margin-top: 16px;
}
</style>