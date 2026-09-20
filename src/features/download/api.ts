import { get, post, put, del } from '@/shared/api'
import type { DownloadFile, PageData } from '@/shared/types'
import type { DownloadFileSchemaOutput } from './schemas'
import type { AccessType } from '@/shared/constants/options'

export type ListDownloadFilesQuery = {
  ownerType: '' | 'article'
  ownerId: number | ''
  accessType: '' | AccessType
  page: number
  pageSize: number
}

function toListParams(query: ListDownloadFilesQuery) {
  return {
    ownerType: query.ownerType === '' ? undefined : query.ownerType,
    ownerId: query.ownerId === '' ? undefined : query.ownerId,
    accessType: query.accessType === '' ? undefined : query.accessType,
    page: query.page,
    pageSize: query.pageSize,
  }
}

export function listDownloadFiles(
  query: ListDownloadFilesQuery,
  signal?: AbortSignal,
): Promise<PageData<DownloadFile>> {
  return get<PageData<DownloadFile>>('/download-files', { params: toListParams(query), signal })
}

export function createDownloadFile(input: DownloadFileSchemaOutput): Promise<DownloadFile> {
  return post<DownloadFile>('/download-files', input)
}

export function updateDownloadFile({
  id,
  input,
}: {
  id: number
  input: DownloadFileSchemaOutput
}): Promise<DownloadFile> {
  return put<DownloadFile>(`/download-files/${id}`, input)
}

export function deleteDownloadFile({
  id,
  confirm = false,
}: {
  id: number
  confirm?: boolean
}): Promise<void> {
  return del(`/download-files/${id}`, {
    params: confirm ? { confirm: 'true' } : undefined,
  })
}
