import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { fileURLToPath, URL } from 'node:url'

// OrangeAdmin 构建配置
// - 仅引入 MIT / Apache-2.0 等宽松协议依赖，绝不引入 GPL/AGPL（合规红线）
// - Element Plus 按需自动引入，减小产物体积
export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia'],
      resolvers: [ElementPlusResolver()],
      dts: 'src/auto-imports.d.ts',
      eslintrc: { enabled: true },
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: 'src/components.d.ts',
    }),
    // 把仓库根目录的 EULA.md / LICENSE 在 build 时拷到 dist/，
    // 让定价页底部"查看授权协议 / 开源协议"链接能正确打开（避免 404 被 vue-router 兜底到 /dashboard）
    viteStaticCopy({
      targets: [
        { src: 'EULA.md', dest: '.' },
        { src: 'LICENSE', dest: '.' },
      ],
    }),
    // Mock 处理策略：统一由浏览器端 axios adapter 拦截 /api（见 src/utils/request.ts + src/mock/browser.ts），
    // 所有环境（dev / preview / 部署 Demo）行为一致，不再依赖 vite-plugin-mock 服务端中间件。
    // 接入真实后端时：删除 request.ts 中的 adapter、按需保留 viteMockServe 即可。
    // viteMockServe 已停用，避免双数据源。
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  // 每次构建自动清空 dist，避免多次构建产生的旧 hash 文件残留（曾因误判 safe-delete 防护而关闭，
  // 实测 vite 内部清空走 node fs 不受 shell 防护影响；残留会让部署包虚胖数十个重复 chunk）
  build: {
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // 将图表库单独拆包：登录/布局等首屏页面不背 ECharts 重量，
        // 各图表页按需共享同一份 vendor，避免重复打入每个页面 chunk
        manualChunks(id) {
          if (id.includes('node_modules/echarts') || id.includes('node_modules/zrender')) {
            return 'echarts'
          }
        },
      },
    },
  },
})
