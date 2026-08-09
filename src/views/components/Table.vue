<template>
  <el-card shadow="never" :header="t('component.tableTitle')">
    <el-alert
      class="mb"
      type="success"
      :closable="false"
      :title="t('component.tableAbility')"
      :description="t('component.tableAbilityDesc')"
    />

    <div class="toolbar">
      <el-input v-model="keyword" :placeholder="t('component.searchNameOrEmail')" clearable style="width: 220px" />
      <el-select v-model="statusFilter" :placeholder="t('component.statusFilter')" clearable style="width: 140px">
        <el-option :label="t('common.enable')" :value="1" />
        <el-option :label="t('common.disable')" :value="0" />
      </el-select>
      <el-button type="primary" :icon="'Search'" @click="current = 1">{{ t('common.search') }}</el-button>
      <el-button :icon="'Refresh'" @click="reset">{{ t('common.reset') }}</el-button>
      <el-button :icon="'CopyDocument'" @click="openCopy">{{ t('component.openCopy') }}</el-button>
    </div>

    <el-table :data="pagedData" border stripe style="width: 100%" max-height="420">
      <el-table-column type="index" label="#" width="60" align="center" />
      <el-table-column prop="name" :label="t('component.tableName')" width="120" sortable />
      <el-table-column prop="role" :label="t('component.tableRole')" width="120">
        <template #default="{ row }">
          <el-tag :type="row.role === 'admin' ? 'danger' : 'primary'" size="small">{{ displayRole(row.role) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="email" :label="t('component.tableEmail')" min-width="200" show-overflow-tooltip />
      <el-table-column prop="status" :label="t('component.tableStatus')" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
            {{ row.status === 1 ? t('common.enable') : t('common.disable') }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" :label="t('component.tableCreatedAt')" width="180" sortable />
      <el-table-column :label="t('component.tableAction')" width="160" fixed="right" align="center">
        <template #default>
          <el-button link type="primary" size="small" v-permission="'user:edit'" :icon="'Edit'">{{ t('component.tableEdit') }}</el-button>
          <el-button link type="danger" size="small" v-permission="'user:delete'" :icon="'Delete'">{{ t('component.tableDelete') }}</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-pagination
        v-model:current-page="current"
        v-model:page-size="size"
        :total="filteredData.length"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        background
      />
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

interface Row {
  name: string
  role: string
  email: string
  status: number
  createdAt: string
}

const { t } = useI18n()

// 行数据存"角色 key"，模板里用 displayRole() 实时翻译，切语言时自动刷新
const roleKeys = ['admin', 'editor', 'guest']
function displayRole(key: string): string {
  const map: Record<string, string> = {
    admin: t('component.roleAdmin'),
    editor: t('component.roleEditor'),
    guest: t('component.roleGuest'),
  }
  return map[key] ?? key
}
const names = ['张伟', '王芳', '李娜', '刘洋', '陈静', '杨帆', '赵磊', '黄敏', '周杰', '吴琼']

const allData = ref<Row[]>(
  Array.from({ length: 43 }, (_, i) => ({
    name: names[i % names.length] + (i >= names.length ? i : ''),
    role: roleKeys[i % roleKeys.length],
    email: `user${i + 1}@orange.com`,
    status: i % 4 === 0 ? 0 : 1,
    createdAt: `2026-0${(i % 8) + 1}-${String((i % 27) + 1).padStart(2, '0')} 10:${String(i % 60).padStart(2, '0')}`,
  })),
)

const keyword = ref('')
const statusFilter = ref<number | ''>('')
const current = ref(1)
const size = ref(10)

const filteredData = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return allData.value.filter((r) => {
    const matchKw = !kw || r.name.toLowerCase().includes(kw) || r.email.toLowerCase().includes(kw)
    const matchStatus = statusFilter.value === '' || r.status === statusFilter.value
    return matchKw && matchStatus
  })
})

const pagedData = computed(() => {
  const start = (current.value - 1) * size.value
  return filteredData.value.slice(start, start + size.value)
})

function reset() {
  keyword.value = ''
  statusFilter.value = ''
  current.value = 1
}

// 多标签演示：在 SPA 内部跳到同组件不同 query 的副本，纯点击即可验证"同一路由多开"
const router = useRouter()
function openCopy() {
  router.push({ path: '/components/table', query: { demo: 'copy', t: Date.now() } })
}
</script>

<style scoped>
.mb {
  margin-bottom: 16px;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}
.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>