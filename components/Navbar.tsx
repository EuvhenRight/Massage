'use client'

import { getPlaceAccentUi } from '@/lib/place-accent-ui'
import type { Place } from '@/lib/places'
import { AnimatePresence, motion } from 'framer-motion'
import {
	HelpCircle,
	type LucideIcon,
	Mail,
	Sparkles,
	User,
	Users,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import LanguageSwitcher from './LanguageSwitcher'

type NavLink = { path: string; key: string; icon: LucideIcon }

const MASSAGE_LINKS: NavLink[] = [
	{ path: '/massage#about', key: 'about', icon: User },
	{ path: '/massage#services', key: 'services', icon: Sparkles },
	{ path: '/massage#team', key: 'team', icon: Users },
	{ path: '/massage#faq', key: 'faq', icon: HelpCircle },
	{ path: '/massage#contact', key: 'contact', icon: Mail },
]

const DEPILATION_LINKS: NavLink[] = [
	{ path: '/depilation#about', key: 'about', icon: User },
	{ path: '/depilation#services', key: 'services', icon: Sparkles },
	{ path: '/depilation#team', key: 'team', icon: Users },
	{ path: '/depilation#faq', key: 'faq', icon: HelpCircle },
	{ path: '/depilation#contact', key: 'contact', icon: Mail },
]

const mobileMenuVariants = {
	closed: {
		clipPath: 'circle(0% at calc(100% - 40px) 32px)',
		transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
	},
	open: {
		clipPath: 'circle(150% at calc(100% - 40px) 32px)',
		transition: { duration: 0.5, ease: [0, 0.55, 0.45, 1] },
	},
}

const panelMenuVariants = {
	closed: {
		x: '100%',
		transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
	},
	open: {
		x: '0%',
		transition: { duration: 0.4, ease: [0, 0.55, 0.45, 1] },
	},
}

const backdropVariants = {
	closed: { opacity: 0, transition: { duration: 0.3 } },
	open: { opacity: 1, transition: { duration: 0.3 } },
}

const listVariants = {
	closed: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
	open: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
}

const itemVariants = {
	closed: { opacity: 0, x: 30 },
	open: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

const MD_BREAKPOINT = 768

export default function Navbar() {
	const t = useTranslations('common')
	const params = useParams()
	const pathname = usePathname()
	const locale = (params?.locale as string) ?? 'sk'
	const isDepilation = pathname?.includes('/depilation') ?? false
	const place: Place = isDepilation ? 'depilation' : 'massage'
	const ui = useMemo(() => getPlaceAccentUi(place), [place])

	const navLinks = useMemo(() => {
		const links = isDepilation ? DEPILATION_LINKS : MASSAGE_LINKS
		return links.map(({ path, key, icon }) => ({
			href: `/${locale}${path}`,
			label: t(key),
			icon,
		}))
	}, [locale, isDepilation, t])

	const [open, setOpen] = useState(false)
	const [scrolled, setScrolled] = useState(false)
	const [isDesktop, setIsDesktop] = useState(false)

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 60)
		window.addEventListener('scroll', onScroll, { passive: true })
		return () => window.removeEventListener('scroll', onScroll)
	}, [])

	useEffect(() => {
		const mql = window.matchMedia(`(min-width: ${MD_BREAKPOINT}px)`)
		const onChange = (e: MediaQueryListEvent | MediaQueryList) =>
			setIsDesktop(e.matches)
		onChange(mql)
		mql.addEventListener('change', onChange)
		return () => mql.removeEventListener('change', onChange)
	}, [])

	useEffect(() => {
		if (open) {
			document.body.style.overflow = 'hidden'
		} else {
			document.body.style.overflow = ''
		}
		return () => {
			document.body.style.overflow = ''
		}
	}, [open])

	const closeMenu = useCallback(() => setOpen(false), [])

	const menuContent = (
		<>
			{/* Close button */}
			<div className='flex justify-end px-5 pt-4 sm:px-6 md:px-8'>
				<button
					type='button'
					onClick={closeMenu}
					className={`flex h-10 w-10 items-center justify-center rounded-xl border bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-300 ${ui.burgerBorder}`}
					aria-label={t('closeMenu')}
				>
					<svg
						className='h-5 w-5 text-icyWhite'
						fill='none'
						stroke='currentColor'
						viewBox='0 0 24 24'
					>
						<path
							strokeLinecap='round'
							strokeLinejoin='round'
							strokeWidth={1.5}
							d='M6 18L18 6M6 6l12 12'
						/>
					</svg>
				</button>
			</div>

			<motion.nav
				variants={listVariants}
				initial='closed'
				animate='open'
				exit='closed'
				className='flex-1 flex flex-col justify-center px-8 sm:px-12 md:px-10 lg:px-14'
			>
				<ul className='space-y-2'>
					{navLinks.map(link => {
						const Icon = link.icon
						return (
							<motion.li key={link.href} variants={itemVariants}>
								<Link
									href={link.href}
									onClick={closeMenu}
									className='group flex items-center gap-4 py-4 border-b border-white/5'
								>
									<Icon
										className={`${ui.menuNumber} w-5 h-5 shrink-0`}
										strokeWidth={1.5}
										aria-hidden
									/>
									<span className={ui.menuTitle}>{link.label}</span>
									<motion.span className={ui.menuArrow} aria-hidden>
										<svg
											className='w-6 h-6'
											fill='none'
											stroke='currentColor'
											viewBox='0 0 24 24'
										>
											<path
												strokeLinecap='round'
												strokeLinejoin='round'
												strokeWidth={1.5}
												d='M9 5l7 7-7 7'
											/>
										</svg>
									</motion.span>
								</Link>
							</motion.li>
						)
					})}
				</ul>

				<motion.div variants={itemVariants} className='mt-8'>
					<Link
						href={`/${locale}/${isDepilation ? 'depilation' : 'massage'}/booking`}
						onClick={closeMenu}
						className={ui.navMenuCta}
					>
						{t('book')}
						<svg
							className='w-4 h-4'
							fill='none'
							stroke='currentColor'
							viewBox='0 0 24 24'
						>
							<path
								strokeLinecap='round'
								strokeLinejoin='round'
								strokeWidth={2}
								d='M9 5l7 7-7 7'
							/>
						</svg>
					</Link>
				</motion.div>
			</motion.nav>

			<motion.div
				variants={itemVariants}
				className='px-8 sm:px-12 md:px-10 lg:px-14 py-6 border-t border-white/5'
			>
				<p className='text-icyWhite/30 text-xs tracking-wider'>
					V2studio · Križna 22, Bratislava
				</p>
			</motion.div>
		</>
	)

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
						className='shrink-0 hover:opacity-90 transition-opacity duration-300 relative z-[60] mt-2'
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

						<button
							type='button'
							onClick={() => setOpen(v => !v)}
							className={`relative w-10 h-10 flex items-center justify-center rounded-xl border bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-300 ${ui.burgerBorder}`}
							aria-expanded={open}
							aria-controls='nav-menu'
							aria-label={open ? t('closeMenu') : t('openMenu')}
						>
							<div className='w-5 h-4 flex flex-col justify-between'>
								<motion.span
									animate={
										open
											? { rotate: 45, y: 6, width: '100%' }
											: { rotate: 0, y: 0, width: '100%' }
									}
									transition={{ duration: 0.3, ease: 'easeInOut' }}
									className='block h-[1.5px] bg-icyWhite rounded-full origin-left'
								/>
								<motion.span
									animate={open ? { opacity: 0, x: 10 } : { opacity: 1, x: 0 }}
									transition={{ duration: 0.2 }}
									className='block h-[1.5px] w-3/4 bg-icyWhite/70 rounded-full'
								/>
								<motion.span
									animate={
										open
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

			<AnimatePresence>
				{open && !isDesktop && (
					<motion.div
						id='nav-menu'
						key='nav-menu-mobile'
						variants={mobileMenuVariants}
						initial='closed'
						animate='open'
						exit='closed'
						className='fixed inset-0 z-[55] bg-nearBlack/[0.97] backdrop-blur-xl flex flex-col'
					>
						{menuContent}
					</motion.div>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{open && isDesktop && (
					<>
						<motion.div
							key='nav-backdrop'
							variants={backdropVariants}
							initial='closed'
							animate='open'
							exit='closed'
							className='fixed inset-0 z-[54] bg-black/60'
							onClick={closeMenu}
							aria-hidden
						/>
						<motion.div
							id='nav-menu'
							key='nav-menu-panel'
							variants={panelMenuVariants}
							initial='closed'
							animate='open'
							exit='closed'
							className='fixed top-0 right-0 bottom-0 z-[55] w-1/2 max-w-[600px] min-w-[380px] bg-nearBlack/[0.97] backdrop-blur-xl flex flex-col border-l border-white/5'
						>
							{menuContent}
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</>
	)
}
