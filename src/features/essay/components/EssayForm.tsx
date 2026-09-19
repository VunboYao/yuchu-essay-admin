import { useState } from 'react'
import { Controller, type Control, type FieldErrors } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App, Button, Divider, Form, Input, InputNumber, Radio, Select, Space } from 'antd'
import { GRADE_OPTIONS, STATUS_OPTIONS } from '@/shared/constants/options'
import { ApiError } from '@/shared/api'
import { createTag } from '@/features/tag/api'
import { tagKeys, tagQueries } from '@/features/tag/queries'
import { articleQueries } from '@/features/article/queries'
import type { Tag } from '@/shared/types'
import type { EssayWriteInput, EssayWriteOutput } from '../schemas'
import { RichTextEditor } from './RichTextEditor'

const tagDictQuery = tagQueries.list({ status: 1, page: 1, pageSize: 100 })

// ponytail: 专题下拉只拉 100 条；超过再加本地 keyword 打 articleQueries.list
const articleDictQuery = articleQueries.list({
  grade: '',
  semester: '',
  unit: '',
  contentType: '',
  status: '',
  keyword: '',
  tagId: '',
  page: 1,
  pageSize: 100,
})

export function EssayForm({
  control,
  errors,
  editorSeed,
  extraTags = [],
}: {
  control: Control<EssayWriteInput, unknown, EssayWriteOutput>
  errors: FieldErrors<EssayWriteInput>
  editorSeed: string
  extraTags?: Tag[]
}) {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [newTagName, setNewTagName] = useState('')
  const tagListQuery = useQuery(tagDictQuery)
  const articleListQuery = useQuery(articleDictQuery)
  const tags = tagListQuery.data?.list ?? []
  const articles = articleListQuery.data?.list ?? []
  const name = newTagName.trim()
  const tagOptions = [
    ...tags,
    ...extraTags.filter((tag) => !tags.some((item) => item.id === tag.id)),
  ]

  const createTagMutation = useMutation({
    mutationFn: createTag,
    onSettled: () => queryClient.invalidateQueries({ queryKey: tagKeys.all }),
  })

  async function addTag(currentIds: number[], onChange: (ids: number[]) => void) {
    if (!name || createTagMutation.isPending) return
    const existing = tags.find((tag) => tag.name === name)
    if (existing) {
      onChange(currentIds.includes(existing.id) ? currentIds : [...currentIds, existing.id])
      setNewTagName('')
      return
    }
    try {
      const created = await createTagMutation.mutateAsync({
        name,
        sortOrder: 0,
        status: 1,
      })
      message.success(`已创建标签「${created.name}」`)
      onChange(currentIds.includes(created.id) ? currentIds : [...currentIds, created.id])
      setNewTagName('')
    } catch (error) {
      message.error(error instanceof ApiError ? error.message : '创建失败')
      const found = queryClient
        .getQueryData(tagDictQuery.queryKey)
        ?.list.find((tag) => tag.name === name)
      if (!found) return
      onChange(currentIds.includes(found.id) ? currentIds : [...currentIds, found.id])
      setNewTagName('')
    }
  }

  return (
    <Form
      layout="horizontal"
      labelCol={{ span: 4 }}
      wrapperCol={{ span: 20 }}
      style={{ marginTop: 16 }}
    >
      <Form.Item
        label="标题"
        required
        validateStatus={errors.title ? 'error' : ''}
        help={errors.title?.message}
      >
        <Controller
          control={control}
          name="title"
          render={({ field }) => <Input placeholder="作文标题" {...field} />}
        />
      </Form.Item>

      <Form.Item
        label="年级"
        required
        validateStatus={errors.grade ? 'error' : ''}
        help={errors.grade?.message}
      >
        <Controller
          control={control}
          name="grade"
          render={({ field }) => <Select options={[...GRADE_OPTIONS]} {...field} />}
        />
      </Form.Item>

      <Form.Item
        label="所属专题"
        validateStatus={errors.articleId ? 'error' : ''}
        help={errors.articleId?.message}
      >
        <Controller
          control={control}
          name="articleId"
          render={({ field }) => (
            <Select
              allowClear
              showSearch={{ optionFilterProp: 'label' }}
              placeholder="不关联专题"
              options={articles.map((article) => ({
                label: `${article.title}（${article.grade}年级）`,
                value: article.id,
              }))}
              value={field.value || undefined}
              onChange={(id) => field.onChange(id ?? null)}
            />
          )}
        />
      </Form.Item>

      <Form.Item
        label="排序"
        required
        validateStatus={errors.sortOrder ? 'error' : ''}
        help={errors.sortOrder?.message}
      >
        <Controller
          control={control}
          name="sortOrder"
          render={({ field }) => <InputNumber precision={0} min={0} max={9999} {...field} />}
        />
      </Form.Item>

      <Form.Item
        label="状态"
        required
        validateStatus={errors.status ? 'error' : ''}
        help={errors.status?.message}
      >
        <Controller
          control={control}
          name="status"
          render={({ field }) => <Radio.Group options={[...STATUS_OPTIONS]} {...field} />}
        />
      </Form.Item>

      <Form.Item
        label="标签"
        validateStatus={errors.tagIds ? 'error' : ''}
        help={errors.tagIds?.message}
      >
        <Controller
          control={control}
          name="tagIds"
          render={({ field }) => (
            <Select
              mode="multiple"
              showSearch={{ optionFilterProp: 'label' }}
              placeholder="选择标签，或在下拉底部添加"
              options={tagOptions.map((tag) => ({ label: tag.name, value: tag.id }))}
              popupRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <Space style={{ padding: '0 8px 4px' }}>
                    <Input
                      placeholder="新标签名"
                      maxLength={80}
                      value={newTagName}
                      onChange={(event) => setNewTagName(event.target.value)}
                      onKeyDown={(event) => event.stopPropagation()}
                      onPressEnter={() => void addTag(field.value ?? [], field.onChange)}
                    />
                    <Button
                      type="text"
                      disabled={!name || createTagMutation.isPending}
                      onClick={() => void addTag(field.value ?? [], field.onChange)}
                    >
                      添加
                    </Button>
                  </Space>
                </>
              )}
              {...field}
            />
          )}
        />
      </Form.Item>

      <Form.Item
        label="正文"
        required
        validateStatus={errors.body ? 'error' : ''}
        help={errors.body?.message}
      >
        <Controller
          control={control}
          name="body"
          render={({ field }) => (
            <RichTextEditor
              key={`body-${editorSeed}`}
              large
              value={field.value}
              onChange={field.onChange}
              placeholder="输入作文正文"
            />
          )}
        />
      </Form.Item>

      <Form.Item
        label="点评"
        validateStatus={errors.comment ? 'error' : ''}
        help={errors.comment?.message}
      >
        <Controller
          control={control}
          name="comment"
          render={({ field }) => (
            <RichTextEditor
              key={`comment-${editorSeed}`}
              value={field.value}
              onChange={field.onChange}
              placeholder="点评可空"
            />
          )}
        />
      </Form.Item>
    </Form>
  )
}
