// 用户/鉴权接口
import { get, post, put } from '@/utils/request'
import type { LoginParams, LoginResult, UserInfo } from '@/types/user'

export function login(params: LoginParams) {
  return post<LoginResult>('/auth/login', params)
}

export function getUserInfo() {
  return get<UserInfo>('/auth/userinfo')
}

export function logout() {
  return post<null>('/auth/logout')
}

// 个人中心：获取/更新当前用户资料、修改密码
export function getProfile() {
  return get<UserInfo>('/user/profile')
}

export function updateProfile(data: { nickname?: string; email?: string; phone?: string }) {
  return put<UserInfo>('/user/profile', data)
}

export function changePassword(data: { oldPassword: string; newPassword: string }) {
  return put<null>('/user/password', data)
}
