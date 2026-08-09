<template>
  <div />
</template>

<script setup lang="ts">
import { onBeforeMount } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// 刷新中转页：进入后将地址 replace 回原始 path，使目标组件重新挂载
const route = useRoute()
const router = useRouter()

onBeforeMount(() => {
  const { params, query } = route
  const path = (params.path as string) || ''
  router.replace({ path: '/' + path, query })
})
</script>
