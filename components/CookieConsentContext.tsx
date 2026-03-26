'use client'

import {
	buildStoredConsent,
	persistConsentToDocument,
	readConsentFromDocument,
	type StoredCookieConsent,
} from '@/lib/cookie-consent'
import { usePathname } from 'next/navigation'
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from 'react'

const BANNER_DELAY_MS = 10_000

type CookieConsentContextValue = {
	consent: StoredCookieConsent | null
	ready: boolean
	bannerVisible: boolean
	customizeMode: boolean
	setCustomizeMode: (value: boolean) => void
	allowsAnalytics: boolean
	allowsMarketing: boolean
	openPreferences: () => void
	saveConsent: (categories: { analytics: boolean; marketing: boolean }) => void
	closeBanner: () => void
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null)

export function useCookieConsent(): CookieConsentContextValue {
	const ctx = useContext(CookieConsentContext)
	if (!ctx) {
		throw new Error('useCookieConsent must be used within CookieConsentProvider')
	}
	return ctx
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
	const pathname = usePathname()
	const isAdminRoute = pathname?.includes('/admin') ?? false
	const [ready, setReady] = useState(false)
	const [consent, setConsent] = useState<StoredCookieConsent | null>(null)
	const [bannerVisible, setBannerVisible] = useState(false)
	const [customizeMode, setCustomizeMode] = useState(false)
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const clearTimer = useCallback(() => {
		if (timerRef.current) {
			clearTimeout(timerRef.current)
			timerRef.current = null
		}
	}, [])

	useEffect(() => {
		const existing = readConsentFromDocument()
		setConsent(existing)
		setReady(true)
	}, [])

	useEffect(() => {
		if (!ready) return
		if (consent !== null) return
		if (isAdminRoute) return
		clearTimer()
		timerRef.current = setTimeout(() => {
			setBannerVisible(true)
			timerRef.current = null
		}, BANNER_DELAY_MS)
		return clearTimer
	}, [ready, consent, isAdminRoute, clearTimer])

	const saveConsent = useCallback(
		(categories: { analytics: boolean; marketing: boolean }) => {
			const next = buildStoredConsent(categories)
			persistConsentToDocument(next)
			setConsent(next)
			setBannerVisible(false)
			setCustomizeMode(false)
			clearTimer()
			if (typeof window !== 'undefined') {
				window.dispatchEvent(
					new CustomEvent('v2studio:cookie-consent-updated', { detail: next }),
				)
			}
		},
		[clearTimer],
	)

	const openPreferences = useCallback(() => {
		clearTimer()
		setCustomizeMode(true)
		setBannerVisible(true)
	}, [clearTimer])

	const closeBanner = useCallback(() => {
		if (consent !== null) {
			setBannerVisible(false)
			setCustomizeMode(false)
		}
	}, [consent])

	const value = useMemo<CookieConsentContextValue>(
		() => ({
			consent,
			ready,
			bannerVisible,
			customizeMode,
			setCustomizeMode,
			allowsAnalytics: consent?.analytics === true,
			allowsMarketing: consent?.marketing === true,
			openPreferences,
			saveConsent,
			closeBanner,
		}),
		[
			consent,
			ready,
			bannerVisible,
			customizeMode,
			openPreferences,
			saveConsent,
			closeBanner,
		],
	)

	return (
		<CookieConsentContext.Provider value={value}>
			{children}
		</CookieConsentContext.Provider>
	)
}
