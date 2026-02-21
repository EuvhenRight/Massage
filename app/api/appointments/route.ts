import { NextRequest, NextResponse } from "next/server";
import { getAppointments, createAppointment } from "@/lib/booking-store";

export async function GET(request: NextRequest) {
  try {
    const date = request.nextUrl.searchParams.get("date");
    const appointments = getAppointments(date ?? undefined);
    return NextResponse.json(appointments);
  } catch (e) {
    return NextResponse.json({ error: "Failed to load appointments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, time, durationMinutes, service, customerName, customerEmail, customerPhone } = body;
    if (!date || !time) {
      return NextResponse.json({ error: "Date and time are required" }, { status: 400 });
    }
    const appointment = createAppointment({
      date,
      time,
      durationMinutes: durationMinutes ?? 60,
      service,
      customerName,
      customerEmail,
      customerPhone,
    });
    if (!appointment) {
      return NextResponse.json({ error: "Slot no longer available" }, { status: 409 });
    }
    return NextResponse.json(appointment);
  } catch (e) {
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
  }
}
