import { Controller, type Control, type FieldErrors } from 'react-hook-form'
import type { TaxonomyUnitWriteInput } from '../schemas'
import { Form, Input, InputNumber, Radio, Select } from 'antd'
import {
  GRADE_OPTIONS,
  STATUS_OPTIONS,
  SEMESTER_OPTIONS,
  UNIT_OPTIONS,
} from '@/shared/constants/options'

export function TaxonomyForm({
  control,
  errors,
}: {
  control: Control<TaxonomyUnitWriteInput>
  errors: FieldErrors<TaxonomyUnitWriteInput>
}) {
  return (
    <Form
      layout="horizontal"
      labelCol={{ span: 4 }}
      wrapperCol={{ span: 14 }}
      style={{ marginTop: 16 }}
    >
      <Form.Item
        label="教材版本"
        validateStatus={errors.textbookVersion ? 'error' : ''}
        help={errors.textbookVersion?.message}
      >
        <Controller
          control={control}
          name="textbookVersion"
          render={({ field }) => <Input {...field} />}
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
          render={({ field }) => <Select {...field} options={[...GRADE_OPTIONS]} />}
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
          render={({ field }) => <Select {...field} options={[...SEMESTER_OPTIONS]} />}
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
          render={({ field }) => <Select {...field} options={[...UNIT_OPTIONS]} />}
        />
      </Form.Item>
      <Form.Item
        label="单元标题"
        validateStatus={errors.unitTitle ? 'error' : ''}
        help={errors.unitTitle?.message}
      >
        <Controller
          control={control}
          name="unitTitle"
          render={({ field }) => <Input {...field} />}
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
          render={({ field }) => <InputNumber precision={0} min={0} max={9999} {...field} />}
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
