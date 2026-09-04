import { Controller, type FieldErrors, type Control } from 'react-hook-form'
import type { AdSlotWriteInput } from '../schemas'
import { Button, Form, Input, InputNumber, Radio, Select } from 'antd'
import { AD_PAGE_OPTIONS, AD_TYPE_OPTIONS, STATUS_OPTIONS } from '@/shared/constants/options'

export function AdSlotForm({
  control,
  errors,
  isEditing,
  onFillIdentity,
}: {
  control: Control<AdSlotWriteInput>
  errors: FieldErrors<AdSlotWriteInput>
  isEditing: boolean
  onFillIdentity: () => void
}) {
  return (
    <Form
      layout="horizontal"
      labelCol={{ span: 4 }}
      wrapperCol={{ span: 14 }}
      style={{ marginTop: 16 }}
    >
      {!isEditing ? (
        <Form.Item label=" " colon={false}>
          <Button type="dashed" onClick={onFillIdentity}>
            填入下载激励视频身份
          </Button>
        </Form.Item>
      ) : null}
      <Form.Item
        label="广告位Key"
        required
        validateStatus={errors.slotKey ? 'error' : ''}
        help={errors.slotKey?.message}
      >
        <Controller
          control={control}
          name="slotKey"
          render={({ field }) => (
            <Input disabled={isEditing} placeholder="请输入广告位Key" {...field} />
          )}
        />
      </Form.Item>
      <Form.Item
        label="名称"
        required
        validateStatus={errors.slotName ? 'error' : ''}
        help={errors.slotName?.message}
      >
        <Controller
          control={control}
          name="slotName"
          render={({ field }) => <Input placeholder="请输入广告位名称" {...field} />}
        />
      </Form.Item>
      <Form.Item
        label="所属页面"
        required
        validateStatus={errors.page ? 'error' : ''}
        help={errors.page?.message}
      >
        <Controller
          control={control}
          name="page"
          render={({ field }) => (
            <Select placeholder="请选择所属页面" {...field} options={[...AD_PAGE_OPTIONS]} />
          )}
        />
      </Form.Item>
      <Form.Item label="页面内位置">
        <Controller
          control={control}
          name="position"
          render={({ field }) => (
            <Input placeholder="请输入页面内位置" {...field} value={field.value ?? ''} />
          )}
        />
      </Form.Item>
      <Form.Item
        label="广告类型"
        required
        validateStatus={errors.adType ? 'error' : ''}
        help={errors.adType?.message}
      >
        <Controller
          control={control}
          name="adType"
          render={({ field }) => (
            <Select placeholder="请选择广告类型" {...field} options={[...AD_TYPE_OPTIONS]} />
          )}
        />
      </Form.Item>
      <Form.Item
        label="广告位单元ID"
        validateStatus={errors.adUnitId ? 'error' : ''}
        help={errors.adUnitId?.message}
      >
        <Controller
          control={control}
          name="adUnitId"
          render={({ field }) => (
            <Input placeholder="请输入广告位单元ID" {...field} value={field.value ?? ''} />
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
          render={({ field }) => (
            <InputNumber min={0} max={9999} precision={0} placeholder="请输入排序" {...field} />
          )}
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
