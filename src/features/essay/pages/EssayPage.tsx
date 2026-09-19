import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Input, Popconfirm, Select, Table, Tag, type TableProps } from 'antd'
import { PageHeader, AppFormDialog, QueryState, type QueryStateEnum } from '@/shared/ui'
import { GRADE_OPTIONS, STATUS_OPTIONS, statusLabel } from '@/shared/constants/options'
import { ApiError } from '@/shared/api'
import type { EssayExample, Tag as TagType } from '@/shared/types'
import { articleQueries } from '@/features/article/queries'
import { tagQueries } from '@/features/tag/queries'
import { createEssay, deleteEssay, updateEssay, type EssayListQuery } from '../api'
import { essayKeys, essayQueries } from '../queries'
import { essayWriteSchema, type EssayWriteInput, type EssayWriteOutput } from '../schemas'
import { EssayForm } from '../components/EssayForm'
import styles from './EssayPage.module.css'

const createDefaults: EssayWriteInput = {
  title: '',
  grade: 1,
  body: '',
  comment: '',
  articleId: null,
  sortOrder: 0,
  status: 1,
  tagIds: [],
}

const initialQuery: EssayListQuery = {
  keyword: '',
  grade: '',
  articleId: '',
  tagId: '',
  status: '',
  page: 1,
  pageSize: 10,
}

const articleDictQuery = articleQueries.list({
  grade: '',
  semester: '',
  unit: '',
  contentType: '',
  status: '',
  keyword: '',
  tagId: '',
  page: 1,
  pageSize: 100,
})

const tagDictQuery = tagQueries.list({ status: 1, page: 1, pageSize: 100 })

