import { queryOptions } from '@tanstack/react-query'
import { listDownloadFiles, type ListDownloadFilesQuery } from './api'

export const downloadKeys = {
  all: ['download'] as const,
  lists: () => [...downloadKeys.all, 'list'] as const,
  list: (query: ListDownloadFilesQuery) => [...downloadKeys.lists(), query] as const,
}

export const downloadQueries = {
  list: (query: ListDownloadFilesQuery) => {
    return queryOptions({
      queryKey: downloadKeys.list(query),
      queryFn: ({ signal }) => listDownloadFiles(query, signal),
    })
  },
}
