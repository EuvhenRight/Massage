import { doc, getDoc, type Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { getDateKey } from "./booking";
import {
  getPrepBufferMinutes,
  parseOccupiedSlots,
  type OccupiedSlot,
} from "./availability-firestore";
import {
  appointmentIntervalsFromDocs,
  getAppointmentDocsOverlappingRange,
} from "./appointments-overlap-query";
import type { Place } from "./places";
import type { ScheduleData } from "./schedule-firestore";

type DaySlotRow = { id: string; start: Timestamp; end: Timestamp };

/**
 * Occupied intervals derived from `days/{place}_{YYYY-MM-DD}` slot rows.
 * Uses the same prep-buffer expansion as `parseOccupiedSlots` on appointments
 * so public availability matches `bookAppointment`’s overlap check on `days`.
 */
export async function fetchOccupiedSlotsFromDayDocuments(
  place: Place,
  rangeStart: Date,
  rangeEnd: Date,
  schedule: ScheduleData | null
): Promise<OccupiedSlot[]> {
  const prep = getPrepBufferMinutes(schedule);
  const intervals: { startTime: Timestamp; endTime: Timestamp }[] = [];

  const cursor = new Date(rangeStart);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(rangeEnd);
  end.setHours(0, 0, 0, 0);

  const dateKeys: string[] = [];
  while (cursor.getTime() <= end.getTime()) {
    dateKeys.push(getDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const snaps = await Promise.all(
    dateKeys.map((dk) => getDoc(doc(db, "days", `${place}_${dk}`)))
  );

  for (const snap of snaps) {
    if (!snap.exists()) continue;
    const slots = (snap.data()?.slots as DaySlotRow[] | undefined) ?? [];
    for (const s of slots) {
      if (s?.start && s?.end) {
        intervals.push({ startTime: s.start, endTime: s.end });
      }
    }
  }

  return parseOccupiedSlots(intervals, prep);
}

/**
 * Public booking UI: merge `appointments` overlaps with `days/*` slot rows.
 * `bookAppointment` enforces overlap against `days`; listing only appointments
 * caused “slot shows free” when `days` still had a blocking row (or vice versa).
 */
export async function fetchMergedPublicOccupiedSlots(
  place: Place,
  rangeStart: Date,
  rangeEnd: Date,
  schedule: ScheduleData | null
): Promise<OccupiedSlot[]> {
  const prep = getPrepBufferMinutes(schedule);
  const docs = await getAppointmentDocsOverlappingRange(
    db,
    place,
    rangeStart,
    rangeEnd
  );
  const fromApps = parseOccupiedSlots(
    appointmentIntervalsFromDocs(docs),
    prep
  );
  const fromDays = await fetchOccupiedSlotsFromDayDocuments(
    place,
    rangeStart,
    rangeEnd,
    schedule
  );
  return [...fromApps, ...fromDays];
}
