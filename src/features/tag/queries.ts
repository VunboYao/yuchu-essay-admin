import { queryOptions } from '@tanstack/react-query'
import { listTags, type TagListQuery } from './api'

export const tagKeys = {
  // 全局命名空间
  all: ['tags'] as const,
  // 失效列表: 列表域（失效的"桶"）
  lists: () => [...tagKeys.all, 'list'] as const,
  // 具体某页/某搜索条件的缓存
  list: (query: TagListQuery) => [...tagKeys.lists(), query] as const,
}

export const tagQueries = {
  list: (query: TagListQuery) =>
    queryOptions({
      queryKey: tagKeys.list(query),
      queryFn: ({ signal }) => listTags(query, signal),
    }),
}
