import type { LoginResult } from '@/shared/types'
import type { LoginSchemaOutput } from './schemas'
import { post } from '@/shared/api'

export const login = (data: LoginSchemaOutput): Promise<LoginResult> => {
  return post<LoginResult>('/auth/login', data)
}
