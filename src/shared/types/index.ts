// 与后端 /admin/api/v1 对齐的跨 feature DTO。
// 枚举字段用 shared/constants/options 抽出的字面量联合，不再用裸 string/number。

import type {
  AccessType,
  AdPage,
  AdType,
  AdminOpLogTargetType,
  ArticlePublishStatus,
  ContentType,
  EnableStatus,
  Grade,
  NavType,
  OwnerType,
  Semester,
  Unit,
  ViewAccess,
} from '../constants/options'

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

export interface PageData<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export interface PageQuery {
  page?: number
  pageSize?: number
}

export interface LoginResult {
  token: string
  adminId: number
  username: string
  role: string
}

export interface TaxonomyUnit {
  id: number
  textbookVersion: string
  grade: Grade
  semester: Semester
  unit: Unit
  unitTitle: string
  sortOrder: number
  status: EnableStatus
  createdAt: string
  updatedAt: string
}

export interface Tag {
  id: number
  name: string
  sortOrder: number
  status: EnableStatus
  createdAt: string
  updatedAt: string
}

export interface ArticleDownloadSummary {
  total: number
  publicFree: number
}

export interface Article {
  id: number
  title: string
  slug: string
  textbookVersion: string
  grade: Grade
  semester: Semester
  unit: Unit
  essayTopic: string
  contentType: ContentType
  audience: string
  summary: string
  coverImg: string
  bodyImages?: string[]
  viewAccessType: ViewAccess
  status: ArticlePublishStatus
  isRecommended: boolean
  isHot: boolean
  sortOrder: number
  viewCount: number
  shareCount: number
  favoriteCount: number
  downloadCount: number
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  tags?: Tag[]
  downloadSummary?: ArticleDownloadSummary
}

export interface ArticleDetail {
  article: Article
  tags: Tag[]
}

export interface EssayExample {
  id: number
  articleId: number | null
  title: string
  grade: Grade
  wordCount: number
  body: string
  comment: string
  status: EnableStatus
  sortOrder: number
  viewCount: number
  favoriteCount: number
  createdAt: string
  updatedAt: string
  tags?: Tag[]
}

export interface EssayExampleDetail {
  essay: EssayExample
  tags: Tag[]
}

export interface DownloadFile {
  id: number
  ownerType: OwnerType
  ownerId: number
  fileName: string
  tags: string
  accessType: AccessType
  fileType: string
  fileUrl: string
  fileSize: number
  needLogin: boolean
  downloadCount: number
  sortOrder: number
  status: EnableStatus
  createdAt: string
  updatedAt: string
  ownerTitle?: string
}

export interface HomeBlock {
  id: number
  title: string
  icon: string
  navType: NavType
  path: string
  sortOrder: number
  status: EnableStatus
  createdAt: string
  updatedAt: string
}

export interface AdSlot {
  id: number
  slotKey: string
  slotName: string
  page: AdPage
  position: string
  adType: AdType
  adUnitId: string
  status: EnableStatus
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface OfficialAccountConfig {
  id: number
  scene: string
  title: string
  description: string
  username: string
  status: EnableStatus
  createdAt: string
  updatedAt: string
}

export interface OperationLog {
  id: number
  adminId: number
  action: string
  targetType: AdminOpLogTargetType
  targetId: number
  remark: string
  createdAt: string
}

export interface TodayTotal {
  today: number
  total: number
}

export interface StatsOverview {
  users: TodayTotal
  pv: TodayTotal
  uv: TodayTotal
  articles: { total: number; published: number }
  essays: { total: number }
  downloads: TodayTotal
  searches: TodayTotal
  favorites: TodayTotal
  shares: TodayTotal
  ads: {
    expose: TodayTotal
    click: TodayTotal
    rewardedComplete: TodayTotal
  }
}

export interface HotSearch {
  keyword: string
  count: number
}

export interface HotDownload {
  fileId: number
  fileName: string
  fileType: string
  ownerType: string
  ownerId: number
  downloadCount: number
}

export interface AdSlotStat {
  slotKey: string
  expose: number
  click: number
  rewardedComplete: number
}

export interface AdEventsStat {
  summary: {
    expose: TodayTotal
    click: TodayTotal
    rewardedComplete: TodayTotal
  }
  bySlot: AdSlotStat[]
}

export interface Feedback {
  id: number
  userId: number
  userNickname?: string
  content: string
  status: 'pending' | 'replied'
  reply?: string
  repliedAt?: string
  createdAt: string
}
