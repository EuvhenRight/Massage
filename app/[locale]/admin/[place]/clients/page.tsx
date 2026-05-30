import AdminClientsPage from '@/components/AdminClientsPage'
import { redirect } from 'next/navigation'
import type { Place } from '@/lib/places'

const VALID_PLACES: Place[] = ['massage', 'depilation']

export default async function AdminPlaceClientsRoutePage({
	params,
}: {
	params: Promise<{ locale: string; place: string }>
}) {
	const { locale, place } = await params
	if (!VALID_PLACES.includes(place as Place)) {
		redirect(`/${locale}/admin`)
	}
	return <AdminClientsPage place={place as Place} />
}
