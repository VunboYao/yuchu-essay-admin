import { Table, type TableProps, Button, Tag, Image, App, Popconfirm, Alert } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import styles from './HomeBlockPage.module.css'
import { PageHeader, AppFormDialog, QueryState, type QueryStateEnum } from '@/shared/ui'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { homeBlockKeys, homeBlockQueries } from '../queries'
import type { HomeBlock } from '@/shared/types'
import { NAV_TYPE_OPTIONS, STATUS_OPTIONS, labelOf } from '@/shared/constants/options'
import { HomeBlockForm } from '../components/HomeBlockForm'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  homeBlockWriteSchema,
  type HomeBlockWriteInput,
  type HomeBlockWriteOutput,
} from '../schemas'
import { createHomeBlock, deleteHomeBlock, updateHomeBlock } from '../api'
import { ApiError } from '@/shared/api'

const defaultValues: HomeBlockWriteInput = {
  title: '',
  icon: '',
  navType: 'navigateTo',
  path: '',
  sortOrder: 0,
  status: 1,
}

export function Component() {
  const { message } = App.useApp()
  const listQuery = useQuery({
    ...homeBlockQueries.list(),
  })
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<HomeBlock | null>(null)
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<HomeBlockWriteInput, unknown, HomeBlockWriteOutput>({
    resolver: zodResolver(homeBlockWriteSchema),
    defaultValues,
  })

  const createMutation = useMutation({
    mutationFn: createHomeBlock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: homeBlockKeys.lists() })
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateHomeBlock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: homeBlockKeys.lists() })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteHomeBlock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: homeBlockKeys.lists() })
    },
  })

  const onValid = async (data: HomeBlockWriteOutput) => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          input: data,
        })
        message.success('编辑成功')
      } else {
        await createMutation.mutateAsync(data)
        message.success('新增成功')
      }
      setOpen(false)
    } catch (error) {
      message.error(error instanceof ApiError ? error.message : '操作失败')
    }
  }

  const handleCreate = () => {
    setEditing(null)
    reset(defaultValues)
    setOpen(true)
  }

  const handleEdit = (record: HomeBlock) => {
    setEditing(record)
    reset({
      title: record.title,
      icon: record.icon,
      navType: record.navType,
      path: record.path,
      sortOrder: record.sortOrder,
      status: record.status,
    })
    setOpen(true)
  }

  const handleDelete = (id: number) => {
    return deleteMutation.mutateAsync(id, {
      onError: (error) => {
        message.error(error instanceof ApiError ? error.message : '删除失败')
      },
      onSuccess: () => {
        message.success('删除成功')
      },
    })
  }

  const actionsLocked = updateMutation.isPending || deleteMutation.isPending

  let queryStatus: QueryStateEnum = 'success'
  if (listQuery.isPending) {
    queryStatus = 'pending'
  } else if (!listQuery.data && listQuery.isError) {
    queryStatus = 'error'
  } else if (listQuery.data?.length === 0) {
    queryStatus = 'empty'
  }

  const showFetchError = Boolean(listQuery.data && listQuery.isRefetchError)

  const columns: TableProps<HomeBlock>['columns'] = [
    {
      title: '标题',
      dataIndex: 'title',
    },
    {
      title: '图标',
      dataIndex: 'icon',
      render: (text) => <Image className={styles.iconPreview} src={text} alt="图标" width={40} />,
    },
    {
      title: '导航类型',
      dataIndex: 'navType',
      render: (text) => labelOf(NAV_TYPE_OPTIONS, text),
    },
    {
      title: '路径',
      dataIndex: 'path',
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (text) => (
        <Tag color={text === 1 ? 'green' : 'red'}>{labelOf(STATUS_OPTIONS, text)}</Tag>
      ),
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
          <Button type="link" disabled={actionsLocked} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          {record.status === 1 ? (
            <Button type="link" disabled title="请先禁用再删除">
              删除
            </Button>
          ) : (
            <Popconfirm
              title="确定删除该入口？删除后不可恢复。"
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

  return (
    <>
      <div className={styles.page}>
        <PageHeader
          title="首页入口管理"
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleCreate()}>
              新增入口
            </Button>
          }
        />
        <QueryState status={queryStatus} emptyText="暂无数据" errorText="加载失败">
          <div className={styles.tableBlock}>
            {showFetchError && (
              <Alert
                showIcon
                type="error"
                title={
                  listQuery.error instanceof ApiError ? listQuery.error.message : '数据同步失败'
                }
              />
            )}
            <Table
              loading={{ spinning: listQuery.isFetching, delay: 200 }}
              rowKey="id"
              dataSource={listQuery.data}
              columns={columns}
              pagination={false}
            />
          </div>
        </QueryState>
      </div>
      <AppFormDialog
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={800}
        title={editing ? '编辑首页入口' : '新增首页入口'}
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={() => void handleSubmit(onValid)()}
      >
        <HomeBlockForm control={control} errors={errors} />
      </AppFormDialog>
    </>
  )
}
