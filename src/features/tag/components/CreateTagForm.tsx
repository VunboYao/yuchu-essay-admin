import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { createTag, type TagWriteInput } from '../api'
import { tagKeys } from '../queries'

const schema = z.object({
  name: z.string().trim().min(1, { message: 'Please enter a tag name' }).max(80),
  sortOrder: z.number().int(),
  status: z.union([z.literal(0), z.literal(1)]),
})

export function CreateTagForm() {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TagWriteInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      sortOrder: 0,
      status: 1,
    },
  })

  const createMutation = useMutation({
    mutationFn: createTag,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tagKeys.lists() })
      reset()
    },
  })

  return (
    <form onSubmit={handleSubmit((input) => createMutation.mutate(input))}>
      <label>
        Tag Name <input {...register('name')}></input>
      </label>
      {errors.name && <p role="alert">{errors.name.message}</p>}

      <label>
        排序权重
        <input type="number" {...register('sortOrder', { valueAsNumber: true })} />
      </label>

      <label>
        状态
        <select {...register('status', { valueAsNumber: true })}>
          <option value="1">启用</option>
          <option value="0">禁用</option>
        </select>
      </label>

      <button type="submit" disabled={createMutation.isPending}>
        {createMutation.isPending ? '创建中...' : '创建标签'}
      </button>

      {createMutation.isError && <p role="alert">{createMutation.error.message}</p>}
    </form>
  )
}
