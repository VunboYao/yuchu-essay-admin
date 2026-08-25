import { Empty, Alert, Skeleton } from 'antd'
import { ApiError } from '@/shared/api/api-error'

export type QueryStateEnum = 'pending' | 'error' | 'empty' | 'success'

type QueryStateProps = {
  status: QueryStateEnum
  emptyText?: string
  errorText?: string | ApiError
  children: React.ReactNode
}

export default function QueryState({
  status,
  emptyText = '暂无数据',
  errorText,
  children,
}: QueryStateProps) {
  if (status === 'pending') {
    return <Skeleton active />
  }

  if (status === 'error') {
    const message =
      typeof errorText === 'string'
        ? errorText
        : errorText instanceof ApiError
          ? errorText.message
          : '未知错误'
    return <Alert showIcon title={message} type="error" />
  }

  if (status === 'empty') {
    return <Empty description={emptyText} />
  }

  if (status === 'success') {
    return children
  }
}
