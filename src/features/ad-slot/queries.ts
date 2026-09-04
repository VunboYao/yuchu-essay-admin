import { queryOptions } from '@tanstack/react-query'
import { listAdSlots } from './api'

export const adSlotKeys = {
  all: ['ad-slots'] as const,
  lists: () => [...adSlotKeys.all, 'list'] as const,
}

export const adSlotQueries = {
  list: () =>
    queryOptions({
      queryKey: adSlotKeys.lists(),
      queryFn: ({ signal }) => listAdSlots(signal),
    }),
}
