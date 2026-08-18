import { NextRequest, NextResponse } from "next/server";
import { deleteAppointment } from "@/lib/book-appointment";

/**
 * E2E-only API to remove an appointment a spec seeded.
 *
 * Without this the drag-reschedule spec leaked a row into the shared Firestore
 * on every run. Five leftovers saturate every candidate hour the spec tries
 * (each is 60 min and the prep buffer blocks the hour on either side), after
 * which the spec could never seed again until the calendar date rolled over.
 *
 * Requires X-E2E-Secret. Only enabled where E2E_SECRET is configured.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.E2E_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "E2E seeding not configured" }, { status: 404 });
  }
  if (request.headers.get("x-e2e-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { appointmentId } = body;
  if (!appointmentId || typeof appointmentId !== "string") {
    return NextResponse.json({ error: "Missing appointmentId" }, { status: 400 });
  }

  try {
    await deleteAppointment(appointmentId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete";
    // Cleanup runs in afterEach — an already-deleted row is success, not failure.
    if (message === "APPOINTMENT_NOT_FOUND") {
      return NextResponse.json({ ok: true, alreadyGone: true });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
