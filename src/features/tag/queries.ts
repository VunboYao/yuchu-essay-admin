import { queryOptions } from '@tanstack/react-query'
import { listTags, type TagListQuery } from './api'

export const tagKeys = {
  all: ['tags'] as const,
  // 失效列表
  lists: () => [...tagKeys.all, 'list'] as const,
  // 订阅列表的查询参数
  list: (query: TagListQuery) => [...tagKeys.lists(), query] as const,
}

export const tagQueries = {
  list: (query: TagListQuery) =>
    queryOptions({
      queryKey: tagKeys.list(query),
      queryFn: ({ signal }) => listTags(query, signal),
    }),
}
