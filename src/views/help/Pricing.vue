<template>
  <div class="help-page">
    <header class="page-head">
      <h2 class="page-title">{{ t('help.pricingTitle') }}</h2>
      <p class="page-intro">{{ t('help.pricingIntro') }}</p>
    </header>

    <!-- ROI 价值锚点：算笔账 -->
    <el-card class="roi-card" shadow="never">
      <div class="roi-title">💡 {{ t('help.roiTitle') }}</div>
      <p class="roi-desc">{{ t('help.roiDesc') }}</p>
    </el-card>

    <!-- 三档授权卡片 -->
    <el-row :gutter="16" class="plan-row">
      <el-col v-for="(p, i) in plans" :key="p.name" :xs="24" :sm="8">
        <el-card class="plan-card" :class="{ featured: i === 1 }" shadow="hover">
          <div v-if="i === 1" class="badge">{{ t('help.planBusiness') }}</div>
          <h3 class="plan-name">{{ p.name }}</h3>
          <div class="plan-price">{{ p.price }}</div>
          <p class="plan-desc">{{ p.desc }}</p>
          <el-button
            :type="i === 1 ? 'primary' : 'default'"
            class="plan-btn"
            round
            @click="openContact(i)"
          >
            {{ t('help.contactTitle') }}
          </el-button>
        </el-card>
      </el-col>
    </el-row>

    <!-- 权益对比表 -->
    <el-card class="compare-card" shadow="never">
      <el-table :data="rows" border style="width: 100%">
        <el-table-column prop="feature" :label="t('help.compareFeature')" width="220" />
        <el-table-column :label="t('help.comparePersonal')" align="center">
          <template #default="{ row }">{{ row.personal }}</template>
        </el-table-column>
        <el-table-column :label="t('help.compareBusiness')" align="center">
          <template #default="{ row }">{{ row.business }}</template>
        </el-table-column>
        <el-table-column :label="t('help.compareExtended')" align="center">
          <template #default="{ row }">{{ row.extended }}</template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 协议与联系 -->
    <el-card class="contact-card" shadow="never">
      <h3 class="contact-title">{{ t('help.contactTitle') }}</h3>
      <p class="contact-desc">{{ t('help.contactDesc') }}</p>
      <p class="eula-note">{{ t('help.eulaNote') }}</p>
      <div class="links">
        <el-link type="primary" :href="eulaUrl" target="_blank">{{ t('help.viewEula') }}</el-link>
        <el-link type="primary" :href="licenseUrl" target="_blank">{{ t('help.viewLicense') }}</el-link>
      </div>
    </el-card>

    <!-- 联系弹窗：点击任一档位按钮都会弹出，标注当前档位 -->
    <el-dialog
      v-model="dialogVisible"
      :title="t('help.contactTitle')"
      width="520px"
      class="contact-dialog"
      :close-on-click-modal="false"
      @closed="onDialogClosed"
    >
      <div class="dialog-body">
        <p class="dialog-greeting">{{ t('help.dialogGreeting') }}</p>

        <div class="tier-row">
          <span class="tier-label">{{ t('help.dialogSelectedLabel') }}：</span>
          <el-tag :type="selectedTier === 1 ? 'danger' : 'primary'" effect="dark" size="large">
            {{ plans[selectedTier]?.name }} · {{ plans[selectedTier]?.price }}
          </el-tag>
        </div>

        <ul class="contact-list">
          <li>
            <span class="contact-key">📧 {{ t('help.dialogEmailLabel') }}</span>
            <a class="contact-val" :href="`mailto:${CONTACT_INFO.email}`">{{ CONTACT_INFO.email }}</a>
          </li>
          <li>
            <span class="contact-key">💬 {{ t('help.dialogWechatLabel') }}</span>
            <span class="contact-val">{{ CONTACT_INFO.wechat }}</span>
          </li>
          <li>
            <span class="contact-key">🐙 {{ t('help.dialogGithubLabel') }}</span>
            <a v-if="CONTACT_INFO.github" class="contact-val" :href="CONTACT_INFO.github" target="_blank">{{ CONTACT_INFO.github }}</a>
            <span v-else class="contact-val">暂未开源 · 可加微信交流</span>
          </li>
        </ul>

        <p class="dialog-note">{{ t('help.dialogNeedTier') }}</p>
        <el-alert
          class="dialog-tip"
          :title="t('help.dialogNote')"
          type="info"
          :closable="false"
          show-icon
        />
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">{{ t('common.close') }}</el-button>
        <el-button type="primary" @click="copyEmail">
          {{ t('help.dialogCopyEmail') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'

const { t } = useI18n()

const eulaUrl = import.meta.env.BASE_URL + 'EULA.md'
const licenseUrl = import.meta.env.BASE_URL + 'LICENSE'

// 真实售卖联系方式（2026-08-09 由唐少提供）
const CONTACT_INFO = {
  email: '1635409114@qq.com',
  wechat: 'tqc18537919248',
  github: '', // 暂未部署到 GitHub，开源后在此填入仓库地址
}

// 联系弹窗：仅一个，通过 selectedTier 区分当前展示哪一档
const dialogVisible = ref(false)
const selectedTier = ref(1)
function openContact(idx: number) {
  selectedTier.value = idx
  dialogVisible.value = true
}
function onDialogClosed() {
  // 不重置 selectedTier：保留用户最近一次选择，方便重复操作
}

async function copyEmail() {
  try {
    await navigator.clipboard.writeText(CONTACT_INFO.email)
    ElMessage.success('已复制邮箱到剪贴板')
  } catch {
    ElMessage.warning('复制失败，请手动选择邮件地址')
  }
}

const plans = computed(() => [
  { name: t('help.planPersonal'), price: t('help.planPersonalPrice'), desc: t('help.planPersonalDesc') },
  { name: t('help.planBusiness'), price: t('help.planBusinessPrice'), desc: t('help.planBusinessDesc') },
  { name: t('help.planExtended'), price: t('help.planExtendedPrice'), desc: t('help.planExtendedDesc') },
])

const rows = computed(() => {
  const split = (s: string) => s.split('/').map((x) => x.trim())
  const [p, b, e] = split(t('help.fSourceVal'))
  const [cp, cb, ce] = split(t('help.fCommercialVal'))
  const [rp, rb, re] = split(t('help.fRemoveCopyrightVal'))
  const [sp, sb, se] = split(t('help.fSupportVal'))
  const [up, ub, ue] = split(t('help.fUpdateVal'))
  return [
    { feature: t('help.fSource'), personal: p, business: b, extended: e },
    { feature: t('help.fCommercial'), personal: cp, business: cb, extended: ce },
    { feature: t('help.fRemoveCopyright'), personal: rp, business: rb, extended: re },
    { feature: t('help.fSupport'), personal: sp, business: sb, extended: se },
    { feature: t('help.fUpdate'), personal: up, business: ub, extended: ue },
  ]
})
</script>

<style scoped>
.help-page {
  padding: 8px;
}
.page-head {
  margin-bottom: 18px;
}
.page-title {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 6px;
}
.page-intro {
  color: var(--el-text-color-secondary);
  margin: 0;
}
.roi-card {
  margin-bottom: 16px;
  background: linear-gradient(135deg, var(--el-color-primary-light-9), var(--el-color-warning-light-9));
  border: 1px solid var(--el-color-primary-light-7);
}
.roi-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--el-color-primary);
  margin-bottom: 6px;
}
.roi-desc {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--el-text-color-regular);
}
.plan-row {
  margin-bottom: 16px;
}
.plan-card {
  position: relative;
  text-align: center;
  height: 100%;
}
.plan-card.featured {
  border: 1px solid var(--el-color-primary);
}
.badge {
  position: absolute;
  top: -11px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--el-color-primary);
  color: var(--el-color-white);
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 10px;
  white-space: nowrap;
}
.plan-name {
  font-size: 17px;
  margin: 8px 0 4px;
}
.plan-price {
  font-size: 24px;
  font-weight: 700;
  color: var(--el-color-primary);
  margin-bottom: 8px;
}
.plan-desc {
  color: var(--el-text-color-regular);
  font-size: 13px;
  min-height: 42px;
  margin: 0 0 4px;
}
.plan-btn {
  width: 100%;
  margin-top: 8px;
}
.compare-card,
.contact-card {
  margin-bottom: 16px;
}
.contact-title {
  font-size: 17px;
  margin: 0 0 8px;
}
.contact-desc {
  color: var(--el-text-color-regular);
  margin: 0 0 8px;
}
.eula-note {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  margin: 0 0 12px;
}
.links {
  display: flex;
  gap: 18px;
}

/* 联系弹窗 */
.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.dialog-greeting {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--el-text-color-regular);
}
.tier-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--el-fill-color-light, #f5f7fa);
  border-radius: 8px;
}
.tier-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.contact-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: 8px;
  overflow: hidden;
}
.contact-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5);
  font-size: 13.5px;
}
.contact-list li:last-child {
  border-bottom: 0;
}
.contact-key {
  width: 100px;
  flex-shrink: 0;
  color: var(--el-text-color-secondary);
}
.contact-val {
  font-weight: 500;
  color: var(--el-text-color-primary);
  word-break: break-all;
}
.dialog-note {
  margin: 0;
  font-size: 12.5px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}
.dialog-tip {
  margin: 0;
}
/* 移动端弹窗宽度自适应：窄屏占 92%，桌面不超过 520px */
:deep(.contact-dialog) {
  width: 92% !important;
  max-width: 520px;
}
</style>
