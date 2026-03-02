import { NextRequest, NextResponse } from "next/server";
import { updateAppointmentTime } from "@/lib/book-appointment";
import { getAppointment } from "@/lib/book-appointment";

/**
 * E2E-only API to move an appointment to a new slot (bypasses drag).
 * Requires X-E2E-Secret header. Use for E2E tests when drag detection is flaky.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.E2E_SECRET;
  if (!secret || request.headers.get("x-e2e-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { appointmentId, newCellId } = body;
  if (!appointmentId || !newCellId || !/^\d{8}-\d{4}$/.test(String(newCellId))) {
    return NextResponse.json({ error: "Invalid appointmentId or newCellId (use YYYYMMDD-HHmm)" }, { status: 400 });
  }

  const [datePart, timePart] = String(newCellId).split("-");
  const year = datePart!.slice(0, 4);
  const month = datePart!.slice(4, 6);
  const day = datePart!.slice(6, 8);
  const hour = timePart!.slice(0, 2);
  const minute = timePart!.slice(2, 4);
  const newStart = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);

  try {
    const apt = await getAppointment(appointmentId);
    if (!apt) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    const start = apt.startTime && "toDate" in apt.startTime ? apt.startTime.toDate() : new Date(apt.startTime as Date);
    const end = apt.endTime && "toDate" in apt.endTime ? apt.endTime.toDate() : new Date(apt.endTime as Date);
    const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
    await updateAppointmentTime(appointmentId, newStart, durationMinutes);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to move" },
      { status: 500 }
    );
  }
}
