import { NextRequest, NextResponse } from "next/server";
import { getDocs } from "firebase/firestore";
import {
  appointmentIntervalsFromDocs,
  queryAppointmentsOverlappingRange,
} from "@/lib/appointments-overlap-query";
import {
  getAvailableTimeSlots,
  getPrepBufferMinutes,
  parseOccupiedSlots,
} from "@/lib/availability-firestore";
import { db } from "@/lib/firebase";
import { getSchedule } from "@/lib/schedule-firestore";
import type { Place } from "@/lib/places";

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const dateStr = url.searchParams.get("date");
    const place = url.searchParams.get("place") as Place | null;

    if (!dateStr) {
      return NextResponse.json({ error: "Missing date parameter" }, { status: 400 });
    }

    const date = new Date(`${dateStr}T12:00:00`);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const placeKey = place ?? "massage";
    const dayStart = new Date(`${dateStr}T00:00:00`);
    const dayEnd = new Date(`${dateStr}T23:59:59.999`);

    const [schedule, snapshot] = await Promise.all([
      getSchedule(placeKey),
      getDocs(
        queryAppointmentsOverlappingRange(db, placeKey, dayStart, dayEnd)
      ),
    ]);

    const appointments = appointmentIntervalsFromDocs(snapshot.docs);

    const occupied = parseOccupiedSlots(appointments, getPrepBufferMinutes(schedule));
    const durationMinutes = schedule.slotDurationMinutes ?? 60;
    const slots = getAvailableTimeSlots(date, durationMinutes, occupied, schedule);

    return NextResponse.json({ date: dateStr, slots });
  } catch (e) {
    return NextResponse.json({ error: "Failed to get availability" }, { status: 500 });
  }
}
