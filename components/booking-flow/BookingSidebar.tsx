'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Phone, Mail } from 'lucide-react'
import { useBookingFlow } from './BookingFlowContext'
import { SITE_CONFIG } from '@/lib/site-config'

function formatTime(time: string): string {
	const [h, m] = time.split(':').map(Number)
	if (h === 0) return `12:${String(m).padStart(2, '0')} am`
	if (h < 12) return `${h}:${String(m).padStart(2, '0')} am`
	if (h === 12) return `12:${String(m).padStart(2, '0')} pm`
	return `${h - 12}:${String(m).padStart(2, '0')} pm`
}

function IconInstagram({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
			<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
		</svg>
	)
}

function IconWhatsApp({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
			<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
		</svg>
	)
}

const labelClass = 'text-[11px] font-medium text-icyWhite/50 uppercase tracking-wider'

export default function BookingSidebar() {
	const locale = useLocale()
	const t = useTranslations('booking')
	const tCommon = useTranslations('common')
	const { service, date, time, durationMinutes, fullName, email, step } = useBookingFlow()
	const hasSelection = !!(service || date || time)

	return (
		<div className="flex flex-col h-full p-5">
			<div className="space-y-2 mb-5">
				<h3 className="font-serif text-base font-semibold text-icyWhite">{t('bookingSummary')}</h3>
				<p className="text-sm text-icyWhite/60">
					{hasSelection ? t('reviewSelection') : t('choicesAppearHere')}
				</p>
			</div>

			<div className="flex-1 space-y-4 min-h-0">
				<div>
					<span className={labelClass}>{tCommon('services')}</span>
					{service ? (
						<div className="flex items-center justify-between gap-2 mt-1">
							<span className="text-sm text-icyWhite font-medium truncate">{service}</span>
							{durationMinutes > 0 && (
								<span className="text-xs text-icyWhite/50 shrink-0">{durationMinutes} min</span>
							)}
						</div>
					) : (
						<p className="text-sm text-icyWhite/40 mt-1">—</p>
					)}
				</div>

				<div>
					<span className={labelClass}>{tCommon('date')}</span>
					{date ? (
						<p className="text-sm text-icyWhite mt-1">
							{date.toLocaleDateString(locale, {
								weekday: 'short',
								month: 'short',
								day: 'numeric',
								year: 'numeric',
							})}
						</p>
					) : (
						<p className="text-sm text-icyWhite/40 mt-1">—</p>
					)}
				</div>

				<div>
					<span className={labelClass}>{tCommon('time')}</span>
					{time ? (
						<p className="text-sm text-icyWhite mt-1">{formatTime(time)}</p>
					) : (
						<p className="text-sm text-icyWhite/40 mt-1">—</p>
					)}
				</div>

				{step === 3 && (fullName || email) && (
					<div className="pt-4 border-t border-white/10">
						<span className={labelClass}>{t('contact')}</span>
						{fullName && <p className="text-sm text-icyWhite mt-1">{fullName}</p>}
						{email && <p className="text-sm text-icyWhite/60 mt-0.5">{email}</p>}
					</div>
				)}
			</div>

			<div className="pt-5 mt-5 border-t border-white/10 space-y-3">
				<span className={labelClass}>{t('contact')}</span>
				<div className="space-y-2 text-sm text-icyWhite/70">
					{SITE_CONFIG.phone && (
						<div className="flex items-center gap-2">
							<Phone className="size-4 shrink-0 text-icyWhite/50" />
							{SITE_CONFIG.phone}
						</div>
					)}
					{SITE_CONFIG.email && (
						<a
							href={`mailto:${SITE_CONFIG.email}`}
							className="flex items-center gap-2 hover:text-icyWhite transition-colors"
						>
							<Mail className="size-4 shrink-0 text-icyWhite/50" />
							{SITE_CONFIG.email}
						</a>
					)}
					{SITE_CONFIG.instagram && (
						<a
							href={SITE_CONFIG.instagram}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-2 hover:text-icyWhite transition-colors"
						>
							<IconInstagram className="size-4 shrink-0 text-icyWhite/50" />
							Instagram
						</a>
					)}
					{SITE_CONFIG.whatsapp && (
						<a
							href={SITE_CONFIG.whatsapp}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-2 hover:text-icyWhite transition-colors"
						>
							<IconWhatsApp className="size-4 shrink-0 text-icyWhite/50" />
							WhatsApp
						</a>
					)}
				</div>
			</div>

			<div className="pt-5 mt-5 border-t border-white/10">
				<p className="text-xs text-icyWhite/50 leading-relaxed">{t('bookingInfo')}</p>
			</div>
		</div>
	)
}
