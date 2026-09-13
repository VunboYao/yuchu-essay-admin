import { queryOptions } from '@tanstack/react-query'
import { listArticles, getArticle, type ArticleListQuery } from './api'

export const articleKeys = {
  all: ['articles'] as const,
  lists: () => [...articleKeys.all, 'list'] as const,
  list: (query: ArticleListQuery) => [...articleKeys.lists(), query] as const,
  details: () => [...articleKeys.all, 'detail'] as const,
  detail: (id: number) => [...articleKeys.details(), id] as const,
}

export const articleQueries = {
  list: (query: ArticleListQuery) =>
    queryOptions({
      queryKey: articleKeys.list(query),
      queryFn: ({ signal }) => listArticles(query, signal),
    }),
  detail: (id: number) =>
    queryOptions({
      queryKey: articleKeys.detail(id),
      queryFn: ({ signal }) => getArticle(id, signal),
    }),
}
