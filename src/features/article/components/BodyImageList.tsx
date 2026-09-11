import {
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
  DndContext,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button, Input } from 'antd'
import type { ReactNode } from 'react'
import { OssUploadButton } from '@/shared/oss'
import styles from './BodyImageList.module.css'

const MAX_BODY_IMAGES = 20

export type BodyImageRow = {
  id: string
  url: string
}

type BodyImageListProps = {
  value: BodyImageRow[]
  onChange: (next: BodyImageRow[]) => void
  disabled?: boolean
}

export function BodyImageList({ value, onChange, disabled }: BodyImageListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const atLimit = value.length >= MAX_BODY_IMAGES

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = value.findIndex((item) => item.id === active.id)
    const newIndex = value.findIndex((item) => item.id === over.id)
    onChange(arrayMove(value, oldIndex, newIndex))
  }

  function updateUrl(id: string, url: string) {
    onChange(value.map((row) => (row.id === id ? { ...row, url } : row)))
  }

  function removeRow(id: string) {
    onChange(value.filter((row) => row.id !== id))
  }

  function addRow() {
    if (atLimit) return
    onChange([...value, { id: crypto.randomUUID(), url: '' }])
  }

  return (
    <div className={styles.root}>
      <p className={styles.hint}>
        {atLimit
          ? `已达 ${MAX_BODY_IMAGES} 张上限`
          : `按阅读顺序填写，可拖拽排序；最多 ${MAX_BODY_IMAGES} 张`}
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={value.map((row) => row.id)} strategy={verticalListSortingStrategy}>
          {value.map((row, index) => (
            <SortableItem key={row.id} id={row.id} disabled={disabled}>
              <span className={styles.order}>{index + 1}</span>
              <Input
                className={styles.url}
                value={row.url}
                placeholder="https://cdn.example.com/body.jpg"
                disabled={disabled}
                onChange={(event) => updateUrl(row.id, event.target.value)}
              />
              {disabled ? null : (
                <OssUploadButton
                  subdir="body"
                  access="public"
                  accept="image/*"
                  onSuccess={(result) => updateUrl(row.id, result.url)}
                />
              )}
              {row.url.trim() ? <img className={styles.preview} src={row.url} alt="" /> : null}
              <Button
                type="link"
                danger
                htmlType="button"
                disabled={disabled}
                onClick={() => removeRow(row.id)}
              >
                删除
              </Button>
            </SortableItem>
          ))}
        </SortableContext>
      </DndContext>
      {atLimit || disabled ? null : (
        <Button className={styles.add} htmlType="button" onClick={addRow}>
          添加
        </Button>
      )}
    </div>
  )
}

function SortableItem({
  id,
  disabled,
  children,
}: {
  id: string
  disabled?: boolean
  children: ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id,
    disabled,
  })

  return (
    <div
      ref={setNodeRef}
      className={styles.row}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        type="button"
        className={styles.handle}
        aria-label="拖拽排序"
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        ≡
      </button>
      {children}
    </div>
  )
}
