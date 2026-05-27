import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
	title: 'Rezervácia potvrdená — V2studio',
	robots: { index: false, follow: false },
}

type SearchParams = Promise<{ ok?: string; err?: string }>

function copy(ok?: string, err?: string): { title: string; body: string } {
	if (err === 'token') {
		return {
			title: 'Odkaz vypršal',
			body: 'Tento odkaz je neplatný alebo už vypršal. Ak potrebujete potvrdiť rezerváciu, kontaktujte nás prosím priamo.',
		}
	}
	if (err === 'missing') {
		return {
			title: 'Rezerváciu sme nenašli',
			body: 'Vaša rezervácia v systéme neexistuje. Možno bola už zrušená. Ak máte otázky, ozvite sa nám.',
		}
	}
	if (ok === '1') {
		return {
			title: 'Ďakujeme za potvrdenie ❤️',
			body: 'Tešíme sa na vás. Vidíme sa v dohodnutom termíne.',
		}
	}
	return {
		title: 'Rezervácia potvrdená',
		body: 'Ďakujeme.',
	}
}

export default async function BookingConfirmedPage({
	searchParams,
}: {
	searchParams: SearchParams
}) {
	const { ok, err } = await searchParams
	const { title, body } = copy(ok, err)

	return (
		<main className="min-h-[70vh] flex items-center justify-center px-6 py-16">
			<div className="max-w-md text-center space-y-6">
				<h1 className="text-2xl font-medium">{title}</h1>
				<p className="text-base text-gray-600">{body}</p>
				<Link href="/" className="inline-block underline">
					Späť na úvod
				</Link>
			</div>
		</main>
	)
}
