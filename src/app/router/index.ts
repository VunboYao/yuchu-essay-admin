import { createBrowserRouter } from 'react-router'
import App, { RouteFallback } from '@/App'
import AdminLayout from '@/app/layouts/AdminLayout'
import { RedirectToDashboard } from '@/app/router/RedirectToDashboard'
import { RouteErrorBoundary } from '@/app/router/RouteErrorBoundary'

export default createBrowserRouter([
  {
    path: '/',
    // 函数引用式路由
    Component: App,
    // lazy 路由首次加载走 hydration，不是 App 里的 Suspense
    HydrateFallback: RouteFallback,
    // 错误边界
    ErrorBoundary: RouteErrorBoundary,
    children: [
      {
        path: 'login',
        lazy: () => import('@/features/auth/pages/LoginPage'),
        // 路由元信息
        handle: { title: '登录' },
      },
      {
        // 管理后台布局路由
        Component: AdminLayout,
        children: [
          // 重定向到首页
          { index: true, Component: RedirectToDashboard },
          // 数据概览
          {
            path: 'dashboard',
            handle: { title: '数据概览' },
            lazy: () => import('@/features/dashboard/pages/DashboardPage'),
          },
          {
            path: 'articles',
            handle: { title: '作文专题' },
            lazy: () => import('@/features/article/pages/ArticlePage'),
          },
          {
            path: 'essays',
            handle: { title: '优秀作文' },
            lazy: () => import('@/features/essay/pages/EssayPage'),
          },
          {
            path: 'downloads',
            handle: { title: '下载资料' },
            lazy: () => import('@/features/download/pages/DownloadPage'),
          },
          {
            path: 'taxonomy',
            handle: { title: '教材分类' },
            lazy: () => import('@/features/taxonomy/pages/TaxonomyPage'),
          },
          {
            path: 'tags',
            handle: { title: '标签管理' },
            lazy: () => import('@/features/tag/pages/TagPage'),
          },
          {
            path: 'home-blocks',
            handle: { title: '首页入口' },
            lazy: () => import('@/features/home-block/pages/HomeBlockPage'),
          },
          {
            path: 'ad-slots',
            handle: { title: '广告位' },
            lazy: () => import('@/features/ad-slot/pages/AdSlotPage'),
          },
          {
            path: 'official-accounts',
            handle: { title: '公众号导流' },
            lazy: () => import('@/features/official-account/pages/OfficialAccountPage'),
          },
          {
            path: 'feedbacks',
            handle: { title: '意见反馈' },
            lazy: () => import('@/features/feedback/pages/FeedbackPage'),
          },
          {
            path: 'operation-logs',
            handle: { title: '操作日志' },
            lazy: () => import('@/features/operation-log/pages/OperationLogPage'),
          },
        ],
      },
      { path: '*', Component: RedirectToDashboard },
    ],
  },
])
