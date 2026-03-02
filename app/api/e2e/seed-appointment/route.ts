import { NextRequest, NextResponse } from "next/server";
import { bookAppointmentAdmin } from "@/lib/book-appointment";
import { getDateKey } from "@/lib/booking";

/**
 * E2E-only API to seed an appointment for tests.
 * Requires X-E2E-Secret header to match E2E_SECRET env.
 * Only use in local/test environments.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.E2E_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "E2E seeding not configured" }, { status: 404 });
  }
  const headerSecret = request.headers.get("x-e2e-secret");
  if (headerSecret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { date, startTime = "10:00", place = "massage" } = body;

  let dateStr = date;
  if (!dateStr) {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    dateStr = getDateKey(t);
  }

  try {
    const apt = await bookAppointmentAdmin(
      {
        date: dateStr,
        startTime,
        durationMinutes: 60,
        service: "E2E Test Service",
        fullName: "E2E Test Customer",
        email: "e2e@test.local",
        phone: "—",
      },
      place
    );
    return NextResponse.json({ id: apt.id, date: dateStr, startTime });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to seed" },
      { status: 500 }
    );
  }
}
