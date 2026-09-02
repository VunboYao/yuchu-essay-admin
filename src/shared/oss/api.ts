import { post } from '@/shared/api'
import type { UploadSts, UploadStsOss } from './type'

export type { UploadSts, UploadStsOss, UploadStsPlaceholder } from './type'

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

/** mode=oss 且直传必填字段齐全才允许 put；缺字段当不可上传，不当 placeholder */
export function isOssSts(data: UploadSts): data is UploadStsOss {
  if (data.mode !== 'oss') return false
  return (
    hasText(data.accessKeyId) &&
    hasText(data.accessKeySecret) &&
    hasText(data.securityToken) &&
    hasText(data.bucket) &&
    hasText(data.endpoint) &&
    hasText(data.region) &&
    hasText(data.dir)
  )
}

export function fetchUploadSts(): Promise<UploadSts> {
  return post<UploadSts>('/upload/sts')
}
