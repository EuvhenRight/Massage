import { NextRequest, NextResponse } from "next/server";
import { collection, getDocs, query, where, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getDateKey } from "@/lib/booking";
import { bookAppointment } from "@/lib/book-appointment";
import type { Place } from "@/lib/places";

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const date = url.searchParams.get("date");
    const place = url.searchParams.get("place") as Place | null;

    const baseCollection = collection(db, "appointments");

    let q =
      date != null
        ? query(
            baseCollection,
            where(
              "startTime",
              ">=",
              new Date(`${date}T00:00:00`)
            ),
            where(
              "startTime",
              "<=",
              new Date(`${date}T23:59:59.999`)
            ),
            ...(place ? [where("place", "==", place)] : []),
            orderBy("startTime", "asc")
          )
        : query(
            baseCollection,
            ...(place ? [where("place", "==", place)] : []),
            orderBy("startTime", "asc")
          );

    const snapshot = await getDocs(q);

    const result = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as {
        startTime: Timestamp | Date;
        endTime: Timestamp | Date;
        service?: string;
        fullName?: string;
        email?: string;
        phone?: string;
      };

      const start =
        data.startTime && typeof data.startTime === "object" && "toDate" in data.startTime
          ? (data.startTime as Timestamp).toDate()
          : new Date(data.startTime as Date);
      const end =
        data.endTime && typeof data.endTime === "object" && "toDate" in data.endTime
          ? (data.endTime as Timestamp).toDate()
          : new Date(data.endTime as Date);

      const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

      const hours = String(start.getHours()).padStart(2, "0");
      const minutes = String(start.getMinutes()).padStart(2, "0");

      return {
        id: docSnap.id,
        date: getDateKey(start),
        time: `${hours}:${minutes}`,
        durationMinutes,
        service: data.service,
        customerName: data.fullName,
        customerEmail: data.email,
        customerPhone: data.phone,
      };
    });

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: "Failed to load appointments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      date,
      time,
      durationMinutes,
      service,
      customerName,
      customerEmail,
      customerPhone,
      place,
    } = body as {
      date?: string;
      time?: string;
      durationMinutes?: number;
      service?: string;
      customerName?: string;
      customerEmail?: string;
      customerPhone?: string;
      place?: Place;
    };

    if (!date || !time) {
      return NextResponse.json({ error: "Date and time are required" }, { status: 400 });
    }

    const duration = durationMinutes ?? 60;

    const appointment = await bookAppointment(
      {
        date,
        startTime: time,
        durationMinutes: duration,
        service: service ?? "",
        fullName: customerName ?? "",
        email: customerEmail ?? "",
        phone: customerPhone ?? "",
      },
      place ?? "massage"
    );

    const start =
      appointment.startTime && typeof appointment.startTime === "object" && "toDate" in appointment.startTime
        ? (appointment.startTime as Timestamp).toDate()
        : new Date(appointment.startTime as Date);
    const end =
      appointment.endTime && typeof appointment.endTime === "object" && "toDate" in appointment.endTime
        ? (appointment.endTime as Timestamp).toDate()
        : new Date(appointment.endTime as Date);

    const derivedDuration = Math.round((end.getTime() - start.getTime()) / 60000);
    const hours = String(start.getHours()).padStart(2, "0");
    const minutes = String(start.getMinutes()).padStart(2, "0");

    return NextResponse.json({
      id: appointment.id,
      date: getDateKey(start),
      time: `${hours}:${minutes}`,
      durationMinutes: derivedDuration,
      service: appointment.service,
      customerName: appointment.fullName,
      customerEmail: appointment.email,
      customerPhone: appointment.phone,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message === "OVERLAP") {
      return NextResponse.json({ error: "Slot no longer available" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
  }
}
