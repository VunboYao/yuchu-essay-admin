/** POST /upload/sts 成功（code===0）的两种 data；placeholder 不是 ApiError */
export type UploadStsOss = {
  mode: 'oss'
  accessKeyId: string
  accessKeySecret: string
  securityToken: string
  expiration: string
  bucket: string
  endpoint: string
  region: string
  /** 当天可写前缀，已含日期，如 essay-mvp/20260902/；objectKey 必须挂在后面 */
  dir: string
  cdnDomain?: string
}

export type UploadStsPlaceholder = {
  mode: 'placeholder'
  message: string
}

export type UploadSts = UploadStsOss | UploadStsPlaceholder

export type OssSubdir = 'covers' | 'body' | 'downloads' | 'icons'
export type OssAccess = 'public' | 'private'

/** 一次 put 两种口径都返回；调用方按 access 决定入库存 url 还是 objectKey */
export type UploadObjectResult = {
  url: string
  objectKey: string
  fileName: string
  fileType: string
  fileSize: number
}
