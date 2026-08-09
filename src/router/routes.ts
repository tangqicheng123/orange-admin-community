import type { RouteRecordRaw } from 'vue-router'

// 静态骨架路由：只保留布局容器与公开页面。
// 业务菜单（dashboard/system/components 及其子页）由菜单表动态注入（见 router/dynamic.ts + router/index.ts）。
// 注意：动态子路由使用绝对 path（如 '/dashboard'、'/system/user'），由 addRoute('Root', ...) 挂到根布局下；
// vue-router 对以 / 开头的子路由 path 不拼接父 path，避免嵌套拼出 /system/system/user 这类错误路径。
export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', public: true },
  },
  {
    path: '/',
    name: 'Root',
    component: () => import('@/views/layout/index.vue'),
    redirect: '/dashboard',
    meta: { title: '首页' },
    children: [
      // 个人中心：用户级功能，不属于业务菜单表，作为静态子路由挂在布局下，
      // 所有已登录用户均可访问（不加 meta.permission，守卫不会拦截）。
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/profile/index.vue'),
        meta: { title: 'app.profile' },
      },
    ],
  },
  {
    path: '/403',
    name: '403',
    component: () => import('@/views/error/403.vue'),
    meta: { title: '无访问权限', public: true },
  },
  {
    // 刷新中转：/redirect/* 会 replace 回原 path，强制组件重载
    path: '/redirect/:path(.*)',
    name: 'Redirect',
    component: () => import('@/views/redirect/index.vue'),
    meta: { title: 'redirect', public: true, hidden: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: '404',
    component: () => import('@/views/error/404.vue'),
    meta: { title: '页面不存在', public: true },
  },
]
