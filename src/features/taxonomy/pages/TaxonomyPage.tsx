import { useState } from 'react'
import type { TaxonomyUnit } from '@/shared/types'
import { TaxonomyForm } from '../components/TaxonomyForm'
import { useForm } from 'react-hook-form'
import {
  taxonomyUnitWriteSchema,
  type TaxonomyUnitWriteInput,
  type TaxonomyUnitWriteOutput,
} from '../schemas'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  statusLabel,
  GRADE_OPTIONS,
  SEMESTER_OPTIONS,
  STATUS_OPTIONS,
  UNIT_OPTIONS,
} from '@/shared/constants/options'
import { Tag, Button, Table, Alert, Select, App, type TableProps } from 'antd'
import styles from './TaxonomyPage.module.css'
import { PageHeader, QueryState, AppFormDialog, type QueryStateEnum } from '@/shared/ui'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { taxonomyUnitKeys, taxonomyUnitQueries } from '../queries'
import { createTaxonomyUnit, updateTaxonomyUnit, type TaxonomyListQuery } from '../api'
import { ApiError } from '@/shared/api'

const initialValues: TaxonomyUnitWriteInput = {
  textbookVersion: '统编版',
  grade: 1,
  semester: '上册',
  unit: 1,
  unitTitle: '',
  sortOrder: 0,
  status: 1,
}

export function Component() {
  const [formOpen, setFormOpen] = useState(false)
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<TaxonomyUnit | null>(null)
  const { message } = App.useApp()
  const [query, setQuery] = useState<TaxonomyListQuery>({
    page: 1,
    pageSize: 10,
    grade: '',
    semester: '',
    status: '',
  })
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TaxonomyUnitWriteInput, unknown, TaxonomyUnitWriteOutput>({
    resolver: zodResolver(taxonomyUnitWriteSchema),
    defaultValues: initialValues,
  })

  const listQuery = useQuery({
    ...taxonomyUnitQueries.list(query),
    placeholderData: keepPreviousData,
  })
  const updateMutation = useMutation({
    mutationFn: updateTaxonomyUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxonomyUnitKeys.lists() })
    },
  })
  const createMutation = useMutation({
    mutationFn: createTaxonomyUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxonomyUnitKeys.lists() })
    },
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

  const onValid = async (input: TaxonomyUnitWriteOutput) => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, input })
        message.success('更新成功')
      } else {
        await createMutation.mutateAsync(input)
        message.success('创建成功')
      }
      setFormOpen(false)
    } catch (error) {
      message.error(error instanceof ApiError ? error.message : '操作失败')
    }
  }

  const handleEdit = (record: TaxonomyUnit) => {
    reset({
      textbookVersion: record.textbookVersion,
      grade: record.grade,
      semester: record.semester,
      unit: record.unit,
      unitTitle: record.unitTitle,
      sortOrder: record.sortOrder,
      status: record.status,
    })
    setEditing(record)
    setFormOpen(true)
  }

  const handleCreate = () => {
    reset(initialValues)
    setEditing(null)
    setFormOpen(true)
  }

  const columns: TableProps<TaxonomyUnit>['columns'] = [
    {
      title: '教材版本',
      dataIndex: 'textbookVersion',
    },
    {
      title: '年级',
      dataIndex: 'grade',
      render: (text) => GRADE_OPTIONS.find((option) => option.value === text)?.label,
    },
    {
      title: '册次',
      dataIndex: 'semester',
    },
    {
      title: '单元',
      dataIndex: 'unit',
      render: (text) => UNIT_OPTIONS.find((option) => option.value === text)?.label,
    },
    {
      title: '单元标题',
      dataIndex: 'unitTitle',
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
      render: (_, record) => (
        <div className={styles.rowActions} onClick={() => handleEdit(record)}>
          <Button type="link">编辑</Button>
        </div>
      ),
    },
  ]
  return (
    <>
      <div className={styles.page}>
        <PageHeader
          title="教材分类"
          extra={
            <Button type="primary" onClick={handleCreate}>
              新建单元
            </Button>
          }
        >
          <Select
            placeholder="请选择年级"
            options={[{ label: '全部', value: '' }, ...GRADE_OPTIONS]}
            className={styles.grade}
            value={query.grade}
            onChange={(value) => setQuery((prev) => ({ ...prev, grade: value, page: 1 }))}
          />
          <Select
            placeholder="请选择册次"
            options={[{ label: '全部', value: '' }, ...SEMESTER_OPTIONS]}
            className={styles.semester}
            value={query.semester}
            onChange={(value) => setQuery((prev) => ({ ...prev, semester: value, page: 1 }))}
          />
          <Select
            placeholder="请选择状态"
            options={[{ label: '全部', value: '' }, ...STATUS_OPTIONS]}
            className={styles.status}
            value={query.status}
            onChange={(value) => setQuery((prev) => ({ ...prev, status: value, page: 1 }))}
          />
        </PageHeader>

        <QueryState
          status={queryStatus}
          errorText={listQuery.error instanceof ApiError ? listQuery.error.message : '加载失败'}
          emptyText="暂无教材分类"
        >
          <div className={styles.tableBlock}>
            {showFetchError ? (
              <Alert
                type="error"
                showIcon
                title={
                  listQuery.error instanceof ApiError ? listQuery.error.message : '数据同步失败'
                }
              />
            ) : null}
            <Table
              rowKey="id"
              columns={columns}
              dataSource={listQuery.data?.list}
              loading={{ spinning: listQuery.isFetching, delay: 200 }}
              pagination={{
                placement: ['bottomEnd'],
                current: query.page,
                pageSize: query.pageSize,
                total: listQuery?.data?.total,
                showTotal: (total) => `共 ${total} 条`,
                onChange: (page, pageSize) =>
                  setQuery((prev) => ({
                    ...prev,
                    page: prev.pageSize === pageSize ? page : 1,
                    pageSize,
                  })),
              }}
            />
          </div>
        </QueryState>
      </div>
      <AppFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? '编辑教材分类' : '新建教材分类'}
        confirmLoading={editing ? updateMutation.isPending : createMutation.isPending}
        onSubmit={() => void handleSubmit(onValid)()}
      >
        <TaxonomyForm control={control} errors={errors} />
      </AppFormDialog>
    </>
  )
}
