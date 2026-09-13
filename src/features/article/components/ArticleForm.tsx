import { useState } from 'react'
import { Controller, type Control, type FieldErrors } from 'react-hook-form'
import type { ArticleWriteInput, ArticleWriteOutput } from '../schemas'
import { App, Button, Divider, Form, Input, InputNumber, Select, Image, Space, Switch } from 'antd'
import {
  GRADE_OPTIONS,
  UNIT_OPTIONS,
  SEMESTER_OPTIONS,
  CONTENT_TYPE_OPTIONS,
  ACCESS_TYPE_OPTIONS,
} from '@/shared/constants/options'
import { OssUploadButton } from '@/shared/oss'
import { BodyImageList } from './BodyImageList'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createTag } from '@/features/tag/api'
import { tagKeys, tagQueries } from '@/features/tag/queries'
import { ApiError } from '@/shared/api'

const tagDictQuery = tagQueries.list({ status: 1, page: 1, pageSize: 100 })

export function ArticleForm({
  control,
  errors,
}: {
  control: Control<ArticleWriteInput, unknown, ArticleWriteOutput>
  errors: FieldErrors<ArticleWriteInput>
}) {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [newTagName, setNewTagName] = useState('')
  const tagListQuery = useQuery(tagDictQuery)
  const tags = tagListQuery.data?.list ?? []
  const name = newTagName.trim()

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
      labelCol={{ flex: '80px' }}
      wrapperCol={{ flex: 1 }}
      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 16 }}
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
          render={({ field }) => <Input placeholder="文章标题" {...field} />}
        />
      </Form.Item>
      <Form.Item
        label="slug"
        required
        validateStatus={errors.slug ? 'error' : ''}
        help={errors.slug?.message}
      >
        <Controller
          control={control}
          name="slug"
          render={({ field }) => <Input placeholder="文章slug" {...field} />}
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
        label="单元"
        required
        validateStatus={errors.unit ? 'error' : ''}
        help={errors.unit?.message}
      >
        <Controller
          control={control}
          name="unit"
          render={({ field }) => <Select options={[...UNIT_OPTIONS]} {...field} />}
        />
      </Form.Item>
      <Form.Item
        label="册次"
        required
        validateStatus={errors.semester ? 'error' : ''}
        help={errors.semester?.message}
      >
        <Controller
          control={control}
          name="semester"
          render={({ field }) => <Select options={[...SEMESTER_OPTIONS]} {...field} />}
        />
      </Form.Item>
      <Form.Item
        label="教材版本"
        required
        validateStatus={errors.textbookVersion ? 'error' : ''}
        help={errors.textbookVersion?.message}
      >
        <Controller
          control={control}
          name="textbookVersion"
          render={({ field }) => <Input placeholder="教材版本" disabled {...field} />}
        />
      </Form.Item>
      <Form.Item
        label="文章主题"
        required
        validateStatus={errors.essayTopic ? 'error' : ''}
        help={errors.essayTopic?.message}
      >
        <Controller
          control={control}
          name="essayTopic"
          render={({ field }) => <Input placeholder="文章主题" {...field} />}
        />
      </Form.Item>
      <Form.Item
        label="内容类型"
        required
        validateStatus={errors.contentType ? 'error' : ''}
        help={errors.contentType?.message}
      >
        <Controller
          control={control}
          name="contentType"
          render={({ field }) => <Select options={[...CONTENT_TYPE_OPTIONS]} {...field} />}
        />
      </Form.Item>
      <Form.Item
        label="受众"
        validateStatus={errors.audience ? 'error' : ''}
        help={errors.audience?.message}
      >
        <Controller
          control={control}
          name="audience"
          render={({ field }) => <Input placeholder="受众" maxLength={120} {...field} />}
        />
      </Form.Item>
      <Form.Item
        label="摘要"
        required
        validateStatus={errors.summary ? 'error' : ''}
        help={errors.summary?.message}
      >
        <Controller
          control={control}
          name="summary"
          render={({ field }) => (
            <Input.TextArea maxLength={500} placeholder="文章摘要" {...field} />
          )}
        />
      </Form.Item>
      <Form.Item
        label="封面图"
        required
        validateStatus={errors.coverImg ? 'error' : ''}
        help={errors.coverImg?.message}
      >
        <Controller
          control={control}
          name="coverImg"
          render={({ field }) => {
            return (
              <>
                <Input {...field} placeholder="OSS objectKey 或完整 URL" />
                <Space style={{ marginTop: 8 }}>
                  {field.value && <Image src={field.value} width={40} />}
                  <OssUploadButton
                    subdir="covers"
                    access="public"
                    accept="image/*"
                    onSuccess={(result) => field.onChange(result.url)}
                  />
                </Space>
              </>
            )
          }}
        />
      </Form.Item>
      <Form.Item
        label="正文图"
        required
        validateStatus={errors.bodyImages ? 'error' : ''}
        help={errors.bodyImages?.message}
      >
        <Controller
          control={control}
          name="bodyImages"
          render={({ field }) => <BodyImageList value={field.value} onChange={field.onChange} />}
        />
      </Form.Item>
      <Form.Item
        label="标签"
        required
        validateStatus={errors.tagIds ? 'error' : ''}
        help={errors.tagIds?.message}
      >
        <Controller
          control={control}
          name="tagIds"
          render={({ field }) => (
            <Select
              mode="multiple"
              showSearch={{
                optionFilterProp: 'label',
              }}
              placeholder="选择标签，或在下拉底部添加"
              options={tags.map((tag) => ({ label: tag.name, value: tag.id }))}
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
        label="是否推荐"
        required
        validateStatus={errors.isRecommended ? 'error' : ''}
        help={errors.isRecommended?.message}
      >
        <Controller
          control={control}
          name="isRecommended"
          render={({ field }) => <Switch checked={field.value} onChange={field.onChange} />}
        />
      </Form.Item>
      <Form.Item
        label="是否热门"
        required
        validateStatus={errors.isHot ? 'error' : ''}
        help={errors.isHot?.message}
      >
        <Controller
          control={control}
          name="isHot"
          render={({ field }) => <Switch checked={field.value} onChange={field.onChange} />}
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
          render={({ field }) => (
            <InputNumber placeholder="排序" precision={0} min={0} max={9999} {...field} />
          )}
        />
      </Form.Item>
      <Form.Item
        label="访问权限"
        required
        validateStatus={errors.viewAccessType ? 'error' : ''}
        help={errors.viewAccessType?.message}
      >
        <Controller
          control={control}
          name="viewAccessType"
          render={({ field }) => <Select options={[...ACCESS_TYPE_OPTIONS]} disabled {...field} />}
        />
      </Form.Item>
    </Form>
  )
}
