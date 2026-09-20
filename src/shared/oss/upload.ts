import OSS from 'ali-oss'
import { fetchUploadSts, isOssSts } from './api'
import type { OssAccess, OssSubdir, UploadObjectResult, UploadStsOss } from './type'

export async function uploadObject(
  file: File,
  options: { subdir: OssSubdir; access: OssAccess },
): Promise<UploadObjectResult> {
  const cred = await fetchUploadSts()
  if (!isOssSts(cred)) {
    throw new Error(cred.message)
  }

  const objectKey = `${cred.dir}${options.subdir}/${crypto.randomUUID()}${fileExt(file.name)}`
  const client = new OSS({
    region: cred.region,
    accessKeyId: cred.accessKeyId,
    accessKeySecret: cred.accessKeySecret,
    stsToken: cred.securityToken,
    bucket: cred.bucket,
    endpoint: cred.endpoint,
    secure: true,
    authorizationV4: true,
  })

  const headers: Record<string, string> = {
    'Content-Type': file.type || 'application/octet-stream',
  }
  if (options.access === 'public') {
    headers['x-oss-object-acl'] = 'public-read'
  }

  await client.put(objectKey, file, { headers })

  return {
    url: publicUrl(cred, objectKey),
    objectKey,
    fileName: file.name,
    fileType: fileExt(file.name).slice(1),
    fileSize: file.size,
  }
}

function fileExt(fileName: string): string {
  const i = fileName.lastIndexOf('.')
  if (i <= 0) return ''
  const ext = fileName.slice(i + 1).toLowerCase()
  if (!/^[a-z0-9]{1,8}$/.test(ext)) return ''
  return `.${ext}`
}

function publicUrl(cred: UploadStsOss, objectKey: string): string {
  const cdn = cred.cdnDomain?.trim()
  if (cdn) return `${cdn.replace(/\/+$/, '')}/${objectKey}`
  const endpoint = cred.endpoint.replace(/^https?:\/\//, '').replace(/\/+$/, '')
  return `https://${cred.bucket}.${endpoint}/${objectKey}`
}
