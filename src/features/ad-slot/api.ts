import { get, post, del } from '@/shared/api'
import type { AdSlot } from '@/shared/types'
import type { AdSlotWriteOutput } from './schemas'

export function listAdSlots(signal?: AbortSignal): Promise<AdSlot[]> {
  return get<AdSlot[]>('/ad-slots', { signal })
}
export function upsertAdSlot(data: AdSlotWriteOutput): Promise<AdSlot> {
  return post<AdSlot>('/ad-slots', data)
}
export function deleteAdSlot(id: number): Promise<{ id: number }> {
  return del<{ id: number }>(`/ad-slots/${id}`)
}
