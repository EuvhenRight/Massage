'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type ColorScheme = 'gold' | 'purple'

interface GlowTextProps {
	text: string
	/** Richer screen-reader / SEO heading; canvas still shows `text`. */
	accessibleHeading?: string
	className?: string
	colorScheme?: ColorScheme
	/** Must match parent section `aria-labelledby` (visible title is canvas; this is sr-only). */
	srOnlyHeadingId?: string
}

/**
 * CSS text-shadow fallback. Used on узких телефонах (≤640px) и при
 * prefers-reduced-motion — там canvas с многослойным blur «съедает» 30-80мс
 * на первой отрисовке и моргает на iOS. Визуально близко к canvas, но без
 * mouse-tracking glow.
 */
function GlowTextCss({
	text,
	accessibleHeading,
	srOnlyHeadingId,
	colorScheme,
}: {
	text: string
	accessibleHeading?: string
	srOnlyHeadingId: string
	colorScheme: ColorScheme
}) {
	const palette =
		colorScheme === 'gold'
			? '232,184,0'
			: '147,51,234'
	const lightPalette =
		colorScheme === 'gold'
			? '255,214,51'
			: '192,132,252'
	return (
		<span className='relative inline-flex justify-center'>
			<span
				aria-hidden
				className='font-serif text-[2.625rem] sm:text-[3.5rem] md:text-[4.5rem] lg:text-[5.625rem] xl:text-[6.875rem] leading-[1.1] text-white'
				style={{
					textShadow: `0 0 4px rgba(${palette},0.6), 0 0 15px rgba(${palette},0.4), 0 0 40px rgba(${lightPalette},0.3)`,
				}}
			>
				{text}
			</span>
			<h1 id={srOnlyHeadingId} className='sr-only'>
				{accessibleHeading ?? text}
			</h1>
		</span>
	)
}

const PALETTES: Record<
	ColorScheme,
	{
		primary: { r: number; g: number; b: number }
		light: { r: number; g: number; b: number }
	}
> = {
	gold: { primary: { r: 232, g: 184, b: 0 }, light: { r: 255, g: 214, b: 51 } },
	purple: {
		primary: { r: 147, g: 51, b: 234 },
		light: { r: 192, g: 132, b: 252 },
	},
}

