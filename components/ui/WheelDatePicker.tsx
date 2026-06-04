'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'

const ITEM_HEIGHT = 44
const VISIBLE_ITEMS = 5
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS

interface WheelProps<T> {
	items: T[]
	selectedIndex: number
	onSelect: (index: number) => void
	renderItem: (item: T) => string
	ariaLabel: string
}

function Wheel<T>({
	items,
	selectedIndex,
	onSelect,
	renderItem,
	ariaLabel,
}: WheelProps<T>) {
	const ref = useRef<HTMLDivElement>(null)
	const scrollEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
	const programmaticScrollUntilRef = useRef<number>(0)

	const snapTo = useCallback((index: number, behavior: ScrollBehavior) => {
		const el = ref.current
		if (!el) return
		programmaticScrollUntilRef.current = Date.now() + 500
		el.scrollTo({ top: index * ITEM_HEIGHT, behavior })
	}, [])

	useLayoutEffect(() => {
		snapTo(selectedIndex, 'auto')
	}, [selectedIndex, snapTo])

	const handleScroll = useCallback(() => {
		if (Date.now() < programmaticScrollUntilRef.current) return
		if (scrollEndTimer.current) clearTimeout(scrollEndTimer.current)
		scrollEndTimer.current = setTimeout(() => {
			const el = ref.current
			if (!el) return
			const index = Math.round(el.scrollTop / ITEM_HEIGHT)
			const clamped = Math.max(0, Math.min(items.length - 1, index))
			if (clamped !== selectedIndex) onSelect(clamped)
			else snapTo(clamped, 'smooth')
		}, 110)
	}, [items.length, onSelect, selectedIndex, snapTo])

	useEffect(
		() => () => {
			if (scrollEndTimer.current) clearTimeout(scrollEndTimer.current)
		},
		[],
	)

	return (
		<div className='relative flex-1 min-w-0'>
			<div
				aria-hidden
				className='pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 border-y border-icyWhite/15'
				style={{ height: ITEM_HEIGHT }}
			/>
			<div
				ref={ref}
				role='listbox'
				aria-label={ariaLabel}
				tabIndex={0}
				onScroll={handleScroll}
				className='overflow-y-scroll snap-y snap-mandatory scrollbar-hide touch-pan-y outline-none'
				style={{
					height: CONTAINER_HEIGHT,
					paddingTop: (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2,
					paddingBottom: (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2,
					WebkitOverflowScrolling: 'touch',
				}}
			>
				{items.map((item, i) => {
					const distance = Math.abs(i - selectedIndex)
					const opacity = distance === 0 ? 1 : distance === 1 ? 0.5 : 0.25
					return (
						<button
							key={i}
							type='button'
							onClick={() => {
								if (i !== selectedIndex) onSelect(i)
								else snapTo(i, 'smooth')
							}}
							aria-selected={i === selectedIndex}
							role='option'
							className='block w-full snap-center text-icyWhite text-base font-medium tabular-nums'
							style={{ height: ITEM_HEIGHT, opacity }}
						>
							{renderItem(item)}
						</button>
					)
				})}
			</div>
		</div>
	)
}

interface WheelDatePickerProps {
	open: boolean
	value: string
	onChange: (value: string) => void
	onClose: () => void
	minYear?: number
	maxYear?: number
	locale?: string
	title: string
	cancelLabel: string
	confirmLabel: string
	clearLabel?: string
}

export function WheelDatePicker({
	open,
	value,
	onChange,
	onClose,
	minYear = 1900,
	maxYear = new Date().getFullYear(),
	locale = 'en',
	title,
	cancelLabel,
	confirmLabel,
	clearLabel,
}: WheelDatePickerProps) {
	const initial = useMemo(() => {
		const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
		if (m) {
			return {
				year: Number(m[1]),
				month: Number(m[2]),
				day: Number(m[3]),
			}
		}
		const fallbackYear = Math.max(minYear, Math.min(maxYear, maxYear - 25))
		return { year: fallbackYear, month: 1, day: 1 }
	}, [value, minYear, maxYear])

	const [year, setYear] = useState(initial.year)
	const [month, setMonth] = useState(initial.month)
	const [day, setDay] = useState(initial.day)

	useEffect(() => {
		if (!open) return
		setYear(initial.year)
		setMonth(initial.month)
		setDay(initial.day)
	}, [open, initial])

	const monthNames = useMemo(() => {
		const fmt = new Intl.DateTimeFormat(locale, { month: 'short' })
		const out: string[] = []
		for (let m = 0; m < 12; m++) out.push(fmt.format(new Date(2000, m, 15)))
		return out
	}, [locale])

	const years = useMemo(() => {
		const out: number[] = []
		for (let y = maxYear; y >= minYear; y--) out.push(y)
		return out
	}, [minYear, maxYear])

	const daysInMonth = useMemo(
		() => new Date(year, month, 0).getDate(),
		[year, month],
	)

	const days = useMemo(() => {
		const out: number[] = []
		for (let d = 1; d <= daysInMonth; d++) out.push(d)
		return out
	}, [daysInMonth])

	useEffect(() => {
		if (day > daysInMonth) setDay(daysInMonth)
	}, [day, daysInMonth])

	useEffect(() => {
		if (!open) return
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose()
		}
		document.addEventListener('keydown', onKey)
		return () => document.removeEventListener('keydown', onKey)
	}, [open, onClose])

	const handleConfirm = () => {
		const pad = (n: number) => String(n).padStart(2, '0')
		onChange(`${year}-${pad(month)}-${pad(day)}`)
		onClose()
	}

	const handleClear = () => {
		onChange('')
		onClose()
	}

	const dayIndex = day - 1
	const monthIndex = month - 1
	const yearIndex = Math.max(0, years.indexOf(year))

	return (
		<AnimatePresence>
			{open && (
				<>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.15 }}
						className='fixed inset-0 z-[60] bg-nearBlack/80 backdrop-blur-sm'
						onClick={onClose}
					/>
					{/* Wrapper holds the static centred position. The animated child
					     handles opacity + scale only — using framer-motion's `y` here
					     would overwrite the centering `translate(-50%, -50%)`. */}
					<div className='pointer-events-none fixed inset-0 z-[61] flex items-center justify-center p-4'>
						<motion.div
							role='dialog'
							aria-modal='true'
							aria-label={title}
							initial={{ opacity: 0, scale: 0.96 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.96 }}
							transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
							className='pointer-events-auto w-full max-w-md rounded-2xl border border-white/10 bg-nearBlack pb-[env(safe-area-inset-bottom,0)] shadow-2xl'
						>
						<div className='flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4'>
							<p className='text-sm font-medium text-icyWhite'>{title}</p>
						</div>
						<div className='flex gap-2 px-3 py-4 sm:gap-3 sm:px-5'>
							<Wheel
								items={days}
								selectedIndex={dayIndex}
								onSelect={i => setDay(days[i])}
								renderItem={d => String(d).padStart(2, '0')}
								ariaLabel={title}
							/>
							<Wheel
								items={monthNames}
								selectedIndex={monthIndex}
								onSelect={i => setMonth(i + 1)}
								renderItem={name => name}
								ariaLabel={title}
							/>
							<Wheel
								items={years}
								selectedIndex={yearIndex}
								onSelect={i => setYear(years[i])}
								renderItem={y => String(y)}
								ariaLabel={title}
							/>
						</div>
						<div className='flex items-center justify-between gap-3 border-t border-white/10 px-5 py-3'>
							<button
								type='button'
								onClick={onClose}
								className='min-h-[44px] px-3 text-sm font-medium text-icyWhite/70 transition-colors hover:text-icyWhite'
							>
								{cancelLabel}
							</button>
							{clearLabel && value && (
								<button
									type='button'
									onClick={handleClear}
									className='min-h-[44px] px-3 text-sm font-medium text-red-400 transition-colors hover:text-red-300'
								>
									{clearLabel}
								</button>
							)}
							<button
								type='button'
								onClick={handleConfirm}
								className='min-h-[44px] rounded-xl bg-gold-soft px-5 text-sm font-semibold text-nearBlack transition-colors hover:bg-gold-soft/90'
							>
								{confirmLabel}
							</button>
						</div>
						</motion.div>
					</div>
				</>
			)}
		</AnimatePresence>
	)
}
