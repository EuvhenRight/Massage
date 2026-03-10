'use client'

import Navbar from '@/components/Navbar'

interface BookingPageLayoutProps {
	children: React.ReactNode
	maxWidth?: '5xl' | '7xl'
}

export default function BookingPageLayout({
	children,
	maxWidth = '7xl',
}: BookingPageLayoutProps) {
	return (
		<main className="h-screen bg-nearBlack text-icyWhite flex flex-col overflow-hidden">
			<Navbar />
			<div
				className={`flex-1 flex flex-col min-h-0 pt-16 md:pt-20 pb-4 md:pb-6 px-4 sm:px-6 lg:px-8 ${
					maxWidth === '7xl' ? 'max-w-7xl' : 'max-w-5xl'
				} mx-auto w-full`}
			>
				<div className="flex-1 flex flex-col min-h-0 rounded-2xl border border-white/10 bg-nearBlack/50 overflow-hidden">
					{children}
				</div>
			</div>
		</main>
	)
}
