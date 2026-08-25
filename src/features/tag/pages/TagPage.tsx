import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tagKeys, tagQueries } from '../queries'
import { deleteTag, updateTag, type Tag, type TagListQuery } from '../api'
import { CreateTagForm } from '../components/CreateTagForm'
import { QueryState, PageHeader, AppFormDialog } from '@/shared/ui'
import type { QueryStateEnum } from '@/shared/ui/QueryState'

const initialQuery: TagListQuery = {
  keyword: '',
  status: '',
  page: 1,
  pageSize: 5,
}

export function Component() {
  const queryClinet = useQueryClient()
  const [query, setQuery] = useState<TagListQuery>(initialQuery)
  const [open, setOpen] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [tempStatus, setTempStatus] = useState<QueryStateEnum>('pending')

  const tagsQuery = useQuery({
    ...tagQueries.list(query),
    placeholderData: keepPreviousData,
  })

  const updateMutation = useMutation({
    mutationFn: updateTag,
    onSuccess: async () => {
      await queryClinet.invalidateQueries({ queryKey: tagKeys.lists() })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTag,
    onSuccess: async () => {
      await queryClinet.invalidateQueries({ queryKey: tagKeys.lists() })
    },
  })

  const toggleStatus = (tag: Tag) => {
    updateMutation.mutate({
      id: tag.id,
      input: {
        name: tag.name,
        sortOrder: tag.sortOrder,
        status: tag.status === 1 ? 0 : 1,
      },
    })
  }

  if (tagsQuery.isPending && !tagsQuery.isPlaceholderData) {
    return <p>首次挂载: 标签列表加载中....</p>
  }

  if (tagsQuery.isLoadingError) {
    return <p role="alert">刷新失败: {tagsQuery.error.message}</p>
  }

  const pageData = tagsQuery.data
  const hasNextPage = query.page * query.pageSize < pageData.total

  const handleSubmit = async () => {
    setConfirmLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setConfirmLoading(false)
    setOpen(false)
  }

  return (
    <main>
      <PageHeader title="标签管理">
        <button type="button" onClick={() => setOpen(true)}>
          创建标签
        </button>
      </PageHeader>
      <select onChange={(event) => setTempStatus(event.target.value as QueryStateEnum)}>
        <option value="pending">加载中</option>
        <option value="error">错误</option>
        <option value="empty">空</option>
        <option value="success">成功</option>
      </select>
      <QueryState status={tempStatus} errorText="网络错误">
        <h2>标签管理 </h2>
        <button type="button" onClick={() => setOpen(true)}>
          创建标签
        </button>
      </QueryState>
      <AppFormDialog
        open={open}
        onClose={() => setOpen(false)}
        title="创建标签"
        confirmLoading={confirmLoading}
        onSubmit={handleSubmit}
      >
        <CreateTagForm />
      </AppFormDialog>
      <section aria-label="标签筛选">
        <input
          aria-label="标签名称"
          placeholder="请输入标签名称"
          value={query.keyword}
          onChange={(event) => {
            setQuery((current) => ({
              ...current,
              keyword: event.target.value,
              page: 1,
            }))
          }}
        />

        <select
          aria-label="标签状态"
          value={query.status}
          onChange={(event) => {
            const value = event.target.value
            setQuery((current) => ({
              ...current,
              status: value === '' ? '' : (Number(value) as 0 | 1),
              page: 1,
            }))
          }}
        >
          <option value="">全部状态</option>
          <option value="1">启用</option>
          <option value="0">禁用</option>
        </select>
      </section>

      {tagsQuery.isFetching && <p>数据同步中....</p>}
      {tagsQuery.isRefetchError && <p role="alert">刷新失败,当前显示上一次成功数据</p>}

      {pageData.list.length === 0 ? (
        <p>暂无标签</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>名称</th>
              <th>排序</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {pageData.list.map((tag) => (
              <tr key={tag.id}>
                <td>{tag.name}</td>
                <td>{tag.sortOrder}</td>
                <td>{tag.status === 1 ? '启用' : '禁用'}</td>
                <td>
                  <button
                    type="button"
                    disabled={updateMutation.isPending}
                    onClick={() => toggleStatus(tag)}
                  >
                    {tag.status === 1 ? '禁用' : '启用'}
                  </button>
                  <button
                    type="button"
                    disabled={tag.status === 1 || deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(tag.id)}
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <nav aria-label="标签分页">
        <button
          type="button"
          disabled={query.page === 1}
          onClick={() => {
            setQuery((current) => ({
              ...current,
              page: current.page - 1,
            }))
          }}
        >
          上一页
        </button>
        <span>第 {query.page} 页</span>
        <button
          type="button"
          disabled={!hasNextPage || tagsQuery.isPlaceholderData}
          onClick={() => {
            setQuery((current) => ({
              ...current,
              page: current.page + 1,
            }))
          }}
        >
          下一页
        </button>
      </nav>

      {(updateMutation.isError || deleteMutation.isError) && (
        <p role="alert">{updateMutation.error?.message ?? deleteMutation.error?.message}</p>
      )}
    </main>
  )
  // return <Empty description="暂无数据" />
}
