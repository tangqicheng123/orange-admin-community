// Mock 鉴权接口（vite-plugin-mock）
// 演示账号：
//   admin / 123456  （超级管理员，拥有全部权限 *）
//   user  / 123456  （普通用户，仅部分权限）
import type { MockMethod } from 'vite-plugin-mock'

function isAdmin(headers: Record<string, string> = {}): boolean {
  const auth = headers.authorization || headers.Authorization || ''
  return auth.includes('admin')
}

export default [
  {
    url: '/api/auth/login',
    method: 'post',
    response: ({ body }: { body: { username: string; password: string } }) => {
      const { username, password } = body || {}
      if (password !== '123456') {
        return { code: 1, message: '用户名或密码错误', data: null }
      }
      const token = username === 'admin' ? 'mock-token-admin' : `mock-token-${username}`
      return { code: 0, message: 'ok', data: { token } }
    },
  },
  {
    url: '/api/auth/userinfo',
    method: 'get',
    response: ({ headers }: { headers?: Record<string, string> }) => {
      const admin = isAdmin(headers)
      return {
        code: 0,
        message: 'ok',
        data: {
          id: 1,
          username: admin ? 'admin' : 'user',
          avatar: '',
          roles: admin ? ['admin'] : ['user'],
          permissions: admin ? ['*'] : ['dashboard:view', 'user:view', 'profile:edit'],
        },
      }
    },
  },
  {
    url: '/api/auth/logout',
    method: 'post',
    response: () => ({ code: 0, message: 'ok', data: null }),
  },
] as MockMethod[]
