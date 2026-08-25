import styles from './TagPage.module.css'
import { PageHeader, AppFormDialog, QueryState } from '@/shared/ui'
import { Button, Input, Select, Table } from 'antd'
import { useState } from 'react'
import { TagForm } from '../components/TagForm'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { tagWriteSchema, type TagWriteInput, type TagWriteOutput } from '../schemas'
import type { TagListQuery } from '../api'
import { STATUS_OPTIONS } from '@/shared/constants/options'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { tagQueries } from '../queries'

const initialQuery: TagListQuery = {
  status: '',
  page: 1,
  pageSize: 20,
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

        <QueryState status="success">
          <Table
            pagination={{
              placement: ['bottomEnd'],
              current: query.page,
              pageSize: query.pageSize,
              total: listQuery?.data?.total,
              showTotal: (total) => `共 ${total} 条`,
              pageSizeOptions: [10, 20, 50, 100],
              onChange: (page, pageSize) =>
                setQuery((prev) => ({
                  ...prev,
                  page: prev.pageSize === pageSize ? page : 1,
                  pageSize,
                })),
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
