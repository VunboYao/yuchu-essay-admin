import { useState } from 'react'
import { Button, Table, Tag, Popconfirm, type TableProps, Space, Select, App } from 'antd'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query'
import { AppFormDialog, QueryState, PageHeader, type QueryStateEnum } from '@/shared/ui'
import { ApiError } from '@/shared/api'
import { formatFileSize } from '@/shared/utils/formatSize'
import type { DownloadFile } from '@/shared/types'
import { articleQueries } from '@/features/article/queries'
import { DownloadForm } from '../components/DownloadForm'
import {
  downloadWriteSchema,
  type DownloadFileSchemaInput,
  type DownloadFileSchemaOutput,
} from '../schemas'
import {
  type ListDownloadFilesQuery,
  createDownloadFile,
  updateDownloadFile,
  deleteDownloadFile,
} from '../api'
import { downloadKeys, downloadQueries } from '../queries'

import {
  ACCESS_TYPE_OPTIONS,
  FREE_TAG,
  OWNER_TYPE_OPTIONS,
  labelOf,
} from '@/shared/constants/options'
import styles from './DownloadPage.module.css'

const articleDictQuery = articleQueries.list({
  status: '',
  page: 1,
  pageSize: 100,
  grade: '',
  semester: '',
  unit: '',
  contentType: '',
  keyword: '',
  tagId: '',
})

const defaultValues: DownloadFileSchemaInput = {
  ownerType: 'article',
  ownerId: 0,
  fileName: '',
  fileUrl: '',
  fileType: '',
  fileSize: 0,
  accessType: 'free',
  sortOrder: 0,
  tags: FREE_TAG,
  needLogin: true,
  status: 1,
}

const defaultQuery: ListDownloadFilesQuery = {
  page: 1,
  pageSize: 10,
  ownerType: 'article',
  ownerId: '',
  accessType: '',
}
const isPublicFree = (record: DownloadFile) => {
  return record.status === 1 && record.accessType === 'free' && record.tags.includes(FREE_TAG)
}

