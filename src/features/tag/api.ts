import { del, get, post, put } from '@/shared/api/http'

export type TagStatus = 0 | 1

export type Tag = {
  id: number
  name: string
  sortOrder: number
  status: TagStatus
  createdAt: string
  updatedAt: string
}

export type PageData<T> = {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export type TagListQuery = {
  keyword: string
  status: '' | TagStatus
  page: number
  pageSize: number
}

export type TagWriteInput = {
  name: string
  sortOrder: number
  status: TagStatus
}

function toTagListParams(query: TagListQuery) {
  return {
    keyword: query.keyword.trim() || undefined,
    status: query.status === '' ? undefined : query.status,
    page: query.page,
    pageSize: query.pageSize,
  }
}

export function listTags(
  query: TagListQuery,
  signal?: AbortSignal,
): Promise<PageData<Tag>> {
  return get<PageData<Tag>>('/tags', {
    params: toTagListParams(query),
    signal,
  })
}

export function createTag(input: TagWriteInput): Promise<Tag> {
  return post<Tag>('/tags', input)
}

export function updateTag(options: {
  id: number
  input: TagWriteInput
}): Promise<Tag> {
  return put<Tag>(`/tags/${options.id}`, options.input)
}

export function deleteTag(id: number): Promise<{ id: number }> {
  return del<{ id: number }>(`/tags/${id}`)
}
