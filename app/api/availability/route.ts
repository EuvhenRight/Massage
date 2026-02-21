import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/booking-store";

export async function GET(request: NextRequest) {
  try {
    const dateStr = request.nextUrl.searchParams.get("date");
    if (!dateStr) {
      return NextResponse.json({ error: "Missing date parameter" }, { status: 400 });
    }
    const date = new Date(dateStr + "T12:00:00");
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    const slots = getAvailableSlots(date);
    return NextResponse.json({ date: dateStr, slots });
  } catch (e) {
    return NextResponse.json({ error: "Failed to get availability" }, { status: 500 });
  }
}
