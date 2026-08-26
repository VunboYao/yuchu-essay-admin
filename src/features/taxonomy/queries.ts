import { queryOptions } from '@tanstack/react-query'
import { listTaxonomyUnits, type getTaxonomyUnitsList } from './api'

export const taxonomyUnitKeys = {
  all: ['taxonomyUnits'] as const,
  lists: () => [...taxonomyUnitKeys.all, 'list'] as const,
  list: (query: getTaxonomyUnitsList) => [...taxonomyUnitKeys.lists(), query] as const,
}

export const taxonomyUnitQueries = {
  list: (query: getTaxonomyUnitsList) =>
    queryOptions({
      queryKey: taxonomyUnitKeys.list(query),
      queryFn: ({ signal }) => listTaxonomyUnits(query, signal),
    }),
}
