'use client'

import { Skeleton } from '@/components/ui/skeleton'

export default function BookingPageSkeleton() {
	return (
		<div className="flex flex-col h-full min-h-0 md:min-h-[420px]">
			{/* Progress bar — matches BookingStepProgress */}
			<nav className="shrink-0 border-b border-white/10 px-4 py-3 md:px-6">
				<Skeleton className="h-0.5 w-full rounded-full max-w-4xl mx-auto" />
				<div className="flex justify-center gap-2 sm:gap-4 py-3">
					<Skeleton className="h-7 w-7 rounded-full shrink-0" />
					<Skeleton className="hidden sm:block h-0.5 w-6 rounded-full" />
					<Skeleton className="h-7 w-7 rounded-full shrink-0" />
					<Skeleton className="hidden sm:block h-0.5 w-6 rounded-full" />
					<Skeleton className="h-7 w-7 rounded-full shrink-0" />
				</div>
			</nav>

			{/* Body: main + sidebar (sidebar hidden on mobile) */}
			<div className="flex-1 flex min-h-0 md:flex-row flex-col overflow-hidden">
				{/* Main content */}
				<main className="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden pb-12 md:pb-0">
					{/* Header row: back button + optional search */}
					<div className="px-4 py-2 sm:px-5 shrink-0 flex items-center gap-3">
						<Skeleton className="h-5 w-20 rounded" />
						<Skeleton className="h-9 flex-1 max-w-[200px] sm:max-w-[240px] rounded-xl" />
					</div>

					{/* Content card — single main block for mobile */}
					<div className="flex-1 min-h-0 px-4 sm:px-5 pb-4 overflow-hidden">
						<div className="flex-1 min-h-0 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-5 flex flex-col gap-4">
							<Skeleton className="h-10 w-2/3 rounded-xl" />
							<Skeleton className="h-12 w-full rounded-xl" />
							<Skeleton className="flex-1 min-h-[120px] rounded-xl" />
						</div>
					</div>
				</main>

				{/* Sidebar — desktop only */}
				<aside className="hidden md:flex w-80 lg:w-96 shrink-0 flex-col border-l border-white/10 p-5 min-h-0">
					<div className="space-y-3 mb-4">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-4 w-32" />
					</div>
					<div className="flex-1 space-y-3">
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-4 w-16" />
					</div>
					<Skeleton className="h-11 w-full rounded-xl mt-4 shrink-0" />
				</aside>
			</div>
		</div>
	)
}
