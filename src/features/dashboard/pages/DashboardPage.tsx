import type { CSSProperties, ReactNode } from 'react'
import { Button, Table, type TableProps } from 'antd'
import {
  AimOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  FundOutlined,
  ReloadOutlined,
  SearchOutlined,
  ShareAltOutlined,
  StarOutlined,
  TeamOutlined,
  TrophyOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader, QueryState, type QueryStateEnum } from '@/shared/ui'
import { ApiError } from '@/shared/api'
import type { AdSlotStat, Article, HotDownload, HotSearch } from '@/shared/types'
import { dashboardKeys, dashboardQueries } from '../queries'
import { buildStockMetrics, buildTodayMetrics, type DashboardMetric } from '../metrics'
import styles from './DashboardPage.module.css'

const todayIcons: ReactNode[] = [
  <EyeOutlined key="pv" />,
  <UserOutlined key="uv" />,
  <DownloadOutlined key="downloads" />,
  <SearchOutlined key="searches" />,
  <StarOutlined key="favorites" />,
  <ShareAltOutlined key="shares" />,
  <FundOutlined key="expose" />,
  <AimOutlined key="click" />,
  <TrophyOutlined key="reward" />,
]

const stockIcons: ReactNode[] = [
  <TeamOutlined key="users" />,
  <FileTextOutlined key="articles" />,
  <EditOutlined key="essays" />,
]

const articleColumns: TableProps<Article>['columns'] = [
  {
    title: '#',
    key: 'index',
    width: 50,
    render: (_value, _record, index) => index + 1,
  },
  { title: '标题', dataIndex: 'title', ellipsis: true },
  { title: '年级', dataIndex: 'grade', width: 70 },
  { title: '浏览', dataIndex: 'viewCount', width: 80, align: 'right' },
]

const searchColumns: TableProps<HotSearch>['columns'] = [
  {
    title: '#',
    key: 'index',
    width: 50,
    render: (_value, _record, index) => index + 1,
  },
  { title: '关键词', dataIndex: 'keyword', ellipsis: true },
  { title: '次数', dataIndex: 'count', width: 100, align: 'right' },
]

const downloadColumns: TableProps<HotDownload>['columns'] = [
  {
    title: '#',
    key: 'index',
    width: 50,
    render: (_value, _record, index) => index + 1,
  },
  { title: '文件名', dataIndex: 'fileName', ellipsis: true },
  { title: '类型', dataIndex: 'fileType', width: 80 },
  { title: '下载', dataIndex: 'downloadCount', width: 80, align: 'right' },
]

const adColumns: TableProps<AdSlotStat>['columns'] = [
  { title: '广告位', dataIndex: 'slotKey', ellipsis: true },
  { title: '曝光', dataIndex: 'expose', width: 80, align: 'right' },
  { title: '点击', dataIndex: 'click', width: 80, align: 'right' },
  { title: '激励完成', dataIndex: 'rewardedComplete', width: 90, align: 'right' },
]

function readStatus(query: { isPending: boolean; isError: boolean; data: unknown }): QueryStateEnum {
  if (query.isPending) return 'pending'
  if (query.isError && !query.data) return 'error'
  return 'success'
}

function readListStatus<T>(query: {
  isPending: boolean
  isError: boolean
  data: T[] | undefined
}): QueryStateEnum {
  const status = readStatus(query)
  if (status === 'success' && query.data?.length === 0) return 'empty'
  return status
}

function readSlotStatus(query: {
  isPending: boolean
  isError: boolean
  data: { bySlot: unknown[] } | undefined
}): QueryStateEnum {
  const status = readStatus(query)
  if (status === 'success' && query.data?.bySlot.length === 0) return 'empty'
  return status
}

function errorText(error: unknown): string {
  return error instanceof ApiError ? error.message : '加载失败'
}

function todayHint(): string {
  const now = new Date()
  return `截至 ${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 0:00 起`
}

function MetricCard({
  metric,
  icon,
  index,
}: {
  metric: DashboardMetric
  icon: ReactNode
  index: number
}) {
  return (
    <article
      className={styles.metricCard}
      style={
        {
          '--accent': metric.accent,
          '--delay': `${index * 40}ms`,
        } as CSSProperties
      }
    >
      <div className={styles.metricIcon}>{icon}</div>
      <div className={styles.metricBody}>
        <span className={styles.metricLabel}>{metric.label}</span>
        <span className={styles.metricValue}>{metric.value}</span>
        <span
          className={`${styles.metricSub} ${
            metric.subTone === 'positive' ? styles.metricSubPositive : styles.metricSubMuted
          }`}
        >
          {metric.sub}
        </span>
      </div>
    </article>
  )
}

