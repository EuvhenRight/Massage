'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface DepilationContentCardProps {
	image: string
	imageAlt: string
	title: string
	children: React.ReactNode
	index?: number
	className?: string
}

export default function DepilationContentCard({
	image,
	imageAlt,
	title,
	children,
	index = 0,
	className,
}: DepilationContentCardProps) {
	return (
		<motion.article
			initial={{ opacity: 0, y: 32 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: '-40px' }}
			transition={{ duration: 0.5, delay: index * 0.08 }}
			className={cn(
				'group overflow-hidden rounded-2xl border border-white/5',
				'bg-nearBlack/60 backdrop-blur-sm',
				'hover:border-purple-soft/25 hover:shadow-card transition-all duration-500',
				className
			)}
		>
			<div className="aspect-[4/3] sm:aspect-[5/3] relative overflow-hidden">
				<Image
					src={image}
					alt={imageAlt}
					fill
					className="object-cover transition-transform duration-700 group-hover:scale-105"
					sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
				/>
				<div className="absolute inset-0 bg-gradient-to-t from-nearBlack via-nearBlack/30 to-transparent" />
				<h3 className="absolute bottom-0 left-0 right-0 p-6 font-serif text-2xl sm:text-3xl text-icyWhite">
					{title}
				</h3>
			</div>
			<div className="p-6">
				{children}
			</div>
		</motion.article>
	)
}
