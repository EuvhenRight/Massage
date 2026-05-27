'use client'

import { useEffect, useRef } from 'react'

const FOCUSABLE =
	'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * Accessible modal focus management for a dialog/popover.
 *
 * While `active`, focus moves into the container, Tab is trapped to cycle within
 * it, Escape calls `onEscape`, and the previously focused element is restored on
 * close. Attach the returned ref to the dialog element (give it `tabIndex={-1}`
 * so it can receive focus when it has no focusable children).
 *
 * `onEscape` is read through a ref, so callers need not memoize it — the trap
 * only re-runs when `active` changes.
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
	active: boolean,
	onEscape: () => void,
) {
	const ref = useRef<T>(null)
	const onEscapeRef = useRef(onEscape)
	onEscapeRef.current = onEscape

	useEffect(() => {
		if (!active) return
		const node = ref.current
		if (!node) return

		const previouslyFocused = document.activeElement as HTMLElement | null

		const focusable = () =>
			Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
				el => el.getClientRects().length > 0,
			)

		// Move focus inside on open.
		const initial = focusable()[0] ?? node
		initial.focus()

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault()
				onEscapeRef.current()
				return
			}
			if (e.key !== 'Tab') return
			const items = focusable()
			if (items.length === 0) {
				e.preventDefault()
				return
			}
			const first = items[0]!
			const last = items[items.length - 1]!
			const activeEl = document.activeElement
			if (e.shiftKey && (activeEl === first || activeEl === node)) {
				e.preventDefault()
				last.focus()
			} else if (!e.shiftKey && activeEl === last) {
				e.preventDefault()
				first.focus()
			}
		}

		document.addEventListener('keydown', onKeyDown, true)
		return () => {
			document.removeEventListener('keydown', onKeyDown, true)
			previouslyFocused?.focus?.()
		}
	}, [active])

	return ref
}
