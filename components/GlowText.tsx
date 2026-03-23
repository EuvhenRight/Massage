'use client'

import { useCallback, useEffect, useRef } from 'react'

type ColorScheme = 'gold' | 'purple'

interface GlowTextProps {
	text: string
	className?: string
	colorScheme?: ColorScheme
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
	className = '',
	colorScheme = 'gold',
}: GlowTextProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const mouse = useRef({ x: 0.5, y: 0.5, active: false })
	const raf = useRef<number>(0)
	const containerRef = useRef<HTMLDivElement>(null)

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
		const font = `${fontSize}px "Playfair Display", Georgia, serif`

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

		const glowLayers = [
			{ blur: 60, alpha: 0.12, color: PRIM },
			{ blur: 40, alpha: 0.2, color: PRIM },
			{ blur: 25, alpha: 0.3, color: LITE },
			{ blur: 15, alpha: 0.4, color: PRIM },
			{ blur: 8, alpha: 0.5, color: LITE },
			{ blur: 4, alpha: 0.6, color: PRIM },
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

		const handleResize = () => draw()
		window.addEventListener('resize', handleResize)
		return () => {
			window.removeEventListener('resize', handleResize)
			cancelAnimationFrame(raf.current)
		}
	}, [draw, animate])

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
			<h1 id='depilation-hero' className='sr-only'>
				{text}
			</h1>
		</div>
	)
}