export default function GlowText({
	text,
	accessibleHeading,
	className = '',
	colorScheme = 'gold',
	srOnlyHeadingId = 'depilation-hero',
}: GlowTextProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const mouse = useRef({ x: 0.5, y: 0.5, active: false })
	const raf = useRef<number>(0)
	const containerRef = useRef<HTMLDivElement>(null)
	// Mobile/laptop parity: canvas рендерится и на телефоне (3-слойный blur
	// быстро отрисовывается на современных мобильных GPU). CSS-fallback оставлен
	// только для `prefers-reduced-motion` — там пользователь явно отказался от
	// многослойных визуальных эффектов.
	const [useCss, setUseCss] = useState(false)
	useEffect(() => {
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
		const apply = () => setUseCss(mq.matches)
		apply()
		mq.addEventListener('change', apply)
		return () => mq.removeEventListener('change', apply)
	}, [])

	const getFontSize = useCallback(() => {
		const w = window.innerWidth
		if (w >= 1280) return 110
		if (w >= 1024) return 90
		if (w >= 768) return 72
		if (w >= 640) return 56
		return 42
	}, [])

	const draw = useCallback(() => {
		const canvas = canvasRef.current
		if (!canvas) return
		const ctx = canvas.getContext('2d')
		if (!ctx) return

		const dpr = window.devicePixelRatio || 1
		const fontSize = getFontSize()
		/* Match `font-serif` / next/font DM Serif Display */
		const font = `${fontSize}px "DM Serif Display", Georgia, serif`

		ctx.font = font
		const metrics = ctx.measureText(text)
		const textW = metrics.width
		const textH = fontSize * 1.2

		const padX = fontSize * 0.8
		const padY = fontSize * 0.5
		const w = textW + padX * 2
		const h = textH + padY * 2

		canvas.width = w * dpr
		canvas.height = h * dpr
		canvas.style.width = `${w}px`
		canvas.style.height = `${h}px`
		ctx.scale(dpr, dpr)

		ctx.clearRect(0, 0, w, h)

		const textX = w / 2
		const textY = h / 2 + fontSize * 0.35
		ctx.textAlign = 'center'
		ctx.textBaseline = 'alphabetic'
		ctx.font = font

		const mx = mouse.current.active ? mouse.current.x : 0.5
		const my = mouse.current.active ? mouse.current.y : 0.5

		const lightX = mx * w
		const lightY = my * h

		const maxRadius = Math.max(w, h) * 0.9

		const { primary: PRIM, light: LITE } = PALETTES[colorScheme]

		// 3 слоя вместо 6: визуально неотличимо, но первая отрисовка
		// быстрее в 2× (каждый blur — отдельный рендер-проход).
		const glowLayers = [
			{ blur: 40, alpha: 0.25, color: PRIM },
			{ blur: 18, alpha: 0.4, color: LITE },
			{ blur: 6, alpha: 0.55, color: PRIM },
		]

		for (const layer of glowLayers) {
			ctx.save()
			ctx.filter = `blur(${layer.blur}px)`
			ctx.font = font
			ctx.textAlign = 'center'
			ctx.textBaseline = 'alphabetic'

			const grad = ctx.createRadialGradient(
				lightX,
				lightY,
				0,
				lightX,
				lightY,
				maxRadius,
			)
			const { r, g, b } = layer.color
			const baseAlpha = mouse.current.active ? 0.15 : 0.35
			grad.addColorStop(0, `rgba(${r},${g},${b},${layer.alpha})`)
			grad.addColorStop(0.35, `rgba(${r},${g},${b},${layer.alpha * 0.6})`)
			grad.addColorStop(0.7, `rgba(${r},${g},${b},${layer.alpha * baseAlpha})`)
			grad.addColorStop(1, `rgba(${r},${g},${b},${layer.alpha * 0.05})`)

			ctx.fillStyle = grad
			ctx.fillText(text, textX, textY)
			ctx.restore()
		}

		ctx.save()
		ctx.font = font
		ctx.textAlign = 'center'
		ctx.textBaseline = 'alphabetic'

		const whiteGrad = ctx.createRadialGradient(
			lightX,
			lightY,
			0,
			lightX,
			lightY,
			maxRadius * 0.6,
		)
		const peak = mouse.current.active ? 1 : 0.9
		whiteGrad.addColorStop(0, `rgba(255,255,255,${peak})`)
		whiteGrad.addColorStop(0.3, 'rgba(255,255,255,0.92)')
		whiteGrad.addColorStop(0.6, 'rgba(200,180,140,0.7)')
		whiteGrad.addColorStop(1, 'rgba(160,140,100,0.45)')

		ctx.fillStyle = whiteGrad
		ctx.fillText(text, textX, textY)
		ctx.restore()
	}, [text, getFontSize, colorScheme])

	const animate = useCallback(() => {
		draw()
		raf.current = requestAnimationFrame(animate)
	}, [draw])

	useEffect(() => {
		draw()

		// Coalesce resize redraws to one per frame — the multi-layer blur redraw is
		// expensive and resize fires in bursts (esp. iOS URL-bar show/hide).
		let resizeRaf = 0
		const handleResize = () => {
			cancelAnimationFrame(resizeRaf)
			resizeRaf = requestAnimationFrame(draw)
		}
		window.addEventListener('resize', handleResize, { passive: true })
		return () => {
			window.removeEventListener('resize', handleResize)
			cancelAnimationFrame(resizeRaf)
			cancelAnimationFrame(raf.current)
		}
	}, [draw])

	const handleMouseMove = useCallback(
		(e: React.MouseEvent) => {
			const canvas = canvasRef.current
			if (!canvas) return
			const rect = canvas.getBoundingClientRect()
			mouse.current = {
				x: (e.clientX - rect.left) / rect.width,
				y: (e.clientY - rect.top) / rect.height,
				active: true,
			}
			if (!raf.current) raf.current = requestAnimationFrame(animate)
		},
		[animate],
	)

	const handleMouseLeave = useCallback(() => {
		mouse.current = { x: 0.5, y: 0.5, active: false }
		cancelAnimationFrame(raf.current)
		raf.current = 0
		draw()
	}, [draw])

	if (useCss) {
		return (
			<GlowTextCss
				text={text}
				accessibleHeading={accessibleHeading}
				srOnlyHeadingId={srOnlyHeadingId}
				colorScheme={colorScheme}
			/>
		)
	}

	return (
		<div
			ref={containerRef}
			className={`relative inline-flex justify-center ${className}`}
		>
			<canvas
				ref={canvasRef}
				onMouseMove={handleMouseMove}
				onMouseLeave={handleMouseLeave}
				className='block'
				aria-hidden='true'
			/>
			<h1 id={srOnlyHeadingId} className='sr-only'>
				{accessibleHeading ?? text}
			</h1>
		</div>
	)
}
