import { post, get, del } from '@/shared/api'
import type { OfficialAccountConfig } from '@/shared/types'
import type { OfficialAccountWriteOutput } from './schemas'

export function listOfficialAccounts(signal?: AbortSignal) {
  return get<OfficialAccountConfig[]>('/official-account-configs', { signal })
}

export function upsertOfficialAccount(
  data: OfficialAccountWriteOutput,
): Promise<OfficialAccountConfig> {
  return post<OfficialAccountConfig>('/official-account-configs', data)
}

export function deleteOfficialAccount(id: number): Promise<{ id: number }> {
  return del<{ id: number }>(`/official-account-configs/${id}`)
}
