import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 30秒后缓存过期,陈旧,而非删除
      staleTime: 30_000,
      // 重试1次
      retry: 1,
      // 窗口聚焦时不重新请求
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})
