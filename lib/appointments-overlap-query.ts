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
    if (d.startTime == null || d.endTime == null) continue;
    out.push({
      startTime: d.startTime as Timestamp,
      endTime: d.endTime as Timestamp,
    });
  }
  return out;
}
