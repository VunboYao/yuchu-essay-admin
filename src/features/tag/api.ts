import { del, get, post, put } from '@/shared/api'
import type { PageData, Tag } from '@/shared/types'
import type { EnableStatus } from '@/shared/constants/options'
import type { TagWriteOutput } from './schemas'

export type TagListQuery = {
  keyword?: string
  status: '' | EnableStatus
  page: number
  pageSize: number
}

// 处理
function toTagListParams(query: TagListQuery) {
  return {
    keyword: query?.keyword?.trim() || undefined,
    status: query.status === '' ? undefined : query.status,
    page: query.page,
    pageSize: query.pageSize,
  }
}

export function listTags(query: TagListQuery, signal?: AbortSignal): Promise<PageData<Tag>> {
  return get<PageData<Tag>>('/tags', {
    params: toTagListParams(query),
    signal,
  })
}

export function createTag(input: TagWriteOutput): Promise<Tag> {
  return post<Tag>('/tags', input)
}

export function updateTag(options: { id: number; input: TagWriteOutput }): Promise<Tag> {
  return put<Tag>(`/tags/${options.id}`, options.input)
}

export function deleteTag(id: number): Promise<{ id: number }> {
  return del<{ id: number }>(`/tags/${id}`)
}
