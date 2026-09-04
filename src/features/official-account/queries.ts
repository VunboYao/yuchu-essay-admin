import { queryOptions } from '@tanstack/react-query'
import { listOfficialAccounts } from './api'

export const OfficialAccountKeys = {
  all: ['officialAccountConfigs'] as const,
  lists: () => [...OfficialAccountKeys.all, 'list'] as const,
}

export const officialAccountQueries = {
  list: () =>
    queryOptions({
      queryKey: OfficialAccountKeys.lists(),
      queryFn: ({ signal }) => listOfficialAccounts(signal),
    }),
}
