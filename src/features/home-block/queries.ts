import { queryOptions } from '@tanstack/react-query'
import { listHomeBlocks } from './api'

export const homeBlockKeys = {
  all: ['home-blocks'] as const,
  lists: () => [...homeBlockKeys.all, 'list'] as const,
}

export const homeBlockQueries = {
  list: () =>
    queryOptions({
      queryKey: homeBlockKeys.lists(),
      queryFn: ({ signal }) => listHomeBlocks({ signal }),
    }),
}
