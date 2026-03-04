import { NextResponse } from "next/server";
import { getServices } from "@/lib/services";
import type { Place } from "@/lib/places";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const place = searchParams.get("place") as Place | null;
    const rawLocale = searchParams.get("locale") || "sk";
    const normalized = rawLocale.slice(0, 2) as "sk" | "en" | "ru" | "uk";
    const locale: "sk" | "en" | "ru" | "uk" =
      normalized === "sk" || normalized === "en" || normalized === "ru" || normalized === "uk"
        ? normalized
        : "sk";
    const validPlace = place === "massage" || place === "depilation" ? place : undefined;
    const services = await getServices(validPlace, locale);
    return NextResponse.json(services);
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 }
    );
  }
}
