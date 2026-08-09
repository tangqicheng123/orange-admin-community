<template>
  <div class="error-page">
    <el-result icon="error" title="500" sub-title="抱歉，服务器开小差了">
      <template #extra>
        <el-button type="primary" @click="router.push('/dashboard')">返回首页</el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<style scoped>
.error-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
