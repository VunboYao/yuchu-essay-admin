import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { operationLogQueries } from '../queries'
import { PageHeader, QueryState, type QueryStateEnum } from '@/shared/ui'
import { Table, Input, Select, Alert, type TableProps } from 'antd'
import styles from './OperationLogPage.module.css'
import { useState } from 'react'
import type { OperationLogListParams } from '../api'
import type { OperationLog } from '@/shared/types'
import {
  ADMIN_OPLOG_TARGET_TYPE_OPTIONS,
  adminOpLogTargetTypeLabel,
} from '@/shared/constants/options'
import { ApiError } from '@/shared/api'

const initialQuery: OperationLogListParams = {
  adminId: '',
  targetType: '',
  page: 1,
  pageSize: 10,
}

export function Component() {
  const [query, setQuery] = useState<OperationLogListParams>(initialQuery)
  const [adminIdDraft, setAdminIdDraft] = useState<string>('')
  const listQuery = useQuery({
    ...operationLogQueries.list(query),
    placeholderData: keepPreviousData,
  })

  let queryStatus: QueryStateEnum = 'success'
  if (listQuery.status === 'pending' && !listQuery.isPlaceholderData) {
    queryStatus = 'pending'
  } else if (!listQuery.data && listQuery.isError) {
    queryStatus = 'error'
  } else if (listQuery.data?.list?.length === 0) {
    queryStatus = 'empty'
  }

  const showFetchError = Boolean(listQuery.data && listQuery.isRefetchError)

  const columns: TableProps<OperationLog>['columns'] = [
    {
      title: 'ID',
      dataIndex: 'id',
    },
    {
      title: '管理员ID',
      dataIndex: 'adminId',
    },
    {
      title: '操作',
      dataIndex: 'action',
    },
    {
      title: '目标类型',
      dataIndex: 'targetType',
      render: (value) => adminOpLogTargetTypeLabel(value),
    },
    {
      title: '目标ID',
      dataIndex: 'targetId',
    },
    {
      title: '备注',
      dataIndex: 'remark',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
    },
  ]

  function parseAdminId(raw: string): number | '' {
    const adminId = raw.trim()
    return /^[1-9]\d*$/.test(adminId) ? Number(adminId) : ''
  }

  return (
    <div className={styles.page}>
      <PageHeader title="操作日志">
        <Input.Search
          className={styles.adminId}
          placeholder="请输入管理员ID"
          value={adminIdDraft}
          onChange={(e) => setAdminIdDraft(e.target.value)}
          onSearch={(value) =>
            setQuery((prev) => ({ ...prev, adminId: parseAdminId(value), page: 1 }))
          }
        />
        <Select
          className={styles.targetType}
          placeholder="请选择目标类型"
          value={query.targetType}
          options={[{ label: '全部', value: '' }, ...ADMIN_OPLOG_TARGET_TYPE_OPTIONS]}
          onChange={(value) => setQuery((prev) => ({ ...prev, targetType: value, page: 1 }))}
        />
      </PageHeader>
      <QueryState
        status={queryStatus}
        emptyText="暂无操作日志"
        errorText={listQuery.error instanceof ApiError ? listQuery.error.message : '加载失败'}
      >
        <div className={styles.tableBlock}>
          {showFetchError ? (
            <Alert
              type="error"
              showIcon
              title={listQuery.error instanceof ApiError ? listQuery.error.message : '加载失败'}
            />
          ) : null}
          <Table
            rowKey="id"
            columns={columns}
            dataSource={listQuery.data?.list}
            loading={{ spinning: listQuery.isFetching, delay: 200 }}
            pagination={{
              pageSize: query.pageSize,
              current: query.page,
              total: listQuery.data?.total,
              showTotal: (total) => `共 ${total} 条`,
              showSizeChanger: false,
              onChange: (page) => {
                setQuery((prev) => ({ ...prev, page }))
              },
            }}
          />
        </div>
      </QueryState>
    </div>
  )
}
