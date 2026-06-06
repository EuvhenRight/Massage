'use client'

import type { AppointmentData } from '@/lib/book-appointment'
import { resolveNotifyChannels } from '@/lib/notify-channels'
import { Mail, MessageCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'

/**
 * Shows which channel(s) a booking's customer notifications go out on, derived
 * the same way the send-confirmation route resolves them (email is the default;
 * WhatsApp is opt-in). Use `showLabel` for the detail view; icon-only otherwise.
 *
 * Each channel renders as a brand-colored filled pill (WhatsApp green / email
 * blue) instead of a generic neutral chip, so the channel is recognisable at a
 * glance on top of any service-colored block surface.
 */
export function NotificationChannelBadge({
	appointment,
	showLabel = false,
	className = '',
}: {
	appointment: Pick<AppointmentData, 'notifyByEmail' | 'notifyByWhatsApp'>
	showLabel?: boolean
	className?: string
}) {
	const t = useTranslations('admin')
	const { email, whatsapp } = resolveNotifyChannels(appointment)

	const iconSize = showLabel ? 'h-3.5 w-3.5' : 'h-3 w-3'
	const pillSize = showLabel
		? 'h-5 w-5'
		: 'h-[18px] w-[18px]'

	const fullLabel =
		whatsapp && email
			? `${t('notifyChannelEmail')} + ${t('notifyChannelWhatsApp')}`
			: whatsapp
				? t('notifyChannelWhatsApp')
				: t('notifyChannelEmail')

	return (
		<span
			className={`inline-flex items-center gap-1 ${className}`}
			title={fullLabel}
			aria-label={fullLabel}
		>
			{whatsapp ? (
				<span
					className={`${pillSize} inline-flex shrink-0 items-center justify-center rounded-full bg-[#25D366] shadow-[0_1px_4px_-1px_rgba(0,0,0,0.4),inset_0_0_0_1px_rgba(255,255,255,0.18)]`}
					aria-hidden
				>
					<MessageCircle
						className={`${iconSize} text-white`}
						strokeWidth={2.4}
						aria-hidden
					/>
				</span>
			) : null}
			{email ? (
				<span
					className={`${pillSize} inline-flex shrink-0 items-center justify-center rounded-full bg-sky-500 shadow-[0_1px_4px_-1px_rgba(0,0,0,0.4),inset_0_0_0_1px_rgba(255,255,255,0.18)]`}
					aria-hidden
				>
					<Mail
						className={`${iconSize} text-white`}
						strokeWidth={2.4}
						aria-hidden
					/>
				</span>
			) : null}
			{showLabel ? (
				<span className="text-icyWhite/85">{fullLabel}</span>
			) : null}
		</span>
	)
}
