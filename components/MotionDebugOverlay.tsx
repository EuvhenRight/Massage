'use client'

import { useSiteMotion } from '@/lib/site-motion'
import { useEffect, useState } from 'react'

/**
 * Floating debug overlay that shows the actual motion-gating state on
 * the device — invaluable when «animation doesn't work on mobile» but you
 * can't see why.
 *
 * Включается тремя путями:
 *   - `?debugMotion=1` в URL (просто и работает с iPhone)
 *   - `localStorage.debugMotion = '1'`
 *   - `NEXT_PUBLIC_DEBUG_MOTION=1` build-time
 *
 * Самая частая причина «нет анимации» на iOS:
 *   - prefersReducedMotion = true → значит ИЛИ включён Settings → Accessibility →
 *     Motion → Reduce Motion, ИЛИ включён Low Power Mode (он автоматически
 *     включает reduce-motion). Выключи Low Power Mode → анимация вернётся.
 */
export default function MotionDebugOverlay() {
	const [enabled, setEnabled] = useState(false)
	const motion = useSiteMotion()

	useEffect(() => {
		const url = new URLSearchParams(window.location.search)
		const fromUrl = url.get('debugMotion') === '1'
		const fromLs = window.localStorage.getItem('debugMotion') === '1'
		const fromEnv = process.env.NEXT_PUBLIC_DEBUG_MOTION === '1'
		setEnabled(fromUrl || fromLs || fromEnv)
	}, [])

	if (!enabled) return null

	const reduced = motion.prefersReducedMotion
	const css = motion.minimal ? 'rgb(248,113,113)' : 'rgb(74,222,128)'

	return (
		<div
			style={{
				position: 'fixed',
				top: 'max(0.75rem, env(safe-area-inset-top))',
				right: '0.75rem',
				zIndex: 2147483647,
				padding: '8px 10px',
				borderRadius: 8,
				background: 'rgba(10,10,10,0.92)',
				border: `1px solid ${css}`,
				color: '#fff',
				font: '500 10px/1.35 system-ui, sans-serif',
				maxWidth: 220,
				boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
				pointerEvents: 'none',
			}}
			aria-hidden
		>
			<div style={{ color: css, fontWeight: 700, marginBottom: 4 }}>
				motion: {motion.minimal ? 'OFF (minimal)' : 'ON'}
			</div>
			<div style={{ opacity: 0.95 }}>
				<Row k='reduced' v={reduced ? '⚠ ON' : 'off'} bad={reduced} />
				<Row k='compact (phone)' v={motion.compact ? 'yes' : 'no'} />
				<Row k='tablet' v={motion.tablet ? 'yes' : 'no'} />
				<Row k='lite' v={motion.lite ? 'yes' : 'no'} />
				<Row k='narrowPhone' v={motion.narrowPhone ? 'yes' : 'no'} />
				<Row k='iosSafari' v={motion.iosSafari ? 'yes' : 'no'} />
			</div>
			{reduced && (
				<div
					style={{
						marginTop: 6,
						paddingTop: 6,
						borderTop: '1px solid rgba(255,255,255,0.15)',
						color: 'rgb(252,211,77)',
						fontSize: 9.5,
						lineHeight: 1.35,
					}}
				>
					iOS Low Power Mode auto-includes reduce-motion. Выкл его в Settings → Battery.
				</div>
			)}
		</div>
	)
}

function Row({ k, v, bad }: { k: string; v: string; bad?: boolean }) {
	return (
		<div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
			<span style={{ opacity: 0.65 }}>{k}</span>
			<span style={{ color: bad ? 'rgb(252,165,165)' : 'inherit' }}>{v}</span>
		</div>
	)
}
