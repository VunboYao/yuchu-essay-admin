import { Select, Table, Input, type TableProps, Alert, App, Button } from 'antd'
import { PageHeader, AppFormDialog, QueryState, type QueryStateEnum } from '@/shared/ui'
import type { Feedback } from '@/shared/types'
import { useQuery, useMutation, keepPreviousData, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { feedbackWrite, type FeedbackWriteInput, type FeedbackWriteOutput } from '../schemas'
import { feedbackQueries, feedbackKeys } from '../queries'
import { zodResolver } from '@hookform/resolvers/zod'
import { replyFeedback, type FeedbackListQuery } from '../api'
import { useState } from 'react'
import { ApiError } from '@/shared/api'
import { FEEDBACK_STATUS_OPTIONS, labelOf } from '@/shared/constants/options'
import styles from './FeedbackPage.module.css'
import { FeedbackReplyForm } from '../components/FeedbackReplyForm'

const initialQuery: FeedbackListQuery = {
  status: '',
  page: 1,
  pageSize: 10,
  keyword: '',
}
export function Component() {
  const { message } = App.useApp()
  const [query, setQuery] = useState<FeedbackListQuery>(initialQuery)
  const [keywordDraft, setKeywordDraft] = useState('')
  const [open, setOpen] = useState(false)
  const [editingFeedback, setEditingFeedback] = useState<Feedback | undefined>()
  const queryClient = useQueryClient()
  const {
    control,
    formState: { errors },
    handleSubmit,
    reset,
  } = useForm<FeedbackWriteInput, unknown, FeedbackWriteOutput>({
    resolver: zodResolver(feedbackWrite),
    defaultValues: {
      reply: '',
    },
  })
  const listQuery = useQuery({
    ...feedbackQueries.list(query),
    placeholderData: keepPreviousData,
  })

  let queryStatus: QueryStateEnum = 'success'
  if (listQuery.isPending && !listQuery.isPlaceholderData) {
    queryStatus = 'pending'
  } else if (!listQuery.data && listQuery.isError) {
    queryStatus = 'error'
  } else if (listQuery.data?.list.length === 0) {
    queryStatus = 'empty'
  }

  const showFetchError = Boolean(listQuery.data && listQuery.isRefetchError)

  const replyMutation = useMutation({
    mutationFn: replyFeedback,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedbackKeys.lists() })
    },
  })

  const openReply = (row: Feedback) => {
    reset({
      reply: row.reply ?? '',
    })
    setEditingFeedback(row)
    setOpen(true)
  }

  const onValid = async (data: FeedbackWriteOutput) => {
    if (!editingFeedback) return
    try {
      await replyMutation.mutateAsync({
        id: editingFeedback.id,
        input: {
          reply: data.reply,
        },
      })
      message.success('回复成功')
      setOpen(false)
    } catch (error) {
      message.error(error instanceof ApiError ? error.message : '回复失败')
    }
  }

  const columns: TableProps<Feedback>['columns'] = [
    {
      title: 'ID',
      dataIndex: 'id',
    },
    {
      title: '用户ID',
      dataIndex: 'userId',
    },
    {
      title: '用户昵称',
      dataIndex: 'userNickname',
    },
    {
      title: '反馈内容',
      dataIndex: 'content',
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (value) => labelOf(FEEDBACK_STATUS_OPTIONS, value),
    },
    {
      title: '回复内容',
      dataIndex: 'reply',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
    },
    {
      title: '回复时间',
      dataIndex: 'repliedAt',
    },
    {
      title: '操作',
      render: (_, record) => (
        <Button type="link" disabled={replyMutation.isPending} onClick={() => openReply(record)}>
          回复
        </Button>
      ),
    },
  ]
  return (
    <div className={styles.page}>
      <PageHeader title="意见反馈">
        <Select
          className={styles.status}
          value={query.status}
          options={[{ label: '全部', value: '' }, ...FEEDBACK_STATUS_OPTIONS]}
          onChange={(value) => setQuery((prev) => ({ ...prev, status: value, page: 1 }))}
        />
        <Input.Search
          className={styles.keyword}
          value={keywordDraft}
          onChange={(e) => setKeywordDraft(e.target.value)}
          placeholder="请输入关键词"
          onSearch={(value) =>
            setQuery((prev) => ({
              ...prev,
              keyword: value,
              page: 1,
            }))
          }
        />
      </PageHeader>
      <QueryState
        status={queryStatus}
        errorText={listQuery.error instanceof ApiError ? listQuery.error.message : '加载失败'}
        emptyText="暂无反馈"
      >
        <div className={styles.tableBlock}>
          {showFetchError && (
            <Alert
              showIcon
              type="error"
              title={listQuery.error instanceof ApiError ? listQuery.error.message : '数据同步失败'}
            />
          )}

          <Table
            loading={{ spinning: listQuery.isFetching, delay: 200 }}
            dataSource={listQuery.data?.list}
            columns={columns}
            rowKey="id"
            pagination={{
              current: query.page,
              pageSize: query.pageSize,
              showSizeChanger: false,
              total: listQuery.data?.total ?? 0,
              showTotal: (total) => `共${total}条`,
              onChange: (page) => setQuery((prev) => ({ ...prev, page })),
            }}
          />
        </div>
      </QueryState>
      <AppFormDialog
        open={open}
        confirmLoading={replyMutation.isPending}
        onSubmit={() => void handleSubmit(onValid)()}
        onClose={() => setOpen(false)}
        title="回复意见反馈"
      >
        <div className={styles.preview}>
          <div className={styles.previewLabel}>用户原文</div>
          <div className={styles.previewContent}>{editingFeedback?.content}</div>
        </div>
        <FeedbackReplyForm control={control} errors={errors} />
      </AppFormDialog>
    </div>
  )
}
