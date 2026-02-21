import { NextResponse } from "next/server";
import { getSchedule, setSchedule, setDateOverride } from "@/lib/booking-store";
import type { Schedule } from "@/lib/booking";

export async function GET() {
  try {
    const schedule = getSchedule();
    return NextResponse.json(schedule);
  } catch (e) {
    return NextResponse.json({ error: "Failed to load schedule" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (body.override) {
      const { date, closed, open, close, remove } = body.override;
      if (remove) {
        setDateOverride(date, null);
        return NextResponse.json(getSchedule());
      }
      setDateOverride(date, closed ? null : { open, close });
      return NextResponse.json(getSchedule());
    }
    const updated = setSchedule(body as Partial<Schedule>);
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: "Failed to update schedule" }, { status: 500 });
  }
}
