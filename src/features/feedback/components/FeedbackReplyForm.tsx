import { Controller, type FieldErrors, type Control } from 'react-hook-form'
import { type FeedbackWriteInput } from '../schemas'
import { Form, Input } from 'antd'

export function FeedbackReplyForm({
  control,
  errors,
}: {
  control: Control<FeedbackWriteInput>
  errors: FieldErrors<FeedbackWriteInput>
}) {
  return (
    <Form
      layout="horizontal"
      labelCol={{ span: 4 }}
      wrapperCol={{ span: 14 }}
      style={{ marginTop: 16 }}
    >
      <Form.Item
        label="回复内容"
        required
        validateStatus={errors.reply ? 'error' : ''}
        help={errors.reply?.message}
      >
        <Controller
          control={control}
          name="reply"
          render={({ field }) => <Input.TextArea maxLength={1000} {...field} />}
        />
      </Form.Item>
    </Form>
  )
}
