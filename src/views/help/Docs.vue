<template>
  <div class="help-page">
    <header class="page-head">
      <h2 class="page-title">{{ t('help.docTitle') }}</h2>
      <p class="page-intro">{{ t('help.docIntro') }}</p>
    </header>

    <!-- 快速开始：终端面板（全宽，避免 3×3 网格错位） -->
    <el-card class="quickstart" shadow="never">
      <div class="chapter-head">
        <el-icon class="chapter-icon"><Promotion /></el-icon>
        <span class="chapter-title">{{ t('help.secStart') }}</span>
      </div>
      <p class="chapter-desc">{{ t('help.secStartDesc') }}</p>
      <el-row :gutter="16" class="quickstart-row">
        <el-col v-for="block in installBlocks" :key="block.title" :xs="24" :sm="12">
          <div class="cmd-block">
            <div class="cmd-title">{{ block.title }}</div>
            <pre class="code-block"><code>{{ block.code }}</code></pre>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 功能介绍：6 张齐平卡片（已不再包含 快速开始） -->
    <el-row :gutter="16">
      <el-col v-for="c in chapters" :key="c.title" :xs="24" :sm="12" :lg="8">
        <el-card class="chapter" shadow="hover">
          <div class="chapter-head">
            <el-icon class="chapter-icon"><component :is="c.icon" /></el-icon>
            <span class="chapter-title">{{ c.title }}</span>
          </div>
          <p class="chapter-desc">{{ c.desc }}</p>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const installBlocks = computed(() => [
  {
    title: t('help.secStartInstall'),
    code: `# 安装依赖（项目存在 stylelint peer 冲突，需加该 flag）
npm install --legacy-peer-deps

# 启动开发服务器（默认 http://localhost:5173）
npm run dev`,
  },
  {
    title: t('help.secStartBuild'),
    code: `# 生产构建（含 vue-tsc 类型检查）
npm run build

# 本地预览构建产物（默认 http://localhost:4173）
npm run preview`,
  },
])

// 注意：快速开始（secStart）已上移到顶部面板，这里不再列出；保持 6 张齐平
const chapters = computed(() => [
  { icon: 'FolderOpened', title: t('help.secStruct'), desc: t('help.secStructDesc') },
  { icon: 'Brush', title: t('help.secTheme'), desc: t('help.secThemeDesc') },
  { icon: 'Switch', title: t('help.secI18n'), desc: t('help.secI18nDesc') },
  { icon: 'Lock', title: t('help.secRbac'), desc: t('help.secRbacDesc') },
  { icon: 'Connection', title: t('help.secMock'), desc: t('help.secMockDesc') },
  { icon: 'UploadFilled', title: t('help.secDeploy'), desc: t('help.secDeployDesc') },
])
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

/* 快速开始面板：背景淡化，区别于下方功能卡片 */
.quickstart {
  margin-bottom: 16px;
  background: var(--el-fill-color-light, #f5f7fa);
}
.quickstart-row {
  margin-top: 6px;
}
.cmd-block {
  height: 100%;
}
.cmd-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-regular);
  margin-bottom: 6px;
}
.code-block {
  margin: 0;
  background: var(--el-fill-color-darker, #1e1e1e);
  color: var(--el-text-color-primary);
  border-radius: 8px;
  padding: 12px 14px;
  font-size: 12.5px;
  line-height: 1.6;
  overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  white-space: pre;
}

/* 功能卡片：与之前一致，强调齐平高度 */
.chapter {
  margin-bottom: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.chapter :deep(.el-card__body) {
  width: 100%;
  flex: 1;
}
.chapter-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.chapter-icon {
  font-size: 20px;
  color: var(--el-color-primary);
}
.chapter-title {
  font-size: 16px;
  font-weight: 600;
}
.chapter-desc {
  color: var(--el-text-color-regular);
  font-size: 13px;
  line-height: 1.7;
  margin: 0;
}
</style>
