import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { WidgetData } from '../types'
import { Trash, Pencil } from 'lucide-react'

interface WidgetTileProps {
    widget: WidgetData
    isEditMode: boolean
    onDelete: (id: string) => void
    children: React.ReactNode
    className?: string
    onContextMenu?: (e: React.MouseEvent) => void
}

export function WidgetTile({ widget, isEditMode, onDelete, children, className, onContextMenu }: WidgetTileProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: widget.id,
        disabled: !isEditMode
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 'auto',
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`relative group ${className || ''} ${isEditMode ? 'cursor-grab active:cursor-grabbing animate-pulse hover:ring-2 ring-neon-cyan/50' : ''}`}
            onContextMenu={onContextMenu}
        >
            {children}
            {isEditMode && (
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onDelete(widget.id)
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="absolute -top-2 -right-2 z-20 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition shadow-lg shrink-0 flex items-center justify-center"
                >
                    <Trash className="w-4 h-4" />
                </button>
            )}
        </div>
    )
}