export function Component() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState<EssayListQuery>(initialQuery)
  const [keywordDraft, setKeywordDraft] = useState(initialQuery.keyword ?? '')
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [extraTags, setExtraTags] = useState<TagType[]>([])

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EssayWriteInput, unknown, EssayWriteOutput>({
    resolver: zodResolver(essayWriteSchema),
    defaultValues: createDefaults,
  })

  const listQuery = useQuery({
    ...essayQueries.list(query),
    placeholderData: keepPreviousData,
  })
  const articleListQuery = useQuery(articleDictQuery)
  const tagListQuery = useQuery(tagDictQuery)
  const articles = articleListQuery.data?.list ?? []
  const tags = tagListQuery.data?.list ?? []

  const createMutation = useMutation({
    mutationFn: createEssay,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: essayKeys.lists() })
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateEssay,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: essayKeys.lists() })
      queryClient.invalidateQueries({ queryKey: essayKeys.details() })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteEssay,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: essayKeys.lists() })
      queryClient.invalidateQueries({ queryKey: essayKeys.details() })
    },
  })

  const writing = createMutation.isPending || updateMutation.isPending
  const actionsLocked = writing || deleteMutation.isPending

  const openCreate = () => {
    reset(createDefaults)
    setEditingId(null)
    setExtraTags([])
    setOpen(true)
  }

  const openEdit = async (row: EssayExample) => {
    try {
      const detail = await queryClient.fetchQuery(essayQueries.detail(row.id))
      reset({
        title: detail.essay.title,
        grade: detail.essay.grade,
        body: detail.essay.body,
        comment: detail.essay.comment,
        articleId: detail.essay.articleId,
        sortOrder: detail.essay.sortOrder,
        status: detail.essay.status,
        tagIds: detail.tags.map((tag) => tag.id),
      })
      setEditingId(detail.essay.id)
      setExtraTags(detail.tags)
      setOpen(true)
    } catch (error) {
      message.error(error instanceof ApiError ? error.message : '获取详情失败')
    }
  }

  const onValid = async (input: EssayWriteOutput) => {
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, input })
        message.success('更新成功')
      } else {
        await createMutation.mutateAsync(input)
        message.success('创建成功')
      }
      setOpen(false)
    } catch (error) {
      message.error(error instanceof ApiError ? error.message : '操作失败')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id)
      message.success('删除成功')
    } catch (error) {
      message.error(error instanceof ApiError ? error.message : '删除失败')
    }
  }

  const columns: TableProps<EssayExample>['columns'] = [
    {
      title: '标题',
      dataIndex: 'title',
    },
    {
      title: '年级',
      dataIndex: 'grade',
      render: (grade: EssayExample['grade']) => `${grade}年级`,
    },
    {
      title: '字数',
      dataIndex: 'wordCount',
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: EssayExample['status']) => (
        <Tag color={status === 1 ? 'green' : 'red'}>{statusLabel(status)}</Tag>
      ),
    },
    {
      title: '标签',
      dataIndex: 'tags',
      render: (rowTags: EssayExample['tags']) =>
        rowTags?.length ? rowTags.map((tag) => tag.name).join('、') : '—',
    },
    {
      title: '所属专题',
      dataIndex: 'articleId',
      render: (articleId: EssayExample['articleId']) => {
        if (!articleId) return '—'
        return articles.find((article) => article.id === articleId)?.title ?? '—'
      },
    },
    {
      title: '操作',
      dataIndex: 'action',
      render: (_, record) => (
        <div className={styles.rowActions}>
          <Button type="link" disabled={actionsLocked} onClick={() => void openEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title={`确定删除「${record.title}」？删除后不可恢复。`}
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
            disabled={deleteMutation.isPending}
          >
            <Button type="link" danger disabled={deleteMutation.isPending}>
              删除
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ]

  let queryStatus: QueryStateEnum = 'success'
  if (listQuery.isPending && !listQuery.isPlaceholderData) {
    queryStatus = 'pending'
  } else if (!listQuery.data && listQuery.isError) {
    queryStatus = 'error'
  } else if (listQuery.data?.list.length === 0) {
    queryStatus = 'empty'
  }

  const showFetchError = Boolean(listQuery.data && listQuery.isRefetchError)

  return (
    <>
      <div className={styles.page}>
        <PageHeader
          title="优秀作文"
          extra={
            <Button type="primary" onClick={openCreate}>
              新增
            </Button>
          }
        >
          <Input.Search
            className={styles.keyword}
            placeholder="标题或正文"
            value={keywordDraft}
            onChange={(event) => setKeywordDraft(event.target.value)}
            onSearch={(value) =>
              setQuery((prev) => ({ ...prev, keyword: value.trim(), page: 1 }))
            }
          />
          <Select
            className={styles.grade}
            value={query.grade}
            placeholder="年级"
            onChange={(value) => setQuery((prev) => ({ ...prev, grade: value, page: 1 }))}
            options={[{ label: '全部年级', value: '' }, ...GRADE_OPTIONS]}
          />
          <Select
            className={styles.article}
            value={query.articleId}
            placeholder="专题"
            onChange={(value) => setQuery((prev) => ({ ...prev, articleId: value, page: 1 }))}
            options={[
              { label: '全部专题', value: '' },
              ...articles.map((article) => ({ label: article.title, value: article.id })),
            ]}
          />
          <Select
            className={styles.tag}
            value={query.tagId}
            placeholder="标签"
            onChange={(value) => setQuery((prev) => ({ ...prev, tagId: value, page: 1 }))}
            options={[
              { label: '全部标签', value: '' },
              ...tags.map((tag) => ({ label: tag.name, value: tag.id })),
            ]}
          />
          <Select
            className={styles.status}
            value={query.status}
            placeholder="状态"
            onChange={(value) => setQuery((prev) => ({ ...prev, status: value, page: 1 }))}
            options={[{ label: '全部状态', value: '' }, ...STATUS_OPTIONS]}
          />
        </PageHeader>

        <QueryState
          status={queryStatus}
          errorText={listQuery.error instanceof ApiError ? listQuery.error.message : '加载失败'}
          emptyText="暂无优秀作文"
        >
          <div className={styles.tableBlock}>
            {showFetchError ? (
              <Alert
                type="error"
                showIcon
                title={
                  listQuery.error instanceof ApiError ? listQuery.error.message : '数据同步失败'
                }
              />
            ) : null}
            <Table
              rowKey="id"
              columns={columns}
              dataSource={listQuery.data?.list}
              loading={{ spinning: listQuery.isFetching, delay: 200 }}
              pagination={{
                placement: ['bottomEnd'],
                current: query.page,
                pageSize: query.pageSize,
                total: listQuery.data?.total,
                showTotal: (total) => `共 ${total} 条`,
                showSizeChanger: false,
                onChange: (page) => setQuery((prev) => ({ ...prev, page })),
              }}
            />
          </div>
        </QueryState>
      </div>

      <AppFormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? '编辑优秀作文' : '新增优秀作文'}
        width={800}
        confirmLoading={writing}
        onSubmit={() => void handleSubmit(onValid)()}
      >
        <EssayForm
          control={control}
          errors={errors}
          editorSeed={`${editingId ?? 'new'}-${open}`}
          extraTags={extraTags}
        />
      </AppFormDialog>
    </>
  )
}
