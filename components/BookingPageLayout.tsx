'use client'

import { useEffect } from 'react'
import Navbar from '@/components/Navbar'

interface BookingPageLayoutProps {
	children: React.ReactNode
	maxWidth?: '5xl' | '7xl'
	/** Massage booking uses purple accents on the shell; depilation stays neutral gold via inner flow only. */
	variant?: 'default' | 'massage'
}

export default function BookingPageLayout({
	children,
	maxWidth = '7xl',
	variant = 'default',
}: BookingPageLayoutProps) {
	useEffect(() => {
		document.documentElement.classList.add('booking-page-no-scroll')
		return () => document.documentElement.classList.remove('booking-page-no-scroll')
	}, [])

	return (
		<main className="fixed inset-0 z-0 h-[100dvh] max-h-[100dvh] bg-nearBlack text-icyWhite flex flex-col overflow-hidden overscroll-none">
			<Navbar />
			<div
				className={`flex-1 flex flex-col min-h-0 overflow-hidden pt-16 md:pt-20 pb-4 md:pb-6 px-4 sm:px-6 lg:px-8 ${
					maxWidth === '7xl' ? 'max-w-7xl' : 'max-w-5xl'
				} mx-auto w-full`}
			>
				<div
					className={
						variant === 'massage'
							? 'flex-1 flex flex-col min-h-0 rounded-2xl border border-purple-soft/25 bg-nearBlack/50 shadow-[0_0_48px_-16px_rgba(147,51,234,0.35)] overflow-hidden'
							: 'flex-1 flex flex-col min-h-0 rounded-2xl border border-white/10 bg-nearBlack/50 overflow-hidden'
					}
				>
					{children}
				</div>
			</div>
		</main>
	)
}
