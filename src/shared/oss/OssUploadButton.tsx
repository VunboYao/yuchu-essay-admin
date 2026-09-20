import { App, Button, Input } from 'antd'
import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { fetchUploadSts, isOssSts } from './api'
import { uploadObject } from './upload'
import type { OssAccess, OssSubdir, UploadObjectResult } from './type'
import styles from './OssUploadButton.module.css'

type OssUploadButtonProps = {
  accept?: string
  subdir: OssSubdir
  access: OssAccess
  onSuccess: (result: UploadObjectResult) => void
  onError?: (error: unknown) => void
  children?: ReactNode
}

export function OssUploadButton({
  accept,
  subdir,
  access,
  onSuccess,
  onError,
  children,
}: OssUploadButtonProps) {
  const { message } = App.useApp()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [fallbackOpen, setFallbackOpen] = useState(false)
  const [draft, setDraft] = useState('')

  function fail(error: unknown) {
    message.error(error instanceof Error ? error.message : '上传失败')
    onError?.(error)
  }

  async function onButtonClick() {
    if (uploading) return
    const input = inputRef.current
    if (input === null) return

    setUploading(true)
    try {
      const sts = await fetchUploadSts()
      if (!isOssSts(sts)) {
        setFallbackOpen(true)
        return
      }
      setFallbackOpen(false)
      input.click()
    } catch (error) {
      fail(error)
    } finally {
      setUploading(false)
    }
  }

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    input.value = ''
    if (!file || uploading) return

    setUploading(true)
    try {
      const result = await uploadObject(file, { subdir, access })
      onSuccess(result)
    } catch (error) {
      fail(error)
    } finally {
      setUploading(false)
    }
  }

  function confirmFallback() {
    const url = draft.trim()
    if (!url || uploading) return
    onSuccess({ url, objectKey: url, fileName: url, fileType: '', fileSize: 0 })
    setDraft('')
    setFallbackOpen(false)
  }

  return (
    <div className={styles.root}>
      <input
        ref={inputRef}
        className={styles.file}
        type="file"
        style={{ display: 'none' }}
        accept={accept}
        onChange={onFileChange}
      />
      <Button loading={uploading} disabled={uploading} onClick={() => void onButtonClick()}>
        {children ?? '上传'}
      </Button>
      {fallbackOpen ? (
        <>
          <Input
            className={styles.urlInput}
            value={draft}
            placeholder="当前无法直传，请粘贴 URL"
            disabled={uploading}
            onChange={(event) => setDraft(event.target.value)}
            onPressEnter={confirmFallback}
          />
          <Button disabled={uploading || draft.trim() === ''} onClick={confirmFallback}>
            确认
          </Button>
        </>
      ) : null}
    </div>
  )
}
