// 用户与鉴权相关类型
export interface UserInfo {
  id: number
  username: string
  nickname?: string
  avatar: string
  roles: string[]
  /** 权限标识集合；'*' 表示超级管理员拥有全部权限 */
  permissions: string[]
  /** 个人中心展示用字段（mock 从用户表补充） */
  dept?: string
  email?: string
  phone?: string
}

export interface LoginParams {
  username: string
  password: string
}

export interface LoginResult {
  token: string
}
