/**
 * Regression tests for clearing a finished booking.
 *
 * The customer reported seeing last time's services when opening the booking
 * form again. `clearDraft()` did remove the localStorage entry, but the React
 * state still held the completed booking — so the form rendered the old cart,
 * and the auto-save effect wrote it straight back to storage on the next state
 * change. Storage and state must be cleared together, which is what
 * `resetAfterBooking` does.
 */

import { act, render, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import {
	BookingFlowProvider,
	useBookingFlow,
} from '@/components/booking-flow/BookingFlowContext'

const PLACE = 'massage'
const KEY = `booking-draft-${PLACE}`

let api: ReturnType<typeof useBookingFlow>
let view: ReturnType<typeof within>

function Probe() {
	api = useBookingFlow()
	return (
		<div>
			<span data-testid='titles'>
				{api.items.map((i) => i.title).join(',')}
			</span>
			<span data-testid='name'>{api.fullName}</span>
			<span data-testid='step'>{String(api.step)}</span>
		</div>
	)
}

function renderFlow() {
	return render(
		<BookingFlowProvider place={PLACE} services={[]}>
			<Probe />
		</BookingFlowProvider>
	)
}

function mount() {
	const r = renderFlow()
	view = within(r.container)
	return r
}

/** Put the flow into the state a customer reaches just before submitting. */
function fillBooking() {
	act(() => {
		api.setService('Relaxačná › 1 hodina')
		api.setCustomerInfo({
			fullName: 'Anna Nováková',
			email: 'anna@example.com',
			phone: '+421900000000',
		})
		api.setStep(3)
	})
}

describe('resetAfterBooking', () => {
	beforeEach(() => {
		localStorage.clear()
	})

	it('empties the cart the customer just booked', () => {
		mount()
		fillBooking()
		expect(view.getByTestId('titles').textContent).not.toBe('')

		act(() => api.resetAfterBooking())

		expect(view.getByTestId('titles').textContent).toBe('')
		expect(view.getByTestId('name').textContent).toBe('')
		expect(view.getByTestId('step').textContent).toBe('1')
	})

	it('removes the persisted draft', () => {
		mount()
		fillBooking()
		expect(localStorage.getItem(KEY)).not.toBeNull()

		act(() => api.resetAfterBooking())

		expect(localStorage.getItem(KEY)).toBeNull()
	})

	it('does not write the finished booking back on the next state change', () => {
		mount()
		fillBooking()
		act(() => api.resetAfterBooking())

		// Any later interaction re-runs the auto-save effect. Before the fix it
		// persisted the stale in-memory cart, resurrecting the old services.
		act(() => api.setStep(2))

		const raw = localStorage.getItem(KEY)
		if (raw) {
			expect(JSON.stringify(JSON.parse(raw))).not.toContain('Relaxačná')
			expect(JSON.stringify(JSON.parse(raw))).not.toContain('Anna Nováková')
		}
	})

	it('leaves nothing for a fresh mount to restore', () => {
		const first = renderFlow()
		fillBooking()
		act(() => api.resetAfterBooking())
		first.unmount()

		// Scoped to this render — an earlier container may still be in the document.
		const remount = within(renderFlow().container)

		expect(remount.getByTestId('titles').textContent).toBe('')
		expect(remount.getByTestId('name').textContent).toBe('')
	})
})
