# Admin panel — user guide

This document is the **source copy** for staff documentation. The in-app help page (`/[locale]/admin/help`) uses the same content via translation files (`messages/*.json`, keys under `admin.help*`).

## Signing in

1. Open **Admin** from the site (or go directly to `/[locale]/admin/signin`).
2. Sign in with the email and password (or Google) provided by your administrator.
3. Choose **Massage** or **Depilation** to open that business’s calendar.

## Top navigation

| Tab | Purpose |
|-----|---------|
| **Calendar** | Week/month views, drag-and-drop rescheduling, “waiting for date” (TBD) list, full-day bookings. |
| **Agenda** | Chronological list of upcoming appointments. |
| **Analytics** | Search customers by name or phone; export PDF. |
| **Price catalog** | Services, sections, zones, prices, multilingual texts; bookable lines sync to the calendar. |
| **Settings** | Working hours, closed days, prep buffer between appointments, legacy service list notes. |

**Public booking** opens the customer-facing booking page in a new tab (useful for testing).

**Language** switcher changes UI language (SK / EN / RU / UK).

## Calendar

- **Drag** a timed appointment to another day or time slot. Past slots cannot be used.
- **Badges** on the Calendar tab: red = bookings that still need a **date and time**; amber = **full-day** bookings that still need all required **calendar days** set.
- **“Waiting for date”**: customers who chose “we’ll arrange the date with you” appear here until you assign real days/times.
- **Add appointment**: create a booking manually (date/time or full-day mode).
- **Full-day / multi-day**: in Edit, pick one date per required day (non-consecutive days are allowed if your setup supports it).

## Editing an appointment

- Open a block or list row → **Edit**. You can change customer details, internal notes, and (where allowed) schedule.
- **TBD** records: assign date and time or full days here, or drag from the unscheduled list onto the grid when the UI allows it.
- Past appointments are **view-only**.

## Price catalog

- Structure: services → sections/zones → price **lines**.
- Set **how customers book** per line: time slot vs “arrange with client” (TBD), and **number of full days** when applicable.
- **Save** to push bookable items to Firestore services used by the booking flow and admin colors.

## Settings

- Toggle **working days** for the visible month; save to apply.
- **Prep buffer**: minutes blocked after each appointment so clients don’t overlap.

## Tips

- Keep the **price catalog** as the single source of truth for bookable services (especially for depilation).
- Use **Agenda** for a quick phone list of “who’s coming next.”
- If something doesn’t appear on the public site, confirm the line is **bookable**, **saved**, and the day is **open** in Settings.

---

*Last updated: April 2026.*
