import { get } from '@/shared/api'
import type { AdEventsStat, Article, HotDownload, HotSearch, StatsOverview } from '@/shared/types'

export function getOverview({ signal }: { signal?: AbortSignal }): Promise<StatsOverview> {
  return get<StatsOverview>('/stats/overview', { signal })
}

export function getHotArticles({ signal }: { signal?: AbortSignal }): Promise<Article[]> {
  return get<Article[]>('/stats/hot-articles', { signal })
}

export function getHotSearches({ signal }: { signal?: AbortSignal }): Promise<HotSearch[]> {
  return get<HotSearch[]>('/stats/hot-searches', { signal })
}

export function getHotDownloads({ signal }: { signal?: AbortSignal }): Promise<HotDownload[]> {
  return get<HotDownload[]>('/stats/hot-downloads', { signal })
}

export function getAdEvents({ signal }: { signal?: AbortSignal }): Promise<AdEventsStat> {
  return get<AdEventsStat>('/stats/ad-events', { signal })
}
