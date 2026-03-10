import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { auth } from "@/auth";
import { getPriceCatalog, setPriceCatalog } from "@/lib/price-catalog-firestore";
import type { Place } from "@/lib/places";
import type { PriceCatalogStructure } from "@/types/price-catalog";

const VALID_PLACES: Place[] = ["massage", "depilation"];

export async function GET(request: NextRequest) {
  try {
    const place = request.nextUrl.searchParams.get("place") as Place | null;
    if (!place || !VALID_PLACES.includes(place)) {
      return NextResponse.json(
        { error: "Invalid or missing place" },
        { status: 400 }
      );
    }
    const catalog = await getPriceCatalog(place);
    return NextResponse.json(catalog ?? { man: { services: [] }, woman: { services: [] } });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to fetch price catalog" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const place = request.nextUrl.searchParams.get("place") as Place | null;
    if (!place || !VALID_PLACES.includes(place)) {
      return NextResponse.json(
        { error: "Invalid or missing place" },
        { status: 400 }
      );
    }
    const body = (await request.json()) as PriceCatalogStructure;
    if (!body || typeof body.man !== "object" || typeof body.woman !== "object") {
      return NextResponse.json(
        { error: "Invalid body: need man and woman with services" },
        { status: 400 }
      );
    }
    const structure: PriceCatalogStructure = {
      man: {
        services: Array.isArray(body.man.services) ? body.man.services : [],
      },
      woman: {
        services: Array.isArray(body.woman.services) ? body.woman.services : [],
      },
    };
    await setPriceCatalog(place, structure);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to save price catalog" },
      { status: 500 }
    );
  }
}
