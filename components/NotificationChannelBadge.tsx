'use client'

import type { AppointmentData } from '@/lib/book-appointment'
import { resolveNotifyChannels } from '@/lib/notify-channels'
import { Mail, MessageCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'

/**
 * Shows which channel(s) a booking's customer notifications go out on, derived
 * the same way the send-confirmation route resolves them (email is the default;
 * WhatsApp is opt-in). Use `showLabel` for the detail view; icon-only otherwise.
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

	return (
		<span
			className={`inline-flex items-center gap-1 ${className}`}
			title={
				whatsapp && email
					? `${t('notifyChannelEmail')} + ${t('notifyChannelWhatsApp')}`
					: whatsapp
						? t('notifyChannelWhatsApp')
						: t('notifyChannelEmail')
			}
			aria-label={
				whatsapp && email
					? `${t('notifyChannelEmail')} + ${t('notifyChannelWhatsApp')}`
					: whatsapp
						? t('notifyChannelWhatsApp')
						: t('notifyChannelEmail')
			}
		>
			{whatsapp ? (
				<MessageCircle className={`${iconSize} shrink-0 text-emerald-300`} aria-hidden />
			) : null}
			{email ? (
				<Mail className={`${iconSize} shrink-0 text-sky-300`} aria-hidden />
			) : null}
			{showLabel ? (
				<span className="text-icyWhite/80">
					{whatsapp && email
						? `${t('notifyChannelEmail')} + ${t('notifyChannelWhatsApp')}`
						: whatsapp
							? t('notifyChannelWhatsApp')
							: t('notifyChannelEmail')}
				</span>
			) : null}
		</span>
	)
}
