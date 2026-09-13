import { ArticleForm } from '../components/ArticleForm'
import { articleWriteSchema, type ArticleWriteInput, type ArticleWriteOutput } from '../schemas'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createArticle, updateArticle, type ArticleListQuery, updateArticleStatus } from '../api'
import { tagQueries } from '@/features/tag/queries'
import { useState } from 'react'
import {
  Table,
  Input,
  Select,
  Alert,
  Tag,
  Button,
  Space,
  App,
  type TableProps,
  Image,
  Popconfirm,
} from 'antd'
import { PageHeader, QueryState, type QueryStateEnum, AppFormDialog } from '@/shared/ui'
import { articleKeys, articleQueries } from '../queries'
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Article, ArticleDetail } from '@/shared/types'
import styles from './ArticlePage.module.css'
import {
  CONTENT_TYPE_OPTIONS,
  GRADE_OPTIONS,
  UNIT_OPTIONS,
  SEMESTER_OPTIONS,
  labelOf,
  articleStatusLabel,
  ARTICLE_STATUS_OPTIONS,
} from '@/shared/constants/options'
const initialValues: ArticleWriteInput = {
  title: '',
  slug: '',
  grade: 1,
  unit: 1,
  semester: '上册',
  textbookVersion: '',
  essayTopic: '',
  contentType: 'unit_guide',
  audience: '',
  summary: '',
  coverImg: '',
  bodyImages: [],
  tagIds: [],
  isRecommended: false,
  isHot: false,
  sortOrder: 0,
  viewAccessType: 'free',
}