export function Component() {
  const queryClient = useQueryClient()
  const { message, modal } = App.useApp()
  const [query, setQuery] = useState<ListDownloadFilesQuery>(defaultQuery)
  const {
    control,
    reset,
    setValue,
    formState: { errors },
    handleSubmit,
  } = useForm<DownloadFileSchemaInput, unknown, DownloadFileSchemaOutput>({
    resolver: zodResolver(downloadWriteSchema),
    defaultValues,
  })
  const [open, setOpen] = useState(false)
  const [isEditing, setIsEditing] = useState<DownloadFile | null>(null)
  const articleListQuery = useQuery(articleDictQuery)
  const articles = articleListQuery.data?.list ?? []
  const listQuery = useQuery({
    ...downloadQueries.list(query),
    placeholderData: keepPreviousData,
  })

  const createMutation = useMutation({
    mutationFn: createDownloadFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: downloadKeys.lists() })
    },
  })
  const updateMutation = useMutation({
    mutationFn: updateDownloadFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: downloadKeys.lists() })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDownloadFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: downloadKeys.lists() })
    },
  })

  let queryStatus: QueryStateEnum = 'success'
  if (!listQuery.isPlaceholderData && listQuery.isPending) {
    queryStatus = 'pending'
  } else if (!listQuery.data && listQuery.isError) {
    queryStatus = 'error'
  } else if (listQuery.data.list.length === 0) {
    queryStatus = 'empty'
  }

  const onValid = async (data: DownloadFileSchemaOutput) => {
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: isEditing.id, input: data })
        message.success('更新成功')
      } else {
        await createMutation.mutateAsync(data)
        message.success('创建成功')
      }
      setOpen(false)
    } catch (error) {
      message.error(error instanceof ApiError ? error.message : '操作失败')
    }
  }

  const actionLocked =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  const handleCreate = () => {
    reset(defaultValues)
    setIsEditing(null)
    setOpen(true)
  }

  const handleEdit = (record: DownloadFile) => {
    reset({
      ownerType: 'article',
      ownerId: record.ownerId,
      fileName: record.fileName,
      fileUrl: record.fileUrl,
      fileType: record.fileType,
      fileSize: record.fileSize,
      accessType: record.accessType,
      sortOrder: record.sortOrder,
      tags: record.tags,
      needLogin: record.needLogin,
      status: record.status,
    })
    setIsEditing(record)
    setOpen(true)
  }

  const handleDelete = async (record: DownloadFile) => {
    try {
      await deleteMutation.mutateAsync({
        id: record.id,
      })
      message.success('删除成功')
    } catch (error) {
      if (error instanceof ApiError && error.message.includes('confirm=true')) {
        modal.confirm({
          okType: 'danger',
          title: '强制删除',
          content: '该资料已有下载记录，强制删除会丢失下载统计，是否继续？',
          onOk: async () => {
            try {
              await deleteMutation.mutateAsync({
                id: record.id,
                confirm: true,
              })
              message.success('删除成功')
            } catch (error) {
              message.error(error instanceof ApiError ? error.message : '删除失败')
            }
          },
        })
        return
      }
      message.error(error instanceof ApiError ? error.message : '删除失败')
    }
  }
  const columns: TableProps<DownloadFile>['columns'] = [
    {
      title: '文件名称',
      dataIndex: 'fileName',
    },
    {
      title: '归属文章',
      dataIndex: 'ownerTitle',
      render: (_, record) => record.ownerTitle ?? '—',
    },
    {
      title: '访问权限',
      dataIndex: 'accessType',
      render: (value) => {
        return labelOf(ACCESS_TYPE_OPTIONS, value)
      },
    },
    {
      title: '标签',
      dataIndex: 'tags',
    },
    {
      title: '前台可下载',
      render: (_, record) => {
        return (
          <Tag color={isPublicFree(record) ? 'green' : 'red'}>
            {isPublicFree(record) ? '是' : '否'}
          </Tag>
        )
      },
    },
    {
      title: '大小',
      dataIndex: 'fileSize',
      render: (size: number) => formatFileSize(size),
    },
    {
      title: '下载次数',
      dataIndex: 'downloadCount',
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (_, record) => {
        return (
          <Tag color={record.status === 1 ? 'green' : 'red'}>
            {record.status === 1 ? '启用' : '禁用'}
          </Tag>
        )
      },
    },
    {
      title: '操作',
      render: (_, record) => {
        return (
          <Space>
            <Button type="primary" onClick={() => handleEdit(record)} disabled={actionLocked}>
              编辑
            </Button>
            <Popconfirm
              title={`确定删除 ${record.fileName} 吗？`}
              onConfirm={() => handleDelete(record)}
            >
              <Button type="default" danger disabled={actionLocked}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        )
      },
    },
  ]
  return (
    <div className={styles.page}>
      <PageHeader
        title="下载文件"
        extra={
          <Button type="primary" onClick={() => handleCreate()}>
            添加下载文件
          </Button>
        }
      >
        <Select
          options={[...OWNER_TYPE_OPTIONS]}
          value={query.ownerType}
          className={styles.owner}
          onChange={(value) => setQuery({ ...query, ownerType: value, page: 1 })}
        />
        <Select
          options={[
            { label: '全部文章', value: '' },
            ...articles.map((article) => ({ label: article.title, value: article.id })),
          ]}
          value={query.ownerId}
          className={styles.ownerId}
          onChange={(value) => setQuery({ ...query, ownerId: value, page: 1 })}
        ></Select>
        <Select
          options={[{ label: '全部', value: '' }, ...ACCESS_TYPE_OPTIONS]}
          value={query.accessType}
          className={styles.access}
          onChange={(value) => setQuery({ ...query, accessType: value, page: 1 })}
        />
      </PageHeader>
      <QueryState
        status={queryStatus}
        errorText={listQuery.error instanceof ApiError ? listQuery.error.message : '加载失败'}
        emptyText="暂无数据"
      >
        <Table
          columns={columns}
          dataSource={listQuery.data?.list}
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
        />
      </QueryState>
      <AppFormDialog
        open={open}
        width={800}
        onClose={() => setOpen(false)}
        title={isEditing ? '编辑下载文件' : '添加下载文件'}
        onSubmit={handleSubmit(onValid)}
        confirmLoading={updateMutation.isPending || createMutation.isPending}
      >
        <DownloadForm control={control} setValue={setValue} errors={errors} />
      </AppFormDialog>
    </div>
  )
}
