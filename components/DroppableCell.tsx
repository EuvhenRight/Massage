'use client'

import { useDroppable } from '@dnd-kit/core'
import { clsx } from 'clsx'

/**
 * Cell ID format: "YYYYMMDD-HHmm" (e.g. "20250222-0900")
 * Used to calculate the new timestamp on drag end.
 */
export function cellIdToTimestamp(cellId: string): Date {
	const [datePart, timePart] = cellId.split('-')
	if (!datePart || datePart.length < 8 || !timePart || timePart.length < 4)
		throw new Error('Invalid cell ID')
	const year = datePart.slice(0, 4)
	const month = datePart.slice(4, 6)
	const day = datePart.slice(6, 8)
	const hour = timePart.slice(0, 2)
	const minute = timePart.slice(2, 4)
	return new Date(`${year}-${month}-${day}T${hour}:${minute}:00`)
}

export function makeCellId(date: Date, hour: number, minute: number): string {
	const y = date.getFullYear()
	const m = String(date.getMonth() + 1).padStart(2, '0')
	const d = String(date.getDate()).padStart(2, '0')
	const h = String(hour).padStart(2, '0')
	const min = String(minute).padStart(2, '0')
	return `${y}${m}${d}-${h}${min}`
}

interface DroppableCellProps {
	id: string
	isOver?: boolean
	canDrop?: boolean
	isPast?: boolean
	/** Use smaller min-height for 30-min sub-cells in hourly layout */
	compact?: boolean
	className?: string
	children?: React.ReactNode
}

export default function DroppableCell({
	id,
	isOver = false,
	canDrop = true,
	isPast = false,
	compact = false,
	className,
	children,
}: DroppableCellProps) {
	const { setNodeRef, isOver: isOverCurrent } = useDroppable({
		id,
		data: { type: 'cell', cellId: id },
	})

	const showOver = isOver || isOverCurrent

	return (
		<div
			ref={setNodeRef}
			data-cell-id={id}
			className={clsx(
				'border-b border-r border-white/5 p-0.5 transition-colors',
				compact ? 'min-h-[12px] flex-1' : 'min-h-[30px]',
				isPast && 'bg-white/5',
				showOver &&
					(canDrop
						? 'bg-gold-soft/20 ring-1 ring-gold-soft/50'
						: 'bg-red-500/10 ring-1 ring-red-400/60'),
				className,
			)}
		>
			{children}
		</div>
	)
}