function MetricGrid({
  metrics,
  icons,
  variant,
}: {
  metrics: DashboardMetric[]
  icons: ReactNode[]
  variant: 'today' | 'stock'
}) {
  return (
    <div
      className={`${styles.metricsGrid} ${
        variant === 'today' ? styles.metricsGridToday : styles.metricsGridStock
      }`}
    >
      {metrics.map((metric, index) => (
        <MetricCard
          key={metric.label}
          metric={metric}
          icon={icons[index] ?? null}
          index={index}
        />
      ))}
    </div>
  )
}

export function Component() {
  const queryClient = useQueryClient()
  const overviewQuery = useQuery(dashboardQueries.overview())
  const hotArticlesQuery = useQuery(dashboardQueries.hotArticles())
  const hotSearchesQuery = useQuery(dashboardQueries.hotSearches())
  const hotDownloadsQuery = useQuery(dashboardQueries.hotDownloads())
  const adEventsQuery = useQuery(dashboardQueries.adEvents())

  const refreshing = [
    overviewQuery,
    hotArticlesQuery,
    hotSearchesQuery,
    hotDownloadsQuery,
    adEventsQuery,
  ].some((query) => query.isFetching && !query.isPending)

  const todayMetrics = overviewQuery.data ? buildTodayMetrics(overviewQuery.data) : []
  const stockMetrics = overviewQuery.data ? buildStockMetrics(overviewQuery.data) : []

  return (
    <div className={styles.page}>
      <PageHeader
        title="数据概览"
        description="今日运营与内容规模一览"
        extra={
          <Button
            icon={<ReloadOutlined />}
            loading={refreshing}
            onClick={() => {
              void queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
            }}
          >
            刷新
          </Button>
        }
      />

      <QueryState status={readStatus(overviewQuery)} errorText={errorText(overviewQuery.error)}>
        <section className={styles.metricsSection}>
          <div className={styles.metricsHeader}>
            <h3 className={styles.metricsTitle}>今日运营</h3>
            <span className={styles.metricsHint}>{todayHint()}</span>
          </div>
          <MetricGrid metrics={todayMetrics} icons={todayIcons} variant="today" />
        </section>
        <section className={styles.metricsSection}>
          <div className={styles.metricsHeader}>
            <h3 className={styles.metricsTitle}>内容规模</h3>
            <span className={styles.metricsHint}>累计数据</span>
          </div>
          <MetricGrid metrics={stockMetrics} icons={stockIcons} variant="stock" />
        </section>
      </QueryState>

      <div className={styles.tablesGrid}>
        <section className={styles.tableCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardDot} />
            热门文章 Top 10
            <span className={styles.cardHint}>按浏览量</span>
          </div>
          <QueryState
            status={readListStatus(hotArticlesQuery)}
            errorText={errorText(hotArticlesQuery.error)}
          >
            <Table
              size="small"
              pagination={false}
              rowKey="id"
              dataSource={hotArticlesQuery.data}
              columns={articleColumns}
            />
          </QueryState>
        </section>

        <section className={styles.tableCard}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardDot} ${styles.cardDotCopper}`} />
            热门搜索词 Top 20
          </div>
          <QueryState
            status={readListStatus(hotSearchesQuery)}
            errorText={errorText(hotSearchesQuery.error)}
          >
            <Table
              size="small"
              pagination={false}
              rowKey="keyword"
              dataSource={hotSearchesQuery.data}
              columns={searchColumns}
            />
          </QueryState>
        </section>

        <section className={styles.tableCard}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardDot} ${styles.cardDotGold}`} />
            免费资料下载排行 Top 20
          </div>
          <QueryState
            status={readListStatus(hotDownloadsQuery)}
            errorText={errorText(hotDownloadsQuery.error)}
          >
            <Table
              size="small"
              pagination={false}
              rowKey="fileId"
              dataSource={hotDownloadsQuery.data}
              columns={downloadColumns}
            />
          </QueryState>
        </section>

        <section className={styles.tableCard}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardDot} ${styles.cardDotJadeDark}`} />
            广告统计
            <span className={styles.cardHint}>按广告位累计</span>
          </div>
          <QueryState status={readSlotStatus(adEventsQuery)} errorText={errorText(adEventsQuery.error)}>
            <Table
              size="small"
              pagination={false}
              rowKey="slotKey"
              dataSource={adEventsQuery.data?.bySlot}
              columns={adColumns}
            />
          </QueryState>
        </section>
      </div>
    </div>
  )
}
