// 与后端枚举对齐的下拉选项（course_server model/models.go、model_shared.go）。
// 用 `as const` 抽出字面量联合，供 DTO 收紧；禁止再写裸 string/number 选项。

export type SelectOption<T extends string | number> = {
  label: string
  value: T
}

export const STATUS_OPTIONS = [
  { label: '启用', value: 1 },
  { label: '禁用', value: 0 },
] as const satisfies ReadonlyArray<SelectOption<0 | 1>>

export type EnableStatus = (typeof STATUS_OPTIONS)[number]['value']

export const ARTICLE_STATUS_OPTIONS = [
  { label: '已发布', value: 1 },
  { label: '草稿', value: 0 },
] as const satisfies ReadonlyArray<SelectOption<0 | 1>>

export type ArticlePublishStatus = (typeof ARTICLE_STATUS_OPTIONS)[number]['value']

export const SEMESTER_OPTIONS = [
  { label: '上册', value: '上册' },
  { label: '下册', value: '下册' },
] as const satisfies ReadonlyArray<SelectOption<string>>

export const SEMESTER_VALUES = ['上册', '下册'] as const satisfies ReadonlyArray<Semester>

export type Semester = (typeof SEMESTER_OPTIONS)[number]['value']

export const GRADES = [1, 2, 3, 4, 5, 6] as const
export type Grade = (typeof GRADES)[number]
export const GRADE_OPTIONS: SelectOption<Grade>[] = GRADES.map((g) => ({
  label: `${g}年级`,
  value: g,
}))

export const UNITS = [1, 2, 3, 4, 5, 6, 7, 8] as const
export type Unit = (typeof UNITS)[number]
export const UNIT_OPTIONS: SelectOption<Unit>[] = UNITS.map((u) => ({
  label: `第${u}单元`,
  value: u,
}))

export const CONTENT_TYPE_OPTIONS = [
  { label: '单元习作指导', value: 'unit_guide' },
  { label: '同步单元习作', value: 'unit_writing' },
  { label: '写作素材', value: 'material' },
  { label: '其他', value: 'other' },
] as const satisfies ReadonlyArray<SelectOption<string>>
export const CONTENT_TYPE_VALUES = [
  'unit_guide',
  'unit_writing',
  'material',
  'other',
] as const satisfies ReadonlyArray<ContentType>
export type ContentType = (typeof CONTENT_TYPE_OPTIONS)[number]['value']

export const ACCESS_TYPE_OPTIONS = [
  { label: '免费（free）', value: 'free' },
  { label: '付费（purchase_required）', value: 'purchase_required' },
  { label: '会员（member_only）', value: 'member_only' },
  { label: '内部（internal）', value: 'internal' },
] as const satisfies ReadonlyArray<SelectOption<string>>

export type AccessType = (typeof ACCESS_TYPE_OPTIONS)[number]['value']

export const OWNER_TYPE_OPTIONS = [
  { label: '作文专题文章', value: 'article' },
] as const satisfies ReadonlyArray<SelectOption<string>>

export type OwnerType = (typeof OWNER_TYPE_OPTIONS)[number]['value']

export const VIEW_ACCESS_OPTIONS = [
  { label: '免费查看（free）', value: 'free' },
  { label: '会员（member_only）', value: 'member_only' },
  { label: '付费（purchase_required）', value: 'purchase_required' },
] as const satisfies ReadonlyArray<SelectOption<string>>

export type ViewAccess = (typeof VIEW_ACCESS_OPTIONS)[number]['value']
export const VIEW_ACCESS_VALUES = [
  'free',
  'member_only',
  'purchase_required',
] as const satisfies ReadonlyArray<ViewAccess>

export const NAV_TYPE_VALUES = ['navigateTo', 'switchTab', 'redirectTo', 'reLaunch'] as const
export type NavType = (typeof NAV_TYPE_VALUES)[number]

export const NAV_TYPE_OPTIONS = [
  { label: 'navigateTo（普通二级页，默认）', value: 'navigateTo' },
  { label: 'switchTab（Tab 页，path 须为 tabBar）', value: 'switchTab' },
  { label: 'redirectTo（关闭当前页打开）', value: 'redirectTo' },
  { label: 'reLaunch（关闭所有页打开）', value: 'reLaunch' },
] as const satisfies ReadonlyArray<SelectOption<NavType>>

export const AD_TYPE_OPTIONS = [
  { label: 'Banner 横幅', value: 'banner' },
  { label: '激励视频', value: 'rewarded_video' },
] as const satisfies ReadonlyArray<SelectOption<string>>
export const AD_TYPE_VALUES = ['banner', 'rewarded_video'] as const
export type AdType = (typeof AD_TYPE_VALUES)[number]

export const AD_PAGE_OPTIONS = [
  { label: '首页', value: 'home' },
  { label: '文章详情', value: 'article_detail' },
  { label: '作文详情', value: 'essay_detail' },
  { label: '搜索结果', value: 'search' },
  { label: '我的', value: 'mine' },
  { label: '下载', value: 'download' },
] as const satisfies ReadonlyArray<SelectOption<string>>
export const AD_PAGE_VALUES = [
  'home',
  'article_detail',
  'essay_detail',
  'search',
  'mine',
  'download',
] as const
export type AdPage = (typeof AD_PAGE_VALUES)[number]

export const FREE_TAG = '免费'

export function statusLabel(status: EnableStatus): string {
  return status === 1 ? '启用' : '禁用'
}

export function articleStatusLabel(status: ArticlePublishStatus): string {
  return status === 1 ? '已发布' : '草稿'
}

export function labelOf<T extends string | number>(
  options: ReadonlyArray<SelectOption<T>>,
  value: T,
): string {
  return options.find((o) => o.value === value)?.label ?? String(value)
}

export const ADMIN_OPLOG_TARGET_TYPE_OPTIONS = [
  { label: '文章', value: 'article' },
  { label: '优秀作文', value: 'essay' },
  { label: '下载资料', value: 'download_file' },
  { label: '标签', value: 'tag' },
  { label: '教材单元', value: 'taxonomy_unit' },
  { label: '首页入口', value: 'home_block' },
  { label: '广告位', value: 'ad_slot' },
  { label: '公众号配置', value: 'official_account' },
  { label: '文件上传', value: 'upload' },
] as const satisfies ReadonlyArray<SelectOption<string>>

export type AdminOpLogTargetType = (typeof ADMIN_OPLOG_TARGET_TYPE_OPTIONS)[number]['value']

export function adminOpLogTargetTypeLabel(value: AdminOpLogTargetType): string {
  return labelOf(ADMIN_OPLOG_TARGET_TYPE_OPTIONS, value)
}

// 待处理/已回复
export const FEEDBACK_STATUS_OPTIONS = [
  { label: '待处理', value: 'pending' },
  { label: '已回复', value: 'replied' },
] as const satisfies ReadonlyArray<SelectOption<string>>
export const FEEDBACK_STATUS_VALUES = ['pending', 'replied'] as const
export type FeedbackStatus = (typeof FEEDBACK_STATUS_VALUES)[number]
