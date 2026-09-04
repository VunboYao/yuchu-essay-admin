import { Controller, type Control, type FieldErrors } from 'react-hook-form'
import { type OfficialAccountWriteInput } from '../schemas'
import { Form, Input, Radio } from 'antd'
import { STATUS_OPTIONS } from '@/shared/constants/options'

export function OfficialAccountForm({
  control,
  errors,
  isEditing,
}: {
  control: Control<OfficialAccountWriteInput>
  errors: FieldErrors<OfficialAccountWriteInput>
  isEditing: boolean
}) {
  return (
    <Form
      layout="horizontal"
      labelCol={{ span: 4 }}
      wrapperCol={{ span: 14 }}
      style={{ marginTop: 16 }}
    >
      <Form.Item
        label="场景标识"
        name="scene"
        required
        validateStatus={errors.scene ? 'error' : undefined}
        help={errors.scene?.message}
        extra="提示: 小程序我的页请求?scene=mine"
      >
        <Controller
          control={control}
          name="scene"
          render={({ field }) => (
            <Input disabled={isEditing} placeholder="请输入场景标识" {...field} />
          )}
        />
      </Form.Item>
      <Form.Item
        label="标题"
        name="title"
        validateStatus={errors.title ? 'error' : undefined}
        help={errors.title?.message}
      >
        <Controller
          control={control}
          name="title"
          render={({ field }) => <Input placeholder="请输入标题" {...field} />}
        />
      </Form.Item>
      <Form.Item
        label="描述"
        name="description"
        validateStatus={errors.description ? 'error' : undefined}
        help={errors.description?.message}
      >
        <Controller
          control={control}
          name="description"
          render={({ field }) => <Input.TextArea placeholder="请输入描述" rows={4} {...field} />}
        />
      </Form.Item>
      <Form.Item
        label="原始ID"
        name="username"
        required
        validateStatus={errors.username ? 'error' : undefined}
        help={errors.username?.message}
        extra="用于小程序跳转公众号主页，通常 gh_ 开头"
      >
        <Controller
          control={control}
          name="username"
          render={({ field }) => (
            <Input placeholder="gh_开头,用于小程序跳转公众号主页" {...field} />
          )}
        />
      </Form.Item>
      <Form.Item
        label="状态"
        name="status"
        validateStatus={errors.status ? 'error' : undefined}
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
