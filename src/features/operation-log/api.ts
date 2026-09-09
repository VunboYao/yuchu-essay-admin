import { get } from '@/shared/api'
import type { AdminOpLogTargetType } from '@/shared/constants/options'
import type { OperationLog, PageData } from '@/shared/types'

export type OperationLogListParams = {
  adminId: number | ''
  targetType: AdminOpLogTargetType | ''
  page: number
  pageSize: number
}

function toListParams(query: OperationLogListParams) {
  return {
    adminId: query.adminId === '' ? undefined : query.adminId,
    targetType: query.targetType === '' ? undefined : query.targetType,
    page: query.page,
    pageSize: query.pageSize,
  }
}

export function getOperationLogList(
  query: OperationLogListParams,
  signal?: AbortSignal,
): Promise<PageData<OperationLog>> {
  return get<PageData<OperationLog>>('/operation-logs', {
    params: toListParams(query),
    signal,
  })
}