const initialQuery: ArticleListQuery = {
  page: 1,
  pageSize: 10,
  grade: '',
  semester: '',
  unit: '',
  contentType: '',
  status: '',
  keyword: '',
  tagId: '',
}
export function Component() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState<ArticleListQuery>(initialQuery)
  const [open, setOpen] = useState(false)
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)
  const [keywordDraft, setKeywordDraft] = useState('')
  const tagListQuery = useQuery({
    ...tagQueries.list({ page: 1, pageSize: 1000, status: 1 }),
  })
  const tagOptions =
    tagListQuery.data?.list.map((tag) => ({ label: tag.name, value: tag.id })) ?? []
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ArticleWriteInput, unknown, ArticleWriteOutput>({
    defaultValues: initialValues,
    resolver: zodResolver(articleWriteSchema),
  })

  const listQuery = useQuery({
    ...articleQueries.list(query),
    placeholderData: keepPreviousData,
  })

  const createMutation = useMutation({
    mutationFn: createArticle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: articleKeys.lists() })
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateArticle,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: articleKeys.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: articleKeys.details(),
      })
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: updateArticleStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: articleKeys.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: articleKeys.details(),
      })
    },
  })

  let queryStatus: QueryStateEnum = 'success'
  if (!listQuery.isPlaceholderData && listQuery.isPending) {
    queryStatus = 'pending'
  } else if (!listQuery.data && listQuery.isError) {
    queryStatus = 'error'
  } else if (listQuery.data?.list.length === 0) {
    queryStatus = 'empty'
  }

  const showFetchError = Boolean(listQuery.data && listQuery.isRefetchError)

  const handleCreate = () => {
    reset(initialValues)
    setEditingArticle(null)
    setOpen(true)
  }

  const handleEdit = async (article: Article) => {
    try {
      const articleDetail: ArticleDetail = await queryClient.fetchQuery({
        ...articleQueries.detail(article.id),
      })
      setEditingArticle(articleDetail.article)
      reset({
        title: articleDetail.article.title,
        slug: articleDetail.article.slug,
        grade: articleDetail.article.grade,
        unit: articleDetail.article.unit,
        semester: articleDetail.article.semester,
        textbookVersion: articleDetail.article.textbookVersion,
        essayTopic: articleDetail.article.essayTopic,
        contentType: articleDetail.article.contentType,
        audience: articleDetail.article.audience,
        summary: articleDetail.article.summary,
        coverImg: articleDetail.article.coverImg,
        bodyImages:
          articleDetail.article.bodyImages?.map((url) => ({
            id: crypto.randomUUID(),
            url,
          })) ?? [],
        tagIds: articleDetail.tags.map((tag) => tag.id),
        isRecommended: articleDetail.article.isRecommended,
        isHot: articleDetail.article.isHot,
        sortOrder: articleDetail.article.sortOrder,
        viewAccessType: articleDetail.article.viewAccessType,
      })
      setOpen(true)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '获取文章详情失败')
    }
  }

  const handleToggleStatus = async (article: Article) => {
    try {
      await updateStatusMutation.mutateAsync({
        id: article.id,
        status: article.status === 1 ? 0 : 1,
      })
      message.success('操作成功')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败')
    }
  }

  const onValid = async (data: ArticleWriteOutput) => {
    try {
      if (editingArticle) {
        await updateMutation.mutateAsync({ id: editingArticle.id, input: data })
        message.success('编辑成功')
      } else {
        await createMutation.mutateAsync(data)
        message.success('添加成功')
      }
      setOpen(false)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败')
    }
  }

  const lockedAction = createMutation.isPending || updateMutation.isPending

  const columns: TableProps<Article>['columns'] = [
    {
      title: '标题',
      dataIndex: 'title',
      width: 200,
    },
    {
      title: '教材版本',
      dataIndex: 'textbookVersion',
      width: 100,
    },
    {
      title: '年级',
      dataIndex: 'grade',
      width: 150,
      render: (_, record) => `${record.grade}年级/${record.semester}/${record.unit}单元`,
    },

    {
      title: '内容类型',
      dataIndex: 'contentType',
      width: 120,
      render: (_, record) => labelOf(CONTENT_TYPE_OPTIONS, record.contentType),
    },
    {
      title: '封面图片',
      dataIndex: 'coverImg',
      render: (_, record) => <Image src={record.coverImg} width={40} height={40} />,
    },
    {
      title: '可下载资料',
      dataIndex: 'downloadSummary',
      render: (_, record) => {
        if (record.downloadSummary?.total) {
          return `${record.downloadSummary.total}${record.downloadSummary.publicFree > 0 ? '（可下载）' : '（未开放）'}`
        }
        return '-'
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (_, record) =>
        record.status === 1 ? (
          <Tag color="green">{articleStatusLabel(record.status)}</Tag>
        ) : (
          <Tag color="red">{articleStatusLabel(record.status)}</Tag>
        ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 180,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 180,
    },
    {
      title: '标签',
      dataIndex: 'tags',
      render: (_, record) => record.tags?.map((tag) => tag.name).join(','),
      width: 100,
    },
    {
      title: '操作',
      dataIndex: 'action',
      render: (_, record) => (
        <Space className={styles.rowActions}>
          <Button disabled={lockedAction} type="link" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title={`确定${record.status === 1 ? '下架' : '上架'}该文章:${record.title}？`}
            onConfirm={() => handleToggleStatus(record)}
            okText="确定"
            cancelText="取消"
            disabled={updateStatusMutation.isPending}
          >
            <Button type="link" danger disabled={updateStatusMutation.isPending}>
              {record.status === 1 ? '下架' : '上架'}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]
  return (
    <div className={styles.page}>
      <PageHeader
        title="文章管理"
        extra={
          <Button type="primary" onClick={handleCreate}>
            添加文章
          </Button>
        }
      >
        <Select
          className={styles.grade}
          value={query.grade}
          placeholder="年级"
          onChange={(value) => setQuery((prev) => ({ ...prev, grade: value, page: 1 }))}
          options={[{ label: '全部年级', value: '' }, ...GRADE_OPTIONS]}
        />
        <Select
          className={styles.semester}
          value={query.semester}
          placeholder="学期"
          onChange={(value) => setQuery((prev) => ({ ...prev, semester: value, page: 1 }))}
          options={[{ label: '全部学期', value: '' }, ...SEMESTER_OPTIONS]}
        />
        <Select
          className={styles.unit}
          value={query.unit}
          placeholder="单元"
          onChange={(value) => setQuery((prev) => ({ ...prev, unit: value, page: 1 }))}
          options={[{ label: '全部单元', value: '' }, ...UNIT_OPTIONS]}
        />
        <Select
          className={styles.contentType}
          value={query.contentType}
          placeholder="内容类型"
          onChange={(value) => setQuery((prev) => ({ ...prev, contentType: value, page: 1 }))}
          options={[{ label: '全部内容类型', value: '' }, ...CONTENT_TYPE_OPTIONS]}
        />
        <Select
          className={styles.status}
          value={query.status}
          placeholder="状态"
          onChange={(value) => setQuery((prev) => ({ ...prev, status: value, page: 1 }))}
          options={[{ label: '全部状态', value: '' }, ...ARTICLE_STATUS_OPTIONS]}
        />
        <Select
          className={styles.tag}
          value={query.tagId}
          placeholder="标签"
          onChange={(value) => setQuery((prev) => ({ ...prev, tagId: value, page: 1 }))}
          options={[{ label: '全部标签', value: '' }, ...tagOptions]}
        />
        <Input.Search
          className={styles.keyword}
          value={keywordDraft}
          placeholder="标题/题目"
          onChange={(e) => setKeywordDraft(e.target.value)}
          onSearch={() => setQuery((prev) => ({ ...prev, keyword: keywordDraft.trim(), page: 1 }))}
        />
      </PageHeader>
      <QueryState
        status={queryStatus}
        errorText={listQuery.error instanceof Error ? listQuery.error.message : '获取数据失败'}
        emptyText="暂无作文专题"
      >
        <div className={styles.tableBlock}>
          {showFetchError && (
            <Alert
              showIcon
              title={listQuery.error instanceof Error ? listQuery.error.message : '获取数据失败'}
              type="error"
            />
          )}
          <Table
            rowKey="id"
            loading={{ spinning: listQuery.isFetching, delay: 200 }}
            pagination={{
              showSizeChanger: false,
              current: query.page,
              pageSize: query.pageSize,
              total: listQuery.data?.total ?? 0,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page) => {
                setQuery((prev) => ({ ...prev, page }))
              },
            }}
            dataSource={listQuery.data?.list ?? []}
            columns={columns}
          />
        </div>
      </QueryState>
      <AppFormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editingArticle ? '编辑作文专题' : '新增作文专题'}
        width={1200}
        confirmLoading={lockedAction}
        onSubmit={() => void handleSubmit(onValid)()}
      >
        <ArticleForm control={control} errors={errors} />
      </AppFormDialog>
    </div>
  )
}
