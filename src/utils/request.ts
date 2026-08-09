// 统一 HTTP 封装（Axios）
// - 请求拦截：自动附带 Bearer Token
// - 响应拦截：统一解包 { code, message, data }，非 0 自动报错
// - 401 自动清除登录态
// 接口层与 Mock 解耦：当前由 vite-plugin-mock 提供 /api 接口，
// 接入真实后端时只需将 mock 关闭、后端实现相同契约即可。
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { getToken, removeToken } from './auth'
import { dispatchMock } from '@/mock/browser'

const service = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// 浏览器端 Mock（所有环境统一启用）
// 采用「axios 自定义 adapter 在浏览器内直接拦截 /api」方案，dev / preview / 部署 Demo 行为完全一致，
// 不再依赖 vite-plugin-mock 的服务端中间件（避免双数据源分裂、且 prod 构建对 mockjs 脆弱依赖）。
// 接入真实后端时：删除此 adapter 即可（见 vite.config.ts 中 viteMockServe 已停用）。
service.defaults.adapter = async (config) => {
  const url = (config.baseURL || '') + (config.url || '')
  const result = dispatchMock({
    url,
    method: (config.method || 'get').toLowerCase(),
    headers: (config.headers || {}) as Record<string, string>,
    body: config.data ? (typeof config.data === 'string' ? safeJson(config.data) : config.data) : undefined,
    params: (config.params as Record<string, unknown>) || undefined,
  })
  if (result) {
    return {
      data: result.data,
      status: result.status,
      statusText: 'OK',
      headers: {},
      config,
      request: {},
    } as unknown as import('axios').AxiosResponse
  }
  // 未匹配到 mock：直接抛错（便于排查遗漏的接口）
  throw new Error(`[mock] 未匹配的接口: ${config.method?.toUpperCase()} ${url}`)
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return s
  }
}

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    const body = response.data
    // 约定：code === 0 为成功
    if (body.code !== 0) {
      ElMessage.error(body.message || '请求失败')
      return Promise.reject(body)
    }
    return body.data
  },
  (error) => {
    const status = error.response?.status
    if (status === 401) {
      removeToken()
      ElMessage.error('登录已失效，请重新登录')
      // 跳登录页（避免循环：登录页本身不触发）
      if (location.pathname !== '/login') {
        location.href = '/login'
      }
    } else {
      ElMessage.error(error.message || '网络错误')
    }
    return Promise.reject(error)
  },
)

// 类型友好的封装
export function get<T = unknown>(url: string, params?: unknown): Promise<T> {
  return service.get(url, { params }) as Promise<T>
}

export function post<T = unknown>(url: string, data?: unknown): Promise<T> {
  return service.post(url, data) as Promise<T>
}

export function put<T = unknown>(url: string, data?: unknown): Promise<T> {
  return service.put(url, data) as Promise<T>
}

export function del<T = unknown>(url: string, params?: unknown): Promise<T> {
  return service.delete(url, { params }) as Promise<T>
}

export default service
