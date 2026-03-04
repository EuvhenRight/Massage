# Firestore indexes – full reference

## 1. Index definitions in the project

Defined in **`firestore.indexes.json`** (deploy with `firebase deploy --only firestore:indexes` if you use Firebase CLI).

| # | Collection   | Fields (order)                    | Query scope | Purpose |
|---|-------------|-----------------------------------|-------------|---------|
| 1 | `services`  | `place` (ASC), `title` (ASC)      | Collection  | Services filtered by place, sorted by title |
| 2 | `appointments` | `place` (ASC), `startTime` (ASC) | Collection  | Appointments by place and time (range or order) |

### JSON source

```json
{
  "indexes": [
    {
      "collectionGroup": "services",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "place", "order": "ASCENDING" },
        { "fieldPath": "title", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "appointments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "place", "order": "ASCENDING" },
        { "fieldPath": "startTime", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

## 2. Queries that use these indexes

### Collection: `appointments`

All of these use the **same composite index**: `place` (ASC) + `startTime` (ASC).

| Location | Query shape | Index used |
|----------|------------|------------|
| **AdminPlacePage.tsx** (agenda) | `where("place", "==", place)`, `where("startTime", ">=", startOfToday)`, `orderBy("startTime", "asc")` | appointments: place + startTime ASC |
| **AdminPlacePage.tsx** (analytics) | `where("place", "==", place)`, `orderBy("startTime", "asc")` — results reversed in memory for newest-first | appointments: place + startTime ASC |
| **BookingCalendarGrid.tsx** | `where("place", "==", place)`, `where("startTime", ">=", dayStart)`, `where("startTime", "<", dayEnd)` | appointments: place + startTime ASC |
| **booking-flow/StepDateTime.tsx** | `where("place", "==", place)`, `where("startTime", ">=", start)`, `where("startTime", "<=", end)` | appointments: place + startTime ASC |
| **booking-flow/StepTime.tsx** | Same as StepDateTime | appointments: place + startTime ASC |
| **booking-flow/StepServiceAndDate.tsx** | Same as StepDateTime | appointments: place + startTime ASC |
| **app/api/appointments/route.ts** (with date) | `where("startTime", ">=", ...)`, `where("startTime", "<=", ...)`, optional `where("place", "==", place)`, `orderBy("startTime", "asc")` | appointments: place + startTime ASC (when place is used) |
| **app/api/appointments/route.ts** (no date) | optional `where("place", "==", place)`, `orderBy("startTime", "asc")` | appointments: place + startTime ASC |
| **app/api/availability/route.ts** | optional `where("place", "==", place)`, `where("startTime", ">=", ...)`, `where("startTime", "<=", ...)` | appointments: place + startTime ASC (when place is used) |

### Collection: `services`

| Location | Query shape | Index used |
|----------|------------|------------|
| **AdminPlacePage.tsx** | `where("place", "==", place)`, `orderBy("title", "asc")` | services: place + title ASC |
| **AdminServicesInline.tsx** | Same | services: place + title ASC |
| **lib/services.ts** | optional `where("place", "==", place)`, `orderBy("title", "asc")` | services: place + title ASC |
| **AdminServicesManager.tsx** | `orderBy("title", "asc")` only (no `where`) | Single-field on `title` (often auto-created by Firestore) |

---

## 3. No index needed (single-doc reads)

- **lib/schedule-firestore.ts** – `getDoc(doc(db, "schedule", place))` — document read, no composite index.
- **lib/book-appointment.ts** – `getDoc(doc(db, "appointments", id))` — document read.

---

## 4. Creating indexes in Firebase Console

If an error says “The query requires an index” and includes a link:

1. Open that link (it opens the Firebase Console with the index pre-filled).
2. Click **Create index** and wait until status is **Enabled**.

To add the same indexes manually in [Firestore → Indexes](https://console.firebase.google.com/project/_/firestore/indexes):

- **appointments**: Collection `appointments`, fields `place` (Ascending), `startTime` (Ascending), scope Collection.
- **services**: Collection `services`, fields `place` (Ascending), `title` (Ascending), scope Collection.

---

## 5. Summary

| Collection     | Composite index | Used by |
|----------------|-----------------|--------|
| `appointments` | `place` ASC, `startTime` ASC | Admin (agenda + analytics), calendar grid, booking steps, API routes |
| `services`    | `place` ASC, `title` ASC     | Admin place page, services inline, lib/services |

One composite index per collection covers all current queries that need composite indexes.
