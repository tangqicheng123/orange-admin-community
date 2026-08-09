<template>
  <!-- Element Plus 内置组件文案（el-pagination/el-table/el-empty/...）随 locale 切换 -->
  <el-config-provider :locale="appStore.elLocale">
    <router-view />
  </el-config-provider>
</template>

<script setup lang="ts">
import { ElConfigProvider } from 'element-plus'
import { useAppStore } from '@/store/app'

const appStore = useAppStore()
</script>