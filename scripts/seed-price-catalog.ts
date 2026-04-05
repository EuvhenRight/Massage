/**
 * Writes the built-in full price catalogs (same data as GET /api/price-catalog fallback)
 * into Firestore and syncs bookable lines to the `services` collection.
 *
 * Requires `.env.local` with Firebase client keys (same as Next.js).
 * If Firestore security rules block unauthenticated writes, run while logged in
 * via the admin UI “Save” once, or adjust rules for maintenance scripts.
 *
 * Usage:
 *   npx tsx scripts/seed-price-catalog.ts           # both massage + depilation
 *   npx tsx scripts/seed-price-catalog.ts massage
 *   npx tsx scripts/seed-price-catalog.ts depilation
 */
import "./load-env";
import { setPriceCatalog } from "../lib/price-catalog-firestore";
import { normalizePriceCatalog } from "../lib/price-catalog-normalize";
import { getPriceCatalogExample } from "../lib/price-catalog-seed";
import { syncPriceCatalogToServices } from "../lib/sync-price-catalog-to-services";
import type { Place } from "../lib/places";

function parsePlaceArg(): Place[] {
  const a = process.argv[2]?.toLowerCase();
  if (!a || a === "both" || a === "all") {
    return ["massage", "depilation"];
  }
  if (a === "massage" || a === "depilation") {
    return [a];
  }
  console.error(
    "Usage: npx tsx scripts/seed-price-catalog.ts [massage|depilation|all]",
  );
  process.exit(1);
}

async function main() {
  const places = parsePlaceArg();
  for (const place of places) {
    const raw = getPriceCatalogExample(place);
    const structure = normalizePriceCatalog(raw);
    console.log(`Writing priceCatalog/${place}…`);
    await setPriceCatalog(place, structure);
    console.log(`Syncing services for ${place}…`);
    await syncPriceCatalogToServices(place, structure);
    console.log(`Done: ${place}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
