import { Table, Button, type TableProps, App, Alert, Space, Tag, Popconfirm } from 'antd'
import styles from './AdSlotPage.module.css'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adSlotKeys, adSlotQueries } from '../queries'
import { AppFormDialog, PageHeader, QueryState, type QueryStateEnum } from '@/shared/ui'
import { useState } from 'react'
import { adSlotWriteSchema, type AdSlotWriteOutput, type AdSlotWriteInput } from '../schemas'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import type { AdSlot } from '@/shared/types'
import { AdSlotForm } from '../components/AdSlotForm'
import {
  AD_PAGE_OPTIONS,
  AD_TYPE_OPTIONS,
  STATUS_OPTIONS,
  labelOf,
} from '@/shared/constants/options'
import { upsertAdSlot, deleteAdSlot } from '../api'
import { ApiError } from '@/shared/api'
import { DOWNLOAD_GATE_IDENTITY } from '../constants'

const initialValues: AdSlotWriteInput = {
  slotKey: '',
  slotName: '',
  page: 'home',
  adType: 'banner',
  sortOrder: 0,
  status: 1,
}

export function Component() {
  const { message } = App.useApp()
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const listQuery = useQuery({ ...adSlotQueries.list() })
  const [editing, setEditing] = useState<AdSlot | null>(null)
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    getValues,
  } = useForm<AdSlotWriteInput, unknown, AdSlotWriteOutput>({
    defaultValues: initialValues,
    resolver: zodResolver(adSlotWriteSchema),
  })

  const upsertMutation = useMutation({
    mutationFn: upsertAdSlot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adSlotKeys.lists() })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAdSlot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adSlotKeys.lists() })
    },
  })

  const actionsLocked = upsertMutation.isPending || deleteMutation.isPending

  const handleCreate = () => {
    reset(initialValues)
    setEditing(null)
    setOpen(true)
  }

  const handleFillDownloadGateIdentity = () => {
    reset({ ...getValues(), ...DOWNLOAD_GATE_IDENTITY })
  }

  const handleEdit = (record: AdSlot) => {
    reset({
      slotKey: record.slotKey,
      slotName: record.slotName,
      page: record.page,
      adType: record.adType,
      position: record.position,
      adUnitId: record.adUnitId,
      sortOrder: record.sortOrder,
      status: record.status,
    })
    setEditing(record)
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

  const columns: TableProps<AdSlot>['columns'] = [
    {
      title: '广告位Key',
      dataIndex: 'slotKey',
    },
    {
      title: '广告位名称',
      dataIndex: 'slotName',
    },
    {
      title: '广告位页面',
      dataIndex: 'page',
      render: (text) => labelOf(AD_PAGE_OPTIONS, text),
    },
    {
      title: '广告位类型',
      dataIndex: 'adType',
      render: (text) => (
        <Tag color={text === 'banner' ? 'green' : 'gold'}>{labelOf(AD_TYPE_OPTIONS, text)}</Tag>
      ),
    },
    {
      title: '广告位单元ID',
      dataIndex: 'adUnitId',
    },
    {
      title: '页面内位置',
      dataIndex: 'position',
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
      title: '操作',
      dataIndex: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" disabled={actionsLocked} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          {record.status === 1 ? (
            <Button type="link" disabled title="请先禁用再删除">
              删除
            </Button>
          ) : (
            <Popconfirm
              title="确定删除吗？"
              onConfirm={() => handleDelete(record.id)}
              disabled={actionsLocked}
            >
              <Button type="link" danger disabled={actionsLocked}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  const onValid = async (data: AdSlotWriteOutput) => {
    try {
      await upsertMutation.mutateAsync(data)
      message.success('已保存')
      setOpen(false)
    } catch (error) {
      message.error(error instanceof ApiError ? error.message : '操作失败')
    }
  }

  let queryStatus: QueryStateEnum = 'success'
  if (listQuery.isPending) {
    queryStatus = 'pending'
  } else if (!listQuery.data && listQuery.isError) {
    queryStatus = 'error'
  } else if (listQuery.data?.length === 0) {
    queryStatus = 'empty'
  }

  const showFetchError = Boolean(listQuery.data && listQuery.isRefetchError)

  return (
    <>
      <div className={styles.page}>
        <PageHeader
          title="广告位管理"
          extra={
            <>
              <Button type="primary" onClick={handleCreate}>
                添加广告位
              </Button>
              <Button type="primary" onClick={() => void listQuery.refetch()}>
                刷新
              </Button>
            </>
          }
        />
        <QueryState status={queryStatus}>
          <div className={styles.tableBlock}>
            {showFetchError && (
              <Alert
                showIcon
                title={
                  listQuery.error instanceof ApiError ? listQuery.error.message : '数据同步失败'
                }
                type="error"
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
        title={editing ? '编辑广告位' : '添加广告位'}
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={() => void handleSubmit(onValid)()}
        confirmLoading={upsertMutation.isPending}
      >
        <AdSlotForm
          control={control}
          errors={errors}
          isEditing={Boolean(editing)}
          onFillIdentity={handleFillDownloadGateIdentity}
        />
      </AppFormDialog>
    </>
  )
}
