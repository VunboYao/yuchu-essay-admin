import styles from './TagPage.module.css'
import { PageHeader, AppFormDialog, QueryState, type QueryStateEnum } from '@/shared/ui'
import { Button, Input, Select, Table, type TableProps, Tag } from 'antd'
import { useState } from 'react'
import { TagForm } from '../components/TagForm'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { tagWriteSchema, type TagWriteInput, type TagWriteOutput } from '../schemas'
import type { TagListQuery } from '../api'
import { STATUS_OPTIONS } from '@/shared/constants/options'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { tagQueries } from '../queries'
import type { Tag as TagType } from '@/shared/types'
import { statusLabel } from '@/shared/constants/options'
import type { ApiError } from '@/shared/api'

const initialQuery: TagListQuery = {
  status: '',
  page: 1,
  pageSize: 10,
  keyword: '',
}

export function Component() {
  const [query, setQuery] = useState<TagListQuery>(initialQuery)
  const [keywordDraft, setKeywordDraft] = useState(initialQuery.keyword ?? '')
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TagWriteInput, unknown, TagWriteOutput>({
    resolver: zodResolver(tagWriteSchema),
    defaultValues: {
      name: '',
      sortOrder: 0,
      status: 1,
    },
  })
  const listQuery = useQuery({
    ...tagQueries.list(query),
    placeholderData: keepPreviousData,
  })

  const [open, setOpen] = useState(false)

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
      render: () => (
        <div className={styles.rowActions}>
          <Button type="link" onClick={() => setOpen(true)}>
            编辑
          </Button>
        </div>
      ),
    },
  ]

  // QueryState 只管整页四态；后台刷新的提示用下面两个开关，不要把 status 打回 pending。
  let queryStatus: QueryStateEnum = 'success'
  // v5 + keepPreviousData：翻页时新 key 仍是 isPending，data 只是上一页占位。
  // 首次进页面,无缓存: 必须排除 isPlaceholderData，否则翻页会闪整页 Skeleton。
  if (listQuery.isPending && !listQuery.isPlaceholderData) {
    queryStatus = 'pending'
  } else if (!listQuery.data && listQuery.isError) {
    // 首次失败才整页 error。刷新失败时 data 还在，不能只看 isError。
    queryStatus = 'error'
  } else if (listQuery.data?.list.length === 0) {
    // 有成功结果但 list 为空（含搜不到）。data 为 undefined 时 ?. 不会误判 empty。
    queryStatus = 'empty'
  }

  // 已有真实成功数据后的后台刷新（= isRefetching）。翻页占位时 v5 仍是 isPending，故意不亮。
  const showFetchingHint = Boolean(listQuery.data && listQuery.isFetching && !listQuery.isPending)
  // 刷新失败但上一份 data 还在：表格继续画，只在上方提示。
  const showFetchError = Boolean(listQuery.data && listQuery.isRefetchError)

  return (
    <>
      <div className={styles.page}>
        <PageHeader
          title="标签管理"
          extra={
            <Button type="primary" onClick={() => setOpen(true)}>
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
          errorText={(listQuery.error as ApiError) ?? '加载失败'}
          emptyText="暂无标签"
        >
          {showFetchingHint ? <p className={styles.fetchingHint}>数据同步中</p> : null}
          {showFetchError ? <p className={styles.fetchError}>数据同步失败</p> : null}
          <Table
            rowKey="id"
            columns={columns}
            dataSource={listQuery?.data?.list}
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
        </QueryState>
      </div>

      <AppFormDialog
        open={open}
        onClose={() => setOpen(false)}
        title="新建标签"
        onSubmit={() => void handleSubmit(() => undefined)()}
      >
        <TagForm control={control} errors={errors} />
      </AppFormDialog>
    </>
  )
}
