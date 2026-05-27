import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
	title: 'Rezervácia zrušená — V2studio',
	robots: { index: false, follow: false },
}

type SearchParams = Promise<{ ok?: string; err?: string }>

function copy(ok?: string, err?: string): { title: string; body: string } {
	if (err === 'token') {
		return {
			title: 'Odkaz vypršal',
			body: 'Tento odkaz je neplatný alebo už vypršal. Ak chcete rezerváciu zrušiť, kontaktujte nás priamo.',
		}
	}
	if (err === 'delete') {
		return {
			title: 'Nepodarilo sa zrušiť',
			body: 'Pri rušení rezervácie sa vyskytla chyba. Skúste prosím znova alebo nás kontaktujte.',
		}
	}
	if (ok === 'already') {
		return {
			title: 'Rezervácia bola už zrušená',
			body: 'Túto rezerváciu sme v systéme nenašli — pravdepodobne bola zrušená skôr.',
		}
	}
	if (ok === '1') {
		return {
			title: 'Rezervácia bola zrušená',
			body: 'Ďakujeme, že ste nám dali vedieť. Termín je opäť voľný. Tešíme sa na vás nabudúce.',
		}
	}
	return {
		title: 'Rezervácia zrušená',
		body: 'Ďakujeme.',
	}
}

export default async function BookingCancelledPage({
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
