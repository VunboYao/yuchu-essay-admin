import { Controller, type Control, type FieldErrors } from 'react-hook-form'
import { type TagWriteInput, type TagWriteOutput } from '../schemas'
import { Form, Input, InputNumber, Radio } from 'antd'
import { STATUS_OPTIONS } from '@/shared/constants/options'

export function TagForm({
  control,
  errors,
}: {
  control: Control<TagWriteInput>
  errors: FieldErrors<TagWriteInput>
}) {
  return (
    <Form
      layout="horizontal"
      labelCol={{ span: 4 }}
      wrapperCol={{ span: 14 }}
      style={{ marginTop: 16 }}
    >
      <Form.Item
        label="标签名称"
        required
        validateStatus={errors.name ? 'error' : ''}
        help={errors.name?.message}
      >
        <Controller control={control} name="name" render={({ field }) => <Input {...field} />} />
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
    </Form>
  )
}
