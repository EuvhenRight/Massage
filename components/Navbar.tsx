'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import LanguageSwitcher from './LanguageSwitcher'

type NavLink = { path: string; key: string }

const MASSAGE_LINKS: NavLink[] = [
	{ path: '/massage#about', key: 'about' },
	{ path: '/massage#services', key: 'services' },
	{ path: '/massage#team', key: 'team' },
	{ path: '/massage#faq', key: 'faq' },
	{ path: '/massage#contact', key: 'contact' },
]

const DEPILATION_LINKS: NavLink[] = [
	{ path: '/depilation#about', key: 'about' },
	{ path: '/depilation#services', key: 'services' },
	{ path: '/depilation#team', key: 'team' },
	{ path: '/depilation#faq', key: 'faq' },
	{ path: '/depilation#contact', key: 'contact' },
]

const menuVariants = {
	closed: {
		clipPath: 'circle(0% at calc(100% - 40px) 32px)',
		transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
	},
	open: {
		clipPath: 'circle(150% at calc(100% - 40px) 32px)',
		transition: { duration: 0.5, ease: [0, 0.55, 0.45, 1] },
	},
}

const listVariants = {
	closed: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
	open: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
}

const itemVariants = {
	closed: { opacity: 0, x: 30 },
	open: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

export default function Navbar() {
	const t = useTranslations('common')
	const params = useParams()
	const pathname = usePathname()
	const locale = (params?.locale as string) ?? 'sk'
	const isDepilation = pathname?.includes('/depilation') ?? false

	const navLinks = useMemo(() => {
		const links = isDepilation ? DEPILATION_LINKS : MASSAGE_LINKS
		return links.map(({ path, key }) => ({
			href: `/${locale}${path}`,
			label: t(key),
		}))
	}, [locale, isDepilation, t])

	const [open, setOpen] = useState(false)
	const [scrolled, setScrolled] = useState(false)

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 60)
		window.addEventListener('scroll', onScroll, { passive: true })
		return () => window.removeEventListener('scroll', onScroll)
	}, [])

	useEffect(() => {
		if (open) {
			document.body.style.overflow = 'hidden'
		} else {
			document.body.style.overflow = ''
		}
		return () => { document.body.style.overflow = '' }
	}, [open])

	return (
		<>
			<motion.header
				className='fixed top-0 left-0 right-0 z-50 transition-all duration-500'
				style={{
					backgroundColor: scrolled ? 'rgba(10, 10, 10, 0.9)' : 'transparent',
					backdropFilter: scrolled ? 'blur(16px)' : 'blur(0px)',
				}}
				role='banner'
			>
				<nav
					className='mx-auto flex max-w-7xl items-center justify-between px-5 py-3 sm:px-6'
					aria-label={t('mainNav')}
				>
					<Link
						href={`/${locale}`}
						className='shrink-0 hover:opacity-90 transition-opacity duration-300 relative z-[60]'
						aria-label={t('auroraHome')}
					>
						<Image
							src='/images/Gemini_yellow2.png'
							alt='V2studio'
							width={160}
							height={80}
							className='h-12 sm:h-14 w-auto'
							priority
						/>
					</Link>

					<div className='flex items-center gap-3 relative z-[60]'>
						<LanguageSwitcher variant='site' />

						{/* Burger button */}
						<button
							type='button'
							onClick={() => setOpen(v => !v)}
							className='relative w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 hover:border-gold-soft/30 bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-300'
							aria-expanded={open}
							aria-controls='nav-menu'
							aria-label={open ? t('closeMenu') : t('openMenu')}
						>
							<div className='w-5 h-4 flex flex-col justify-between'>
								<motion.span
									animate={open
										? { rotate: 45, y: 6, width: '100%' }
										: { rotate: 0, y: 0, width: '100%' }
									}
									transition={{ duration: 0.3, ease: 'easeInOut' }}
									className='block h-[1.5px] bg-icyWhite rounded-full origin-left'
								/>
								<motion.span
									animate={open
										? { opacity: 0, x: 10 }
										: { opacity: 1, x: 0 }
									}
									transition={{ duration: 0.2 }}
									className='block h-[1.5px] w-3/4 bg-icyWhite/70 rounded-full'
								/>
								<motion.span
									animate={open
										? { rotate: -45, y: -6, width: '100%' }
										: { rotate: 0, y: 0, width: '100%' }
									}
									transition={{ duration: 0.3, ease: 'easeInOut' }}
									className='block h-[1.5px] bg-icyWhite rounded-full origin-left'
								/>
							</div>
						</button>
					</div>
				</nav>
			</motion.header>

			{/* Fullscreen menu overlay */}
			<AnimatePresence>
				{open && (
					<motion.div
						id='nav-menu'
						key='nav-menu'
						variants={menuVariants}
						initial='closed'
						animate='open'
						exit='closed'
						className='fixed inset-0 z-[55] bg-nearBlack/[0.97] backdrop-blur-xl flex flex-col'
					>
						{/* Spacer for header */}
						<div className='h-20' />

						<motion.nav
							variants={listVariants}
							initial='closed'
							animate='open'
							exit='closed'
							className='flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-20'
						>
							<ul className='space-y-2'>
								{navLinks.map((link, i) => (
									<motion.li key={link.href} variants={itemVariants}>
										<Link
											href={link.href}
											onClick={() => setOpen(false)}
											className='group flex items-center gap-4 py-4 border-b border-white/5'
										>
											<span className='text-gold-soft/30 text-sm font-mono tabular-nums'>
												{String(i + 1).padStart(2, '0')}
											</span>
											<span className='font-serif text-3xl sm:text-4xl lg:text-5xl text-icyWhite/90 group-hover:text-gold-soft transition-colors duration-300 tracking-tight'>
												{link.label}
											</span>
											<motion.span
												className='ml-auto text-gold-soft/0 group-hover:text-gold-soft/60 transition-colors duration-300'
												aria-hidden
											>
												<svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
													<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M9 5l7 7-7 7' />
												</svg>
											</motion.span>
										</Link>
									</motion.li>
								))}
							</ul>

							{/* Book Now CTA inside menu */}
							<motion.div variants={itemVariants} className='mt-8'>
								<Link
									href={`/${locale}/${isDepilation ? 'depilation' : 'massage'}/booking`}
									onClick={() => setOpen(false)}
									className='inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-gold-soft/15 border border-gold-soft/40 text-gold-soft font-medium text-sm tracking-[0.2em] uppercase hover:bg-gold-soft/25 hover:shadow-glow transition-all duration-300'
								>
									{t('book')}
									<svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
										<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
									</svg>
								</Link>
							</motion.div>
						</motion.nav>

						{/* Bottom bar with contact */}
						<motion.div
							variants={itemVariants}
							className='px-8 sm:px-12 lg:px-20 py-6 border-t border-white/5'
						>
							<p className='text-icyWhite/30 text-xs tracking-wider'>
								V2studio · Križna 22, Bratislava
							</p>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	)
}
