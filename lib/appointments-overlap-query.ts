import {
  collection,
  query,
  Timestamp,
  where,
  type DocumentData,
  type Firestore,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

/**
 * Appointments whose [startTime, endTime] overlaps [rangeStart, rangeEnd] (inclusive bounds).
 * Catches multi-day blocks that start before the visible range but extend into it.
 */
export function queryAppointmentsOverlappingRange(
  db: Firestore,
  place: string,
  rangeStart: Date,
  rangeEnd: Date
) {
  return query(
    collection(db, "appointments"),
    where("place", "==", place),
    where("endTime", ">=", Timestamp.fromDate(rangeStart)),
    where("startTime", "<=", Timestamp.fromDate(rangeEnd))
  );
}

/** YYYY-MM-DD keys from Firestore `adminFullDayDates`. */
function normalizeFullDayDateKeys(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item)) continue;
    if (seen.has(item)) continue;
    seen.add(item);
    keys.push(item);
  }
  return keys.sort();
}

/**
 * Full local calendar day [00:00, 23:59:59.999] so timed-slot checks block the whole day
 * (stored start/end may be a shorter window in some legacy rows).
 */
function fullLocalDayInterval(dateKey: string): {
  startTime: Timestamp;
  endTime: Timestamp;
} | null {
  const [y, mo, da] = dateKey.split("-").map(Number);
  if (!y || !mo || !da) return null;
  const start = new Date(y, mo - 1, da, 0, 0, 0, 0);
  const end = new Date(y, mo - 1, da, 23, 59, 59, 999);
  return {
    startTime: Timestamp.fromDate(start),
    endTime: Timestamp.fromDate(end),
  };
}

export function appointmentIntervalsFromDocs(
  docs: QueryDocumentSnapshot<DocumentData>[],
  options?: { excludeDocIds?: Iterable<string> }
): { startTime: Timestamp; endTime: Timestamp }[] {
  const exclude =
    options?.excludeDocIds == null
      ? null
      : new Set(options.excludeDocIds);
  const out: { startTime: Timestamp; endTime: Timestamp }[] = [];
  for (const doc of docs) {
    if (exclude?.has(doc.id)) continue;
    const d = doc.data();
    if (d.scheduleTbd === true) continue;
    if (d.adminBookingMode === "day") {
      const dayKeys = normalizeFullDayDateKeys(d.adminFullDayDates);
      if (dayKeys.length > 0) {
        for (const key of dayKeys) {
          const interval = fullLocalDayInterval(key);
          if (interval) out.push(interval);
        }
        continue;
      }
    }
    if (d.startTime == null || d.endTime == null) continue;
    out.push({
      startTime: d.startTime as Timestamp,
      endTime: d.endTime as Timestamp,
    });
  }
  return out;
}
