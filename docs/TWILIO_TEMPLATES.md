# Twilio WhatsApp Content Templates

The booking system sends business-initiated WhatsApp messages through Twilio
Content Templates. Each template must be **submitted and approved in Twilio
Console** (Content API → Content Builder), and its `ContentSid` (`HX…`) wired
into the matching environment variable.

The application code in [`lib/whatsapp-admin-notify.ts`](../lib/whatsapp-admin-notify.ts)
looks up each `ContentSid` by env-var name. When a SID is missing the helper
returns `skipped: missing_content_sid` and the cron / route handler logs and
moves on — outages of a single template never block other channels.

---

## Reminder templates

Reminders are sent by the daily cron at
[`app/api/cron/send-reminders/route.ts`](../app/api/cron/send-reminders/route.ts).
The window (2-day / 1-day / 0-day) is selected by date arithmetic in
Europe/Bratislava.

### Variables

| `{{n}}` | Source | Used by |
| ------- | ------ | ------- |
| `{{1}}` | Customer first name | All reminders |
| `{{2}}` | Booked service (last segment of catalog path, e.g. "Back") | All reminders |
| `{{3}}` | Appointment date in `formatBratislavaDate` form (`14. 06. 2026`) | All reminders |
| `{{4}}` | Appointment time (`14:00`) | All reminders |
| `{{5}}` | Action token (used inside button URLs) | 2-day, 1-day, 1-day-confirmed |

Note: the same-day (0-day) reminder has **no buttons** and therefore
**no `{{5}}` variable**. Sending an extra variable that the template
doesn't reference triggers Twilio error 63018.

### Buttons

Reminders that carry action buttons use Twilio "URL" call-to-action
buttons (button type `QUICK_REPLY` is not used — these are dynamic URL
buttons):

* **Confirm** → `https://YOUR-DOMAIN/api/booking/confirm?t={{5}}`
* **Cancel**  → `https://YOUR-DOMAIN/api/booking/cancel?t={{5}}`

Replace `YOUR-DOMAIN` with the production host (Vercel project URL or custom
domain — must match what the signed token's grace period was minted against).

---

### Existing reminder templates

| Env var | Variant | Buttons | Variables |
| ------- | ------- | ------- | --------- |
| `TWILIO_CONTENT_SID_REMINDER_2D` | 2-day reminder | Confirm + Cancel | `{{1}}`–`{{5}}` |
| `TWILIO_CONTENT_SID_REMINDER_1D` | 1-day reminder | Confirm + Cancel | `{{1}}`–`{{5}}` |
| `TWILIO_CONTENT_SID_REMINDER_0D` | Same-day reminder | None (info only) | `{{1}}`–`{{4}}` |

### New: "already confirmed" 1-day reminder variant

When a customer confirmed earlier in the cycle (typically via the 2-day
reminder), the cron swaps the standard 1-day template for this one — the
**Confirm button is removed**, only Cancel remains.

If the env var is missing, the cron falls back to the standard 1-day
template (the customer simply sees both buttons again — no regression).

Same-day (0-day) reminders intentionally **do not** have a confirmed
variant — on the day itself the standard reminder with both buttons is
fine, so we save the extra Twilio approval round-trip.

| Env var | Variant | Buttons |
|---|---|---|
| `TWILIO_CONTENT_SID_REMINDER_1D_CONFIRMED` | 1-day reminder, customer already confirmed | Cancel only |

---

## Approved body copy (Slovak — primary)

The body strings below are recommended copy for the Slovak template. Adjust
emoji / tone in Twilio Console to match brand voice. Variable placeholders
`{{1}}` … `{{5}}` must remain exactly as shown — Twilio rejects templates
where placeholders don't match the variable count.

### `TWILIO_CONTENT_SID_REMINDER_1D_CONFIRMED`

**Body:**

```
Dobrý deň, {{1}} 👋

Tešíme sa na vás zajtra na termíne:
🗓 {{3}} o {{4}}
💆 {{2}}

Ak sa niečo zmenilo, dajte nám vedieť kliknutím nižšie.
```

**Buttons:**

| Type | Label | URL |
|---|---|---|
| URL | `Zrušiť termín` | `https://YOUR-DOMAIN/api/booking/cancel?t={{5}}` |

---

## Submission checklist (per template)

1. Open Twilio Console → **Messaging → Content Editor → New**.
2. Choose **WhatsApp** as the channel.
3. Set the body and add **exactly one** URL button (`Zrušiť termín` →
   cancel URL with `{{5}}`).
4. Set sample values for `{{1}}`–`{{5}}` (used by WhatsApp for approval
   review). Use a realistic E.164 booking token in the `{{5}}` sample — any
   valid JWT-style placeholder works.
5. Submit for WhatsApp approval. Approval usually takes < 24h.
6. Copy the resulting `HX…` Content SID into the corresponding env var on
   the production environment (and on staging / preview if you want to test
   end-to-end there).
7. Trigger a confirmation on a test booking, wait for the next reminder
   cron tick, and verify the cancel-only template lands.

---

## Other template env vars in this project

For completeness (see `CONTENT_SID_ENV` in
[`lib/whatsapp-admin-notify.ts`](../lib/whatsapp-admin-notify.ts) — code is
the source of truth):

| Env var | Purpose |
|---|---|
| `TWILIO_CONTENT_SID_BOOKING_NEW` | New booking confirmation to customer |
| `TWILIO_CONTENT_SID_BOOKING_CANCELLED` | Cancellation acknowledgement to customer |
| `TWILIO_CONTENT_SID_BOOKING_CONFIRMED` | "Thanks — confirmed" to customer (Phase 2) |
| `TWILIO_CONTENT_SID_BOOKING_RESCHEDULED` | Reschedule notice to customer |
| `TWILIO_CONTENT_SID_REMINDER_2D` | 2-day reminder (Confirm + Cancel) |
| `TWILIO_CONTENT_SID_REMINDER_1D` | 1-day reminder (Confirm + Cancel) |
| `TWILIO_CONTENT_SID_REMINDER_0D` | Same-day reminder (Confirm + Cancel) |
| `TWILIO_CONTENT_SID_REMINDER_1D_CONFIRMED` | 1-day reminder, already confirmed (Cancel only) |
| `TWILIO_CONTENT_SID_STAFF_NEW` | Staff alert on new booking |
| `TWILIO_CONTENT_SID_STAFF_CANCELLED` | Staff alert on cancellation |
| `TWILIO_CONTENT_SID_STAFF_CUSTOMER_CONFIRMED` | Staff alert when customer confirms |
| `TWILIO_CONTENT_SID_BIRTHDAY` | Birthday greeting |
| `TWILIO_CONTENT_SID_RE_ENGAGEMENT` | Dormant client re-engagement |
