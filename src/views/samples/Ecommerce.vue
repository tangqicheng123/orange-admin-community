<template>
  <div class="sample-page">
    <el-card shadow="never" :header="t('samples.ecomTitle')">
      <el-alert :closable="false" show-icon type="primary" :title="t('samples.ecomIntro')" style="margin-bottom: 16px" />

      <!-- 汇总卡片 -->
      <el-row :gutter="16" class="stat-row">
        <el-col :xs="12" :sm="6">
          <el-card shadow="hover" class="stat">
            <div class="stat-label">{{ t('samples.ecomStatTotal') }}</div>
            <div class="stat-value">{{ summary.total }}</div>
          </el-card>
        </el-col>
        <el-col :xs="12" :sm="6">
          <el-card shadow="hover" class="stat">
            <div class="stat-label">{{ t('samples.ecomStatAmount') }}</div>
            <div class="stat-value">¥{{ summary.amount.toLocaleString() }}</div>
          </el-card>
        </el-col>
        <el-col :xs="12" :sm="6">
          <el-card shadow="hover" class="stat">
            <div class="stat-label">{{ t('samples.ecomStatPaid') }}</div>
            <div class="stat-value ok">{{ summary.paid }}</div>
          </el-card>
        </el-col>
        <el-col :xs="12" :sm="6">
          <el-card shadow="hover" class="stat">
            <div class="stat-label">{{ t('samples.ecomStatPending') }}</div>
            <div class="stat-value warn">{{ summary.pending }}</div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 搜索栏 -->
      <div class="toolbar">
        <el-input v-model="query.keyword" :placeholder="t('samples.ecomKeywordPh')" clearable style="width: 220px" @keyup.enter="loadData" />
        <el-select v-model="query.status" :placeholder="t('samples.ecomStatusPh')" clearable style="width: 130px">
          <el-option :label="t('samples.ecomStatusPaid')" value="paid" />
          <el-option :label="t('samples.ecomStatusPending')" value="pending" />
          <el-option :label="t('samples.ecomStatusShipped')" value="shipped" />
          <el-option :label="t('samples.ecomStatusDone')" value="done" />
          <el-option :label="t('samples.ecomStatusRefund')" value="refund" />
        </el-select>
        <el-button type="primary" :icon="'Search'" @click="loadData">{{ t('common.search') }}</el-button>
        <el-button :icon="'Refresh'" @click="resetQuery">{{ t('common.reset') }}</el-button>
      </div>

      <!-- 表格 -->
      <el-table :data="tableData" v-loading="loading" border stripe style="width: 100%">
        <el-table-column prop="no" :label="t('samples.ecomColNo')" width="130" />
        <el-table-column prop="customer" :label="t('samples.ecomColCustomer')" min-width="120" />
        <el-table-column prop="product" :label="t('samples.ecomColProduct')" min-width="140" />
        <el-table-column prop="amount" :label="t('samples.ecomColAmount')" width="110" align="right">
          <template #default="{ row }">¥{{ (row as OrderRow).amount.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="status" :label="t('samples.ecomColStatus')" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusType((row as OrderRow).status)" size="small">{{ statusLabel((row as OrderRow).status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="time" :label="t('samples.ecomColTime')" width="150" />
      </el-table>

      <PagePager
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        @current-change="loadData"
        @size-change="loadData"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { get } from '@/utils/request'
import PagePager from '@/components/PagePager.vue'

interface OrderRow {
  id: number
  no: string
  customer: string
  product: string
  amount: number
  status: 'paid' | 'pending' | 'shipped' | 'done' | 'refund'
  time: string
}

const { t } = useI18n()

const loading = ref(false)
const tableData = ref<OrderRow[]>([])
const total = ref(0)
const summary = reactive({ total: 0, amount: 0, paid: 0, pending: 0 })
const query = reactive({ keyword: '', status: '' as string, page: 1, pageSize: 10 })

const statusMap: Record<OrderRow['status'], { label: string; type: 'success' | 'warning' | 'info' | 'primary' | 'danger' }> = {
  paid: { label: t('samples.ecomStatusPaid'), type: 'success' },
  pending: { label: t('samples.ecomStatusPending'), type: 'warning' },
  shipped: { label: t('samples.ecomStatusShipped'), type: 'primary' },
  done: { label: t('samples.ecomStatusDone'), type: 'info' },
  refund: { label: t('samples.ecomStatusRefund'), type: 'danger' },
}
function statusLabel(s: OrderRow['status']) {
  return statusMap[s].label
}
function statusType(s: OrderRow['status']) {
  return statusMap[s].type
}

async function loadData() {
  loading.value = true
  try {
    const res = await get<{ list: OrderRow[]; total: number; summary: typeof summary }>('/samples/ecommerce/orders', { ...query })
    tableData.value = res.list
    total.value = res.total
    Object.assign(summary, res.summary)
  } finally {
    loading.value = false
  }
}

function resetQuery() {
  query.keyword = ''
  query.status = ''
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
</style>
