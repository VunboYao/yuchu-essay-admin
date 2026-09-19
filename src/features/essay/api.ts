import { del, get, post, put } from '@/shared/api'
import type { PageData, EssayExample, EssayExampleDetail } from '@/shared/types'
import type { EnableStatus, Grade } from '@/shared/constants/options'
import type { EssayWriteOutput } from './schemas'

export type EssayListQuery = {
  keyword?: string
  grade: '' | Grade
  articleId: number | ''
  tagId: number | ''
  status: '' | EnableStatus
  page: number
  pageSize: number
}

function toListParams(query: EssayListQuery) {
  return {
    keyword: query.keyword?.trim() || undefined,
    grade: query.grade === '' ? undefined : query.grade,
    articleId: query.articleId === '' ? undefined : query.articleId,
    tagId: query.tagId === '' ? undefined : query.tagId,
    status: query.status === '' ? undefined : query.status,
    page: query.page,
    pageSize: query.pageSize,
  }
}

export function listEssays(
  query: EssayListQuery,
  signal?: AbortSignal,
): Promise<PageData<EssayExample>> {
  return get<PageData<EssayExample>>('/essay-examples', {
    params: toListParams(query),
    signal,
  })
}

export function getEssay(id: number, signal?: AbortSignal): Promise<EssayExampleDetail> {
  return get<EssayExampleDetail>(`/essay-examples/${id}`, { signal })
}

export function createEssay(input: EssayWriteOutput): Promise<EssayExampleDetail> {
  return post<EssayExampleDetail>('/essay-examples', input)
}

export function updateEssay({
  id,
  input,
}: {
  id: number
  input: EssayWriteOutput
}): Promise<EssayExampleDetail> {
  return put<EssayExampleDetail>(`/essay-examples/${id}`, input)
}

export function deleteEssay(id: number): Promise<{ id: number }> {
  return del<{ id: number }>(`/essay-examples/${id}`)
}
