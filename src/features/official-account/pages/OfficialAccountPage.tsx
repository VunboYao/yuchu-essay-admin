import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { officialAccountQueries, OfficialAccountKeys } from '../queries'
import styles from './OfficialAccountPage.module.css'
import { useState } from 'react'
import { Table, Button, Space, App, type TableProps, Tag, Popconfirm, Alert } from 'antd'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  officialAccountWriteSchema,
  type OfficialAccountWriteInput,
  type OfficialAccountWriteOutput,
} from '../schemas'
import { upsertOfficialAccount, deleteOfficialAccount } from '../api'
import { AppFormDialog, QueryState, PageHeader, type QueryStateEnum } from '@/shared/ui'
import type { OfficialAccountConfig } from '@/shared/types'
import { OfficialAccountForm } from '../components/OfficialAccountForm'
import { ApiError } from '@/shared/api'

const initialValues: OfficialAccountWriteInput = {
  scene: '',
  username: '',
  title: '',
  description: '',
  status: 1,
}

export function Component() {
  const { message } = App.useApp()
  const listQuery = useQuery(officialAccountQueries.list())
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<OfficialAccountConfig | null>(null)
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OfficialAccountWriteInput, unknown, OfficialAccountWriteOutput>({
    resolver: zodResolver(officialAccountWriteSchema),
    defaultValues: initialValues,
  })

  let queryStatus: QueryStateEnum = 'success'
  if (listQuery.isPending) {
    queryStatus = 'pending'
  } else if (!listQuery.data && listQuery.isError) {
    queryStatus = 'error'
  } else if (listQuery.data?.length === 0) {
    queryStatus = 'empty'
  }

  const showFetchError = Boolean(listQuery.data && listQuery.isRefetchError)

  const upsertMutation = useMutation({
    mutationFn: upsertOfficialAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OfficialAccountKeys.lists() })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteOfficialAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OfficialAccountKeys.lists() })
    },
  })

  const handleCreate = () => {
    setEditing(null)
    reset(initialValues)
    setOpen(true)
  }

  const handleEdit = (record: OfficialAccountConfig) => {
    setEditing(record)
    reset({
      scene: record.scene,
      username: record.username,
      title: record.title,
      description: record.description,
      status: record.status,
    })
    setOpen(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id)
      message.success('删除成功')
    } catch (error) {
      message.error(error instanceof ApiError ? error.message : '删除失败')
    }
  }

  const actionsLock = upsertMutation.isPending || deleteMutation.isPending

  const columns: TableProps<OfficialAccountConfig>['columns'] = [
    {
      title: '场景',
      dataIndex: 'scene',
    },
    {
      title: '标题',
      dataIndex: 'title',
    },
    {
      title: '描述',
      dataIndex: 'description',
    },
    {
      title: '用户名',
      dataIndex: 'username',
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status) => (
        <Tag color={status === 1 ? 'green' : 'red'}>{status === 1 ? '启用' : '禁用'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="link" disabled={actionsLock} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          {record.status === 1 ? (
            <Button type="link" disabled title="请先禁用再删除">
              删除
            </Button>
          ) : (
            <Popconfirm
              title="确定删除吗？"
              disabled={actionsLock}
              onConfirm={() => handleDelete(record.id)}
            >
              <Button type="link" danger disabled={actionsLock}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  const onValid = async (data: OfficialAccountWriteOutput) => {
    try {
      await upsertMutation.mutateAsync(data)
      message.success('已保存')
      setOpen(false)
    } catch (error) {
      message.error(error instanceof ApiError ? error.message : '操作失败')
    }
  }

  return (
    <>
      <div className={styles.page}>
        <PageHeader
          title="公众号导流配置"
          extra={
            <Button type="primary" onClick={handleCreate}>
              添加
            </Button>
          }
        />
        <QueryState status={queryStatus}>
          <div className={styles.tableBlock}>
            {showFetchError && (
              <Alert
                showIcon
                title={
                  listQuery.error instanceof ApiError ? listQuery.error.message : '获取数据失败'
                }
                type="error"
              />
            )}
            {listQuery.data && (
              <Table
                loading={{ spinning: listQuery.isFetching, delay: 200 }}
                dataSource={listQuery.data}
                columns={columns}
                rowKey="id"
                pagination={false}
              />
            )}
          </div>
        </QueryState>
      </div>
      <AppFormDialog
        confirmLoading={upsertMutation.isPending}
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={() => void handleSubmit(onValid)()}
        title={editing ? '编辑公众号导流配置' : '添加公众号导流配置'}
      >
        <OfficialAccountForm control={control} errors={errors} isEditing={!!editing} />
      </AppFormDialog>
    </>
  )
}
