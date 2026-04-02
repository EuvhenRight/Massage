/**
 * Recreate Firestore `days/{place}_{YYYY-MM-DD}` documents from the `appointments` collection.
 * Use after the `days` collection was deleted or corrupted; `appointments` stays the source of truth.
 *
 * Requires .env.local with NEXT_PUBLIC_FIREBASE_* (same as test:crud).
 *
 * Usage:
 *   npm run rebuild-days -- --dry-run
 *   npm run rebuild-days -- --confirm
 *   npm run rebuild-days -- --confirm --place=massage
 */
import "./load-env";
import {
  collection,
  doc,
  getDocs,
  writeBatch,
  Timestamp,
  type DocumentData,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  getAppointmentDayDateKeys,
  inferAdminBookingModeFromFirestore,
} from "../lib/book-appointment";
import { getDateKey, timeToMinutes } from "../lib/booking";
import { getWorkingHoursForDate } from "../lib/availability-firestore";
import { getSchedule } from "../lib/schedule-firestore";
import type { ScheduleData } from "../lib/schedule-firestore";
import type { Place } from "../lib/places";

const BATCH_MAX = 450;

function parseArgs(argv: string[]) {
  const dryRun = argv.includes("--dry-run");
  const confirm = argv.includes("--confirm");
  let place: string | null = null;
  for (const a of argv) {
    if (a.startsWith("--place=")) {
      place = a.slice("--place=".length).trim() || null;
    }
  }
  return { dryRun, confirm, place };
}

function parseDateKey(dateKey: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function fullDayWindowForDate(
  dateCalendar: Date,
  schedule: ScheduleData | null
): { start: Date; end: Date } | null {
  const wh = getWorkingHoursForDate(schedule, dateCalendar);
  if (!wh) return null;
  const openM = timeToMinutes(wh.open);
  const closeM = timeToMinutes(wh.close);
  if (closeM <= openM) return null;
  const start = new Date(dateCalendar);
  start.setHours(Math.floor(openM / 60), openM % 60, 0, 0);
  const end = new Date(dateCalendar);
  end.setHours(Math.floor(closeM / 60), closeM % 60, 0, 0);
  return { start, end };
}

type SlotRow = { id: string; start: Timestamp; end: Timestamp };

function slotsForAppointment(
  id: string,
  d: DocumentData,
  scheduleByPlace: Map<Place, ScheduleData>
): { dayDocId: string; slot: SlotRow }[] {
  if (d.scheduleTbd === true) return [];

  const place = ((d.place as Place | undefined) ?? "massage") as Place;
  const schedule = scheduleByPlace.get(place) ?? null;
  const mode = inferAdminBookingModeFromFirestore(d as Record<string, unknown>);

  if (mode === "day") {
    const dateKeys = getAppointmentDayDateKeys(d as Record<string, unknown>);
    const out: { dayDocId: string; slot: SlotRow }[] = [];
    for (const dk of dateKeys) {
      const cal = parseDateKey(dk);
      if (!cal) continue;
      const w = fullDayWindowForDate(cal, schedule);
      if (!w) {
        console.warn(
          `  skip ${id} day ${dk}: closed or no working hours in schedule`
        );
        continue;
      }
      out.push({
        dayDocId: `${place}_${dk}`,
        slot: {
          id,
          start: Timestamp.fromDate(w.start),
          end: Timestamp.fromDate(w.end),
        },
      });
    }
    return out;
  }

  const st = d.startTime as Timestamp | undefined;
  const en = d.endTime as Timestamp | undefined;
  if (!st || !en) return [];
  const start = st.toDate();
  const end = en.toDate();
  const dk = getDateKey(start);
  return [
    {
      dayDocId: `${place}_${dk}`,
      slot: {
        id,
        start: Timestamp.fromDate(start),
        end: Timestamp.fromDate(end),
      },
    },
  ];
}

async function main() {
  const { dryRun, confirm, place: placeArg } = parseArgs(process.argv.slice(2));

  if (!dryRun && !confirm) {
    console.error("Pass --dry-run to preview, or --confirm to write to Firestore.");
    console.error("");
    console.error("  npm run rebuild-days -- --dry-run");
    console.error("  npm run rebuild-days -- --confirm");
    console.error("  npm run rebuild-days -- --confirm --place=massage");
    process.exit(1);
  }

  if (
    placeArg &&
    placeArg !== "massage" &&
    placeArg !== "depilation"
  ) {
    console.error("--place must be massage or depilation (or omit for all).");
    process.exit(1);
  }

  const scheduleByPlace = new Map<Place, ScheduleData>();
  for (const p of ["massage", "depilation"] as Place[]) {
    if (placeArg && p !== placeArg) continue;
    scheduleByPlace.set(p, await getSchedule(p));
  }

  const col = collection(db, "appointments");
  const snap = await getDocs(col);

  /** dayDocId -> slots */
  const byDay = new Map<string, SlotRow[]>();

  let skipped = 0;
  for (const docSnap of snap.docs) {
    const d = docSnap.data();
    const aptPlace = (d.place as Place | undefined) ?? "massage";
    if (placeArg && aptPlace !== placeArg) continue;

    const rows = slotsForAppointment(docSnap.id, d, scheduleByPlace);
    if (rows.length === 0) {
      skipped++;
      continue;
    }
    for (const { dayDocId, slot } of rows) {
      const list = byDay.get(dayDocId) ?? [];
      list.push(slot);
      byDay.set(dayDocId, list);
    }
  }

  console.log(
    `Appointments scanned: ${snap.size}; wrote slots from ${snap.size - skipped} doc(s); skipped ${skipped} (TBD / missing times).`
  );
  console.log(`Day documents to write: ${byDay.size}`);

  if (dryRun) {
    for (const [dayId, slots] of Array.from(byDay.entries()).sort()) {
      console.log(`  ${dayId}: ${slots.length} slot(s)`);
    }
    console.log("Dry run — no writes.");
    process.exit(0);
  }

  const entries = Array.from(byDay.entries());
  for (let i = 0; i < entries.length; i += BATCH_MAX) {
    const chunk = entries.slice(i, i + BATCH_MAX);
    const batch = writeBatch(db);
    for (const [dayDocId, slots] of chunk) {
      batch.set(
        doc(db, "days", dayDocId),
        { slots },
        { merge: false }
      );
    }
    await batch.commit();
    console.log(`Committed ${Math.min(i + chunk.length, entries.length)} / ${entries.length} day doc(s)`);
  }

  console.log("Done. Collection `days` has been recreated from `appointments`.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
