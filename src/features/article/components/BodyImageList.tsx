import {
  DndContext,
  type DragEndEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  useSortable,
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type BodyImageListProp = {
  value: { id: string; url: string }[]
  onChange: (next: { id: string; url: string }[]) => void
  children: React.ReactNode
  disabled?: boolean
}

export function BodyImageList({ value, onChange, children, disabled }: BodyImageListProp) {
  const sersors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  return (
    <DndContext onDragEnd={handleDragEnd} sensors={sersors} collisionDetection={closestCenter}>
      <SortableContext items={value} strategy={verticalListSortingStrategy}>
        {value.map((row) => (
          <SortableItem key={row.id} id={row.id}>
            {children}
          </SortableItem>
        ))}
      </SortableContext>
    </DndContext>
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = value.findIndex((item) => item.id === active.id)
    const newIndex = value.findIndex((item) => item.id === over.id)
    onChange(arrayMove(value, oldIndex, newIndex))
  }
}

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transition, transform } = useSortable({ id })
  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <button type="button" {...listeners}>
        ≡
      </button>
      {children}
    </div>
  )
}
