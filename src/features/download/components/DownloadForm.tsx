import { Controller, type Control, type FieldErrors, type UseFormSetValue } from 'react-hook-form'
import type { DownloadFileSchemaInput, DownloadFileSchemaOutput } from '../schemas'
import { Form, Input, InputNumber, Select, Switch, Radio, Space } from 'antd'
import {
  ACCESS_TYPE_OPTIONS,
  STATUS_OPTIONS,
  OWNER_TYPE_OPTIONS,
  FREE_TAG,
} from '@/shared/constants/options'
import { OssUploadButton } from '@/shared/oss/OssUploadButton'
import { articleQueries } from '@/features/article/queries'
import { useQuery } from '@tanstack/react-query'

const articleDictQuery = articleQueries.list({
  status: '',
  page: 1,
  pageSize: 100,
  grade: '',
  semester: '',
  unit: '',
  contentType: '',
  keyword: '',
  tagId: '',
})

export function DownloadForm({
  control,
  setValue,
  errors,
}: {
  control: Control<DownloadFileSchemaInput, unknown, DownloadFileSchemaOutput>
  setValue: UseFormSetValue<DownloadFileSchemaInput>
  errors: FieldErrors<DownloadFileSchemaInput>
}) {
  const articleListQuery = useQuery(articleDictQuery)
  const articles = articleListQuery.data?.list ?? []

  return (
    <Form layout="horizontal" labelCol={{ flex: '100px' }}>
      <Form.Item
        label="归属类型"
        validateStatus={errors.ownerType ? 'error' : ''}
        help={errors.ownerType?.message}
      >
        <Controller
          control={control}
          name="ownerType"
          render={({ field }) => <Select {...field} options={[...OWNER_TYPE_OPTIONS]} />}
        />
      </Form.Item>
      <Form.Item
        label="归属文章"
        required
        validateStatus={errors.ownerId ? 'error' : ''}
        help={errors.ownerId?.message}
      >
        <Controller
          control={control}
          name="ownerId"
          render={({ field }) => (
            <Select
              {...field}
              value={field.value || undefined}
              placeholder="请选择归属文章"
              options={articles.map((article) => ({ label: article.title, value: article.id }))}
            />
          )}
        />
      </Form.Item>
      <Form.Item
        label="文件名"
        required
        validateStatus={errors.fileName ? 'error' : ''}
        help={errors.fileName?.message}
      >
        <Controller
          control={control}
          name="fileName"
          render={({ field }) => <Input {...field} />}
        />
      </Form.Item>
      <Form.Item
        label="文件路径"
        required
        validateStatus={errors.fileUrl ? 'error' : ''}
        help={errors.fileUrl?.message}
      >
        <Controller
          control={control}
          name="fileUrl"
          render={({ field }) => {
            return (
              <Space>
                <Input
                  style={{ flex: 1 }}
                  {...field}
                  placeholder="OSS objectKey 如 essay-mvp/.../file.pdf"
                />
                <OssUploadButton
                  subdir="downloads"
                  access="private"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  onSuccess={(result) => {
                    field.onChange(result.objectKey)
                    setValue('fileName', result.fileName, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                    setValue('fileType', result.fileType, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                    setValue('fileSize', result.fileSize, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }}
                />
              </Space>
            )
          }}
        />
      </Form.Item>
      <Form.Item
        label="文件类型"
        validateStatus={errors.fileType ? 'error' : ''}
        help={errors.fileType?.message}
      >
        <Controller
          control={control}
          name="fileType"
          render={({ field }) => <Input {...field} />}
        />
      </Form.Item>
      <Form.Item
        label="文件大小"
        validateStatus={errors.fileSize ? 'error' : ''}
        help={errors.fileSize?.message}
      >
        <Controller
          control={control}
          name="fileSize"
          render={({ field }) => <Input disabled {...field} />}
        />
      </Form.Item>
      <Form.Item
        label="访问类型"
        required
        validateStatus={errors.accessType ? 'error' : ''}
        help={errors.accessType?.message}
      >
        <Controller
          control={control}
          name="accessType"
          render={({ field }) => <Select {...field} options={[...ACCESS_TYPE_OPTIONS]} />}
        />
      </Form.Item>
      <Form.Item
        label="标签"
        validateStatus={errors.tags ? 'error' : ''}
        help={errors.tags?.message}
      >
        <Controller control={control} name="tags" render={({ field }) => <Input {...field} />} />
      </Form.Item>
      <Form.Item label="‘免费’软开关">
        <Controller
          control={control}
          name="tags"
          render={({ field }) => {
            const tags = field.value ?? ''
            const checked = tags.includes(FREE_TAG)
            function applyFreeTag(next: boolean) {
              // 排除免费标签，如果需要添加免费标签，则添加到前面
              const parts = tags
                .split(',')
                .map((t) => t.trim())
                .filter((t) => t && t !== FREE_TAG)
              if (next) parts.unshift(FREE_TAG)
              field.onChange(parts.join(','))
            }
            return (
              <Space>
                <Switch checked={checked} onChange={applyFreeTag} />
                <span>仅 `accessType=free` 且启用时，含「免费」才允许前台下载</span>
              </Space>
            )
          }}
        />
      </Form.Item>
      <Form.Item
        label="是否需要登陆"
        validateStatus={errors.needLogin ? 'error' : ''}
        help={errors.needLogin?.message}
      >
        <Controller
          control={control}
          name="needLogin"
          render={({ field }) => <Switch checked={field.value} onChange={field.onChange} />}
        />
      </Form.Item>
      <Form.Item
        label="排序"
        validateStatus={errors.sortOrder ? 'error' : ''}
        help={errors.sortOrder?.message}
      >
        <Controller
          control={control}
          name="sortOrder"
          render={({ field }) => <InputNumber min={0} max={9999} precision={0} {...field} />}
        />
      </Form.Item>
      <Form.Item
        label="状态"
        validateStatus={errors.status ? 'error' : ''}
        help={errors.status?.message}
      >
        <Controller
          control={control}
          name="status"
          render={({ field }) => <Radio.Group {...field} options={[...STATUS_OPTIONS]} />}
        />
      </Form.Item>
    </Form>
  )
}
