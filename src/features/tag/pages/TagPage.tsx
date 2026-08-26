import styles from './TagPage.module.css'
import { PageHeader, AppFormDialog, QueryState, type QueryStateEnum } from '@/shared/ui'
import { Alert, Button, Input, Select, Table, type TableProps, Tag, App, Popconfirm } from 'antd'
import { useState } from 'react'
import { TagForm } from '../components/TagForm'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { tagWriteSchema, type TagWriteInput, type TagWriteOutput } from '../schemas'
import { createTag, updateTag, deleteTag, type TagListQuery } from '../api'
import { STATUS_OPTIONS, statusLabel } from '@/shared/constants/options'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tagKeys, tagQueries } from '../queries'
import type { Tag as TagType } from '@/shared/types'
import { ApiError } from '@/shared/api'

const createDefaults = {
  name: '',
  sortOrder: 0,
  status: 1 as const,
}

const initialQuery: TagListQuery = {
  status: '',
  page: 1,
  pageSize: 10,
  keyword: '',
}

export function Component() {
  const [query, setQuery] = useState<TagListQuery>(initialQuery)
  const [keywordDraft, setKeywordDraft] = useState(initialQuery.keyword ?? '')
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TagWriteInput, unknown, TagWriteOutput>({
    resolver: zodResolver(tagWriteSchema),
    defaultValues: createDefaults,
  })
  const listQuery = useQuery({
    ...tagQueries.list(query),
    placeholderData: keepPreviousData,
  })

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<TagType | null>(null)

  const createMutation = useMutation({
    mutationFn: createTag,
    onSuccess: () => {
      // "标记过期 + 自动重取"
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() })
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() })
    },
  })

  const actionsLocked = updateMutation.isPending || deleteMutation.isPending

  const openCreate = () => {
    reset(createDefaults)
    setEditing(null)
    setOpen(true)
  }

  const openEdit = (tag: TagType) => {
    reset({
      name: tag.name,
      sortOrder: tag.sortOrder,
      status: tag.status,
    })
    setEditing(tag)
    setOpen(true)
  }

  const onValid = async (input: TagWriteOutput) => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, input })
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

  const handleToggleStatus = (tag: TagType) => {
    updateMutation.mutate(
      {
        id: tag.id,
        input: {
          name: tag.name,
          sortOrder: tag.sortOrder,
          status: tag.status === 1 ? 0 : 1,
        },
      },
      {
        onError: (error) => {
          message.error(error instanceof ApiError ? error.message : '操作失败')
        },
      },
    )
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id)
      message.success('删除成功')
    } catch (error) {
      message.error(error instanceof ApiError ? error.message : '删除失败')
    }
  }

  const columns: TableProps<TagType>['columns'] = [
    {
      title: '标签名称',
      dataIndex: 'name',
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (text) => <Tag color={text === 1 ? 'green' : 'red'}>{statusLabel(text)}</Tag>,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
    },
    {
      title: '操作',
      dataIndex: 'action',
      render: (_, record) => (
        <div className={styles.rowActions}>
          <Button type="link" disabled={actionsLocked} onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Button type="link" disabled={actionsLocked} onClick={() => handleToggleStatus(record)}>
            {record.status === 1 ? '禁用' : '启用'}
          </Button>
          {record.status === 1 ? (
            <Button type="link" disabled title="请先禁用再删除">
              删除
            </Button>
          ) : (
            <Popconfirm
              title="确定删除该标签？删除后不可恢复。"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
              disabled={actionsLocked}
            >
              <Button type="link" danger disabled={actionsLocked}>
                删除
              </Button>
            </Popconfirm>
          )}
        </div>
      ),
    },
  ]

  // QueryState 只管整页四态；后台刷新用 Table overlay，不要把 status 打回 pending。
  let queryStatus: QueryStateEnum = 'success'
  // v5 + keepPreviousData：翻页时新 key 仍是 isPending，data 只是上一页占位。
  // 首次进页面,无缓存: 必须排除 isPlaceholderData，否则翻页会闪整页 Skeleton。(pending 整页加载（无任何数据可借）)
  if (listQuery.isPending && !listQuery.isPlaceholderData) {
    queryStatus = 'pending'
  } else if (!listQuery.data && listQuery.isError) {
    // error 整页失败（首次就挂了）
    // 首次失败才整页 error。刷新失败时 data 还在，不能只看 isError。
    queryStatus = 'error'
  } else if (listQuery.data?.list.length === 0) {
    // 有成功结果但 list 为空（含搜不到）。data 为 undefined 时 ?. 不会误判 empty。
    queryStatus = 'empty'
  }

  const showFetchError = Boolean(listQuery.data && listQuery.isRefetchError)

  return (
    <>
      <div className={styles.page}>
        <PageHeader
          title="标签管理"
          extra={
            <Button type="primary" onClick={openCreate}>
              新建标签
            </Button>
          }
        >
          <Input.Search
            className={styles.keyword}
            placeholder="请输入标签名称"
            value={keywordDraft}
            onChange={(e) => setKeywordDraft(e.target.value)}
            onSearch={(value) => setQuery((prev) => ({ ...prev, keyword: value, page: 1 }))}
          />
          <Select
            className={styles.status}
            value={query.status}
            onChange={(value) => setQuery((prev) => ({ ...prev, status: value, page: 1 }))}
            options={[{ label: '全部', value: '' }, ...STATUS_OPTIONS]}
          />
        </PageHeader>

        <QueryState
          status={queryStatus}
          errorText={listQuery.error instanceof ApiError ? listQuery.error.message : '加载失败'}
          emptyText="暂无标签"
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
              dataSource={listQuery?.data?.list}
              loading={{ spinning: listQuery.isFetching, delay: 200 }}
              pagination={{
                placement: ['bottomEnd'],
                current: query.page,
                pageSize: query.pageSize,
                total: listQuery?.data?.total,
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
        title={editing ? '编辑标签' : '新建标签'}
        confirmLoading={editing ? updateMutation.isPending : createMutation.isPending}
        onSubmit={() => void handleSubmit(onValid)()}
      >
        <TagForm control={control} errors={errors} />
      </AppFormDialog>
    </>
  )
}
