'use client'

import { Skeleton } from '@/components/ui/skeleton'

export default function BookingPageSkeleton() {
	return (
		<div className="flex-1 flex flex-col min-h-0">
			{/* Progress bar */}
			<nav className="shrink-0 border-b border-white/10 px-4 py-3 md:px-6">
				<Skeleton className="h-0.5 w-full rounded-full" />
				<div className="flex justify-center gap-4 py-3">
					<Skeleton className="h-7 w-7 rounded-full shrink-0" />
					<Skeleton className="h-4 w-16" />
					<Skeleton className="h-0.5 w-8 rounded-full" />
					<Skeleton className="h-7 w-7 rounded-full shrink-0" />
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-0.5 w-8 rounded-full" />
					<Skeleton className="h-7 w-7 rounded-full shrink-0" />
					<Skeleton className="h-4 w-20" />
				</div>
			</nav>

			<div className="flex-1 flex min-h-0 md:flex-row flex-col">
				<main className="flex-1 min-w-0 flex flex-col overflow-hidden p-4 md:p-5">
					<div className="flex-shrink-0 mb-4">
						<Skeleton className="h-4 w-16" />
					</div>
					<div className="flex-1 min-h-0 rounded-xl border border-white/10 bg-white/[0.02] p-4 md:p-5">
						<div className="space-y-4 h-full flex flex-col">
							<div className="grid grid-cols-2 gap-2">
								<Skeleton className="h-12 rounded-xl" />
								<Skeleton className="h-12 rounded-xl" />
							</div>
							<Skeleton className="h-10 w-full rounded-xl" />
							<div className="grid grid-cols-2 gap-2">
								<Skeleton className="h-12 rounded-xl" />
								<Skeleton className="h-12 rounded-xl" />
							</div>
							<div className="flex-1 min-h-0 space-y-2">
								<Skeleton className="h-11 w-full rounded-lg" />
								<Skeleton className="h-14 w-full rounded-lg" />
								<Skeleton className="h-14 w-full rounded-lg" />
								<Skeleton className="h-14 w-full rounded-lg" />
							</div>
						</div>
					</div>
				</main>

				<aside className="w-full md:w-80 lg:w-96 shrink-0 flex flex-col border-t md:border-t-0 md:border-l border-white/10 p-5">
					<div className="space-y-2 mb-5">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-4 w-36" />
					</div>
					<div className="space-y-4 flex-1">
						<div>
							<Skeleton className="h-3 w-14 mb-1" />
							<Skeleton className="h-4 w-24" />
						</div>
						<div>
							<Skeleton className="h-3 w-12 mb-1" />
							<Skeleton className="h-4 w-20" />
						</div>
						<div>
							<Skeleton className="h-3 w-12 mb-1" />
							<Skeleton className="h-4 w-16" />
						</div>
					</div>
					<div className="pt-5 border-t border-white/10">
						<Skeleton className="h-10 w-full rounded-xl" />
					</div>
				</aside>
			</div>
		</div>
	)
}
