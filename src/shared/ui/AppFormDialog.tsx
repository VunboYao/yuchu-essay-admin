import { Modal } from 'antd'

type AppFormDialogProps = {
  open: boolean
  onClose: () => void
  title: string
  confirmLoading?: boolean
  okText?: string
  width?: number
  cancelText?: string
  children: React.ReactNode
  onSubmit: () => void | Promise<void>
}

export default function AppFormDialog({
  open,
  onClose,
  title,
  confirmLoading,
  okText = '确定',
  cancelText = '取消',
  width,
  children,
  onSubmit,
}: AppFormDialogProps) {
  return (
    <Modal
      open={open}
      onCancel={() => {
        if (confirmLoading) return
        onClose()
      }}
      closable={!confirmLoading}
      title={title}
      keyboard={false}
      mask={{ closable: false }}
      confirmLoading={confirmLoading}
      destroyOnHidden
      width={width}
      okText={okText}
      cancelText={cancelText}
      onOk={onSubmit}
      cancelButtonProps={{ disabled: confirmLoading }}
    >
      {children}
    </Modal>
  )
}
