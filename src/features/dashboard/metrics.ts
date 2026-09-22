import type { StatsOverview } from '@/shared/types'

export type MetricSubTone = 'muted' | 'positive'
export type MetricAccent = 'var(--dash-jade)' | 'var(--dash-copper)' | 'var(--dash-gold)'

export interface DashboardMetric {
  label: string
  value: string
  sub: string
  subTone: MetricSubTone
  accent: MetricAccent
}

const accents: MetricAccent[] = ['var(--dash-jade)', 'var(--dash-copper)', 'var(--dash-gold)']

type MetricDraft = Omit<DashboardMetric, 'accent'>

function paint(raw: MetricDraft[]): DashboardMetric[] {
  return raw.map((item, i) => ({
    ...item,
    accent: accents[i % accents.length] ?? 'var(--dash-jade)',
  }))
}

export function formatNumber(n: number): string {
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)}w`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export function buildTodayMetrics(overview: StatsOverview): DashboardMetric[] {
  return paint([
    {
      label: 'PV（浏览量）',
      value: formatNumber(overview.pv.today),
      sub: `累计 ${overview.pv.total}`,
      subTone: 'muted',
    },
    {
      label: 'UV（登录用户）',
      value: formatNumber(overview.uv.today),
      sub: `累计 ${overview.uv.total}`,
      subTone: 'muted',
    },
    {
      label: '下载次数',
      value: formatNumber(overview.downloads.today),
      sub: `累计 ${overview.downloads.total}`,
      subTone: 'muted',
    },
    {
      label: '搜索次数',
      value: formatNumber(overview.searches.today),
      sub: `累计 ${overview.searches.total}`,
      subTone: 'muted',
    },
    {
      label: '收藏次数',
      value: formatNumber(overview.favorites.today),
      sub: `累计 ${overview.favorites.total}`,
      subTone: 'muted',
    },
    {
      label: '分享次数',
      value: formatNumber(overview.shares.today),
      sub: `累计 ${overview.shares.total}`,
      subTone: 'muted',
    },
    {
      label: '广告曝光',
      value: formatNumber(overview.ads.expose.today),
      sub: `累计 ${overview.ads.expose.total}`,
      subTone: 'muted',
    },
    {
      label: '广告点击',
      value: formatNumber(overview.ads.click.today),
      sub: `累计 ${overview.ads.click.total}`,
      subTone: 'muted',
    },
    {
      label: '激励完成',
      value: formatNumber(overview.ads.rewardedComplete.today),
      sub: `累计 ${overview.ads.rewardedComplete.total}`,
      subTone: 'muted',
    },
  ])
}

export function buildStockMetrics(overview: StatsOverview): DashboardMetric[] {
  const todayUsers = overview.users.today
  return paint([
    {
      label: '用户数',
      value: formatNumber(overview.users.total),
      sub: `今日新增 ${todayUsers > 0 ? '+' : ''}${todayUsers}`,
      subTone: todayUsers > 0 ? 'positive' : 'muted',
    },
    {
      label: '文章总数',
      value: formatNumber(overview.articles.total),
      sub: `已发布 ${overview.articles.published}`,
      subTone: 'muted',
    },
    {
      label: '优秀作文',
      value: formatNumber(overview.essays.total),
      sub: '\u00a0',
      subTone: 'muted',
    },
  ])
}
