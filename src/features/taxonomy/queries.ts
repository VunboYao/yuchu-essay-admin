import { queryOptions } from '@tanstack/react-query'
import { listTaxonomyUnits, type TaxonomyListQuery } from './api'

export const taxonomyUnitKeys = {
  all: ['taxonomy-units'] as const,
  lists: () => [...taxonomyUnitKeys.all, 'list'] as const,
  list: (query: TaxonomyListQuery) => [...taxonomyUnitKeys.lists(), query] as const,
}

export const taxonomyUnitQueries = {
  list: (query: TaxonomyListQuery) =>
    queryOptions({
      queryKey: taxonomyUnitKeys.list(query),
      queryFn: ({ signal }) => listTaxonomyUnits(query, signal),
    }),
}
