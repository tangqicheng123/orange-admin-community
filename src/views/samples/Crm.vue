<template>
  <div class="sample-page">
    <el-card shadow="never" :header="t('samples.crmTitle')">
      <el-alert :closable="false" show-icon type="success" :title="t('samples.crmIntro')" style="margin-bottom: 16px" />

      <!-- 汇总卡片 -->
      <el-row :gutter="16" class="stat-row">
        <el-col :xs="12" :sm="6">
          <el-card shadow="hover" class="stat">
            <div class="stat-label">{{ t('samples.crmStatTotal') }}</div>
            <div class="stat-value">{{ summary.total }}</div>
          </el-card>
        </el-col>
        <el-col :xs="12" :sm="6">
          <el-card shadow="hover" class="stat">
            <div class="stat-label">{{ t('samples.crmStatValue') }}</div>
            <div class="stat-value">¥{{ summary.value.toLocaleString() }}</div>
          </el-card>
        </el-col>
        <el-col :xs="12" :sm="6">
          <el-card shadow="hover" class="stat">
            <div class="stat-label">{{ t('samples.crmStatWon') }}</div>
            <div class="stat-value ok">{{ summary.won }}</div>
          </el-card>
        </el-col>
        <el-col :xs="12" :sm="6">
          <el-card shadow="hover" class="stat">
            <div class="stat-label">{{ t('samples.crmStatFollow') }}</div>
            <div class="stat-value warn">{{ summary.follow }}</div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 搜索栏 -->
      <div class="toolbar">
        <el-input v-model="query.keyword" :placeholder="t('samples.crmKeywordPh')" clearable style="width: 220px" @keyup.enter="loadData" />
        <el-select v-model="query.stage" :placeholder="t('samples.crmStagePh')" clearable style="width: 130px">
          <el-option :label="t('samples.crmStageLead')" value="lead" />
          <el-option :label="t('samples.crmStageContact')" value="contact" />
          <el-option :label="t('samples.crmStageProposal')" value="proposal" />
          <el-option :label="t('samples.crmStageWon')" value="won" />
          <el-option :label="t('samples.crmStageLost')" value="lost" />
        </el-select>
        <el-button type="primary" :icon="'Search'" @click="loadData">{{ t('common.search') }}</el-button>
        <el-button :icon="'Refresh'" @click="resetQuery">{{ t('common.reset') }}</el-button>
      </div>

      <!-- 表格 -->
      <el-table :data="tableData" v-loading="loading" border stripe style="width: 100%">
        <el-table-column prop="account" :label="t('samples.crmColName')" min-width="180" show-overflow-tooltip />
        <el-table-column prop="contact" :label="t('samples.crmColContact')" min-width="120" />
        <el-table-column prop="stage" :label="t('samples.crmColStage')" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="stageType((row as LeadRow).stage)" size="small">{{ stageLabel((row as LeadRow).stage) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="amount" :label="t('samples.crmColAmount')" width="120" align="right">
          <template #default="{ row }">¥{{ (row as LeadRow).amount.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="owner" :label="t('samples.crmColOwner')" width="100" />
        <el-table-column prop="time" :label="t('samples.crmColTime')" width="150" />
      </el-table>

      <div class="pager">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @current-change="loadData"
          @size-change="loadData"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { get } from '@/utils/request'

interface LeadRow {
  id: number
  account: string
  contact: string
  stage: 'lead' | 'contact' | 'proposal' | 'won' | 'lost'
  amount: number
  owner: string
  time: string
}

const { t } = useI18n()

const loading = ref(false)
const tableData = ref<LeadRow[]>([])
const total = ref(0)
const summary = reactive({ total: 0, value: 0, won: 0, follow: 0 })
const query = reactive({ keyword: '', stage: '' as string, page: 1, pageSize: 10 })

const stageMap: Record<LeadRow['stage'], { label: string; type: 'info' | 'warning' | 'primary' | 'success' | 'danger' }> = {
  lead: { label: t('samples.crmStageLead'), type: 'info' },
  contact: { label: t('samples.crmStageContact'), type: 'warning' },
  proposal: { label: t('samples.crmStageProposal'), type: 'primary' },
  won: { label: t('samples.crmStageWon'), type: 'success' },
  lost: { label: t('samples.crmStageLost'), type: 'danger' },
}
function stageLabel(s: LeadRow['stage']) {
  return stageMap[s].label
}
function stageType(s: LeadRow['stage']) {
  return stageMap[s].type
}

async function loadData() {
  loading.value = true
  try {
    const res = await get<{ list: LeadRow[]; total: number; summary: typeof summary }>('/samples/crm/leads', { ...query })
    tableData.value = res.list
    total.value = res.total
    Object.assign(summary, res.summary)
  } finally {
    loading.value = false
  }
}

function resetQuery() {
  query.keyword = ''
  query.stage = ''
  query.page = 1
  loadData()
}

onMounted(loadData)
</script>

<style scoped>
.sample-page {
  padding: 0;
}
.stat-row {
  margin-bottom: 16px;
}
.stat {
  text-align: center;
}
.stat-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.stat-value {
  font-size: 24px;
  font-weight: 700;
  margin-top: 6px;
  color: var(--el-color-primary);
}
.stat-value.ok {
  color: var(--el-color-success);
}
.stat-value.warn {
  color: var(--el-color-warning);
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}
.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}
</style>
