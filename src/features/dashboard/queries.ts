import { queryOptions } from '@tanstack/react-query'
import { getAdEvents, getHotArticles, getHotDownloads, getHotSearches, getOverview } from './api'

export const dashboardKeys = {
  all: ['stats'] as const,
  overview: () => [...dashboardKeys.all, 'overview'] as const,
  hotArticles: () => [...dashboardKeys.all, 'hot-articles'] as const,
  hotSearches: () => [...dashboardKeys.all, 'hot-searches'] as const,
  hotDownloads: () => [...dashboardKeys.all, 'hot-downloads'] as const,
  adEvents: () => [...dashboardKeys.all, 'ad-events'] as const,
}

export const dashboardQueries = {
  overview: () =>
    queryOptions({
      queryKey: dashboardKeys.overview(),
      queryFn: ({ signal }) => getOverview({ signal }),
    }),
  hotArticles: () =>
    queryOptions({
      queryKey: dashboardKeys.hotArticles(),
      queryFn: ({ signal }) => getHotArticles({ signal }),
    }),
  hotSearches: () =>
    queryOptions({
      queryKey: dashboardKeys.hotSearches(),
      queryFn: ({ signal }) => getHotSearches({ signal }),
    }),
  hotDownloads: () =>
    queryOptions({
      queryKey: dashboardKeys.hotDownloads(),
      queryFn: ({ signal }) => getHotDownloads({ signal }),
    }),
  adEvents: () =>
    queryOptions({
      queryKey: dashboardKeys.adEvents(),
      queryFn: ({ signal }) => getAdEvents({ signal }),
    }),
}
