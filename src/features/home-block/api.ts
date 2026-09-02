import { get, post, put, del } from '@/shared/api'
import type { HomeBlockWriteOutput } from './schemas'
import type { HomeBlock } from '@/shared/types'

export function listHomeBlocks({ signal }: { signal?: AbortSignal }): Promise<HomeBlock[]> {
  return get<HomeBlock[]>('/home-blocks', { signal })
}

export function createHomeBlock(data: HomeBlockWriteOutput): Promise<HomeBlock> {
  return post<HomeBlock>('/home-blocks', data)
}

export function updateHomeBlock({
  id,
  input,
}: {
  id: number
  input: HomeBlockWriteOutput
}): Promise<HomeBlock> {
  return put<HomeBlock>(`/home-blocks/${id}`, input)
}

export function deleteHomeBlock(id: number): Promise<{ id: number }> {
  return del<{ id: number }>(`/home-blocks/${id}`)
}
