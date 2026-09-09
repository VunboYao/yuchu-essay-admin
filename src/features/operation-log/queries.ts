import { queryOptions } from '@tanstack/react-query'

import { getOperationLogList, type OperationLogListParams } from './api'

export const operationLogKeys = {
  all: ['operation-logs'],
  lists: () => [...operationLogKeys.all, 'list'] as const,
  list: (query: OperationLogListParams) => [...operationLogKeys.lists(), query] as const,
}

export const operationLogQueries = {
  list: (query: OperationLogListParams) =>
    queryOptions({
      queryKey: operationLogKeys.list(query),
      queryFn: ({ signal }) => getOperationLogList(query, signal),
    }),
}
