import { Controller, useWatch, type Control, type FieldErrors } from 'react-hook-form'
import type { HomeBlockWriteInput } from '../schemas'
import { Form, Input, InputNumber, Radio, Select, Image, Space, Alert } from 'antd'
import { NAV_TYPE_OPTIONS, STATUS_OPTIONS } from '@/shared/constants/options'
import { OssUploadButton } from '@/shared/oss'

export function HomeBlockForm({
  control,
  errors,
}: {
  control: Control<HomeBlockWriteInput>
  errors: FieldErrors<HomeBlockWriteInput>
}) {
  const navType = useWatch({ control, name: 'navType' })

  return (
    <Form
      layout="horizontal"
      labelCol={{ span: 4 }}
      wrapperCol={{ span: 14 }}
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
          render={({ field }) => <Input placeholder="入口标题,如:写作素材库" {...field} />}
        />
      </Form.Item>
      <Form.Item
        label="图标"
        required
        validateStatus={errors.icon ? 'error' : ''}
        help={errors.icon?.message}
      >
        <Controller
          control={control}
          name="icon"
          render={({ field }) => {
            return (
              <>
                <Input {...field} placeholder="OSS objectKey 或完整 URL" />
                <Space style={{ marginTop: 8 }}>
                  {field.value && <Image src={field.value} width={40} />}
                  <OssUploadButton
                    subdir="icons"
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
        label="跳转方式"
        required
        validateStatus={errors.navType ? 'error' : ''}
        help={errors.navType?.message}
      >
        <Controller
          control={control}
          name="navType"
          render={({ field }) => <Select {...field} options={[...NAV_TYPE_OPTIONS]} />}
        />
      </Form.Item>
      <Form.Item
        label="路径"
        required
        validateStatus={errors.path ? 'error' : ''}
        help={errors.path?.message}
      >
        <Controller
          control={control}
          name="path"
          render={({ field }) => (
            <Input
              placeholder={
                navType === 'switchTab' ? '/pages/home/index' : '/pages/material/index?id=123'
              }
              {...field}
            />
          )}
        />
      </Form.Item>
      {navType === 'switchTab' ? (
        <Alert
          style={{ marginBottom: 16 }}
          type="warning"
          title="switchTab 只能跳 tabBar 页，path 不要带 query"
          description={
            <>
              <div>/pages/home/index</div>
              <div>/pages/category/index</div>
              <div>/pages/mine/index</div>
            </>
          }
        />
      ) : null}
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
          render={({ field }) => <Radio.Group {...field} options={[...STATUS_OPTIONS]} />}
        />
      </Form.Item>
    </Form>
  )
}
