import { get, post, put } from '@/shared/api'
import type { PageData, Article, ArticleDetail } from '@/shared/types'
import type {
  Grade,
  Semester,
  Unit,
  ContentType,
  ArticlePublishStatus,
} from '@/shared/constants/options'
import type { ArticleWriteOutput } from './schemas'

export interface ArticleListQuery {
  grade?: Grade
  semester?: Semester
  unit?: Unit
  contentType?: ContentType
  status?: ArticlePublishStatus
  keyword?: string
  tagId?: number
  page: number
  pageSize: number
}

export function listArticles(
  params: ArticleListQuery,
  signal?: AbortSignal,
): Promise<PageData<Article>> {
  return get<PageData<Article>>('/articles', { params, signal })
}

export function getArticle(id: number, signal?: AbortSignal): Promise<ArticleDetail> {
  return get<ArticleDetail>(`/articles/${id}`, { signal })
}

export function createArticle(
  input: ArticleWriteOutput,
  signal?: AbortSignal,
): Promise<ArticleDetail> {
  return post<ArticleDetail>('/articles', { input, signal })
}

export function updateArticle({
  id,
  input,
}: {
  id: number
  input: ArticleWriteOutput
}): Promise<ArticleDetail> {
  return put<ArticleDetail>(`/articles/${id}`, { input })
}

export function updateArticleStatus({ id, status }: { id: number; status: ArticlePublishStatus }) {
  return put<void>(`/articles/${id}/status`, { status })
}
