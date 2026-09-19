import { queryOptions } from '@tanstack/react-query'
import { listEssays, getEssay, type EssayListQuery } from './api'

export const essayKeys = {
  all: ['essays'] as const,
  lists: () => [...essayKeys.all, 'list'] as const,
  list: (query: EssayListQuery) => [...essayKeys.lists(), query] as const,
  details: () => [...essayKeys.all, 'detail'] as const,
  detail: (id: number) => [...essayKeys.details(), id] as const,
}

export const essayQueries = {
  list: (query: EssayListQuery) =>
    queryOptions({
      queryKey: essayKeys.list(query),
      queryFn: ({ signal }) => listEssays(query, signal),
    }),
  detail: (id: number) =>
    queryOptions({
      queryKey: essayKeys.detail(id),
      queryFn: ({ signal }) => getEssay(id, signal),
    }),
}
