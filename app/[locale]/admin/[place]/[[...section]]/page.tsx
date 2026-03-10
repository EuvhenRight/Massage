import AdminPlacePage from "@/components/AdminPlacePage";
import { redirect } from "next/navigation";
import type { Place } from "@/lib/places";

const VALID_PLACES: Place[] = ["massage", "depilation"];
const VALID_SECTIONS = ["calendar", "agenda", "analytics", "settings", "price"] as const;

type AdminSection = (typeof VALID_SECTIONS)[number];

export default async function AdminPlaceRoutePage({
  params,
}: {
  params: Promise<{ locale: string; place: string; section?: string[] }>;
}) {
  const { locale, place, section } = await params;

  if (!VALID_PLACES.includes(place as Place)) {
    redirect(`/${locale}/admin`);
  }

  const sectionParam = (section?.[0] ?? "calendar") as AdminSection;
  const activeSection = VALID_SECTIONS.includes(sectionParam) ? sectionParam : "calendar";

  return <AdminPlacePage place={place as Place} section={activeSection} />;
}
