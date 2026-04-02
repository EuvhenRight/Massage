import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  buildConfirmationEmail,
  buildRescheduledEmail,
  buildCancelledEmail,
  buildAdminNewBooking,
  buildAdminCancelled,
} from "@/lib/email-templates";
import {
  notifyAdminWhatsAppNew,
  notifyAdminWhatsAppCancelled,
  type WhatsAppNotifyResult,
} from "@/lib/whatsapp-admin-notify";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
const FROM_NAME = "V2studio";

const SUBJECTS = {
  new: (date: string, time: string) => `V2studio — Rezervácia potvrdená na ${date} o ${time}`,
  newAdmin: (name: string, date: string, time: string) => `Nová rezervácia: ${name} — ${date} ${time}`,
  rescheduled: (newDate: string, newTime: string) => `V2studio — Rezervácia presunutá na ${newDate} o ${newTime}`,
  cancelled: "V2studio — Rezervácia zrušená",
  cancelledAdmin: (name: string, date: string, time: string) => `Zrušené: ${name} — ${date} ${time}`,
} as const;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@aurorasalon.com";

type EmailType = "new" | "rescheduled" | "cancelled";

export async function POST(request: Request) {
  try {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const type: EmailType =
      body.type === "rescheduled" || body.type === "cancelled" ? body.type : "new";

    let whatsappStatus: WhatsAppNotifyResult = "skipped";

    const resend = getResend();
    if (!resend) {
      return NextResponse.json({ error: "Email not configured" }, { status: 503 });
    }

    if (type === "new") {
      const { to, customerName, date, time, service, source, fullCalendarDayCount } = body;
      if (!to || !customerName || !date || !time) {
        return NextResponse.json(
          { error: "Missing required fields: to, customerName, date, time" },
          { status: 400 }
        );
      }
      const toStr = String(to);
      const nameStr = String(customerName);
      const dateStr = String(date);
      const timeStr = String(time);
      const serviceStr = service ? String(service) : "";
      const isAdminCreated = source === "admin";
      const dayCountRaw = fullCalendarDayCount;
      const dayCountNum =
        typeof dayCountRaw === "number"
          ? dayCountRaw
          : typeof dayCountRaw === "string"
            ? parseInt(dayCountRaw, 10)
            : NaN;
      const fullDayCount =
        Number.isFinite(dayCountNum) && dayCountNum >= 1 && dayCountNum <= 14
          ? dayCountNum
          : undefined;

      const customerResult = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [toStr],
        subject: SUBJECTS.new(dateStr, timeStr),
        html: buildConfirmationEmail(nameStr, dateStr, timeStr, serviceStr, fullDayCount),
      });

      let errMsg = customerResult.error?.message;
      if (!isAdminCreated && !errMsg) {
        const adminResult = await resend.emails.send({
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          to: [ADMIN_EMAIL],
          subject: SUBJECTS.newAdmin(nameStr, dateStr, timeStr),
          html: buildAdminNewBooking(nameStr, toStr, dateStr, timeStr, serviceStr, fullDayCount),
        });
        errMsg = adminResult.error?.message;
      }
      if (errMsg) {
        console.error("[send-confirmation] Resend error:", errMsg);
        return NextResponse.json(
          { error: errMsg },
          { status: 500 }
        );
      }
      if (!isAdminCreated) {
        whatsappStatus = await notifyAdminWhatsAppNew({
          customerName: nameStr,
          email: toStr,
          date: dateStr,
          time: timeStr,
          service: serviceStr,
          fullCalendarDayCount: fullDayCount,
        });
      }
    } else if (type === "rescheduled") {
      const { to, customerName, service, oldDate, oldTime, newDate, newTime } = body;
      if (!to || !customerName || !oldDate || !oldTime || !newDate || !newTime) {
        return NextResponse.json(
          { error: "Missing required fields: to, customerName, oldDate, oldTime, newDate, newTime" },
          { status: 400 }
        );
      }

      const customerResult = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [String(to)],
        subject: SUBJECTS.rescheduled(String(newDate), String(newTime)),
        html: buildRescheduledEmail(
          String(customerName),
          service ? String(service) : "",
          String(oldDate),
          String(oldTime),
          String(newDate),
          String(newTime)
        ),
      });

      if (customerResult.error) {
        console.error("[send-confirmation] Resend error:", customerResult.error.message);
        return NextResponse.json({ error: customerResult.error.message }, { status: 500 });
      }
    } else if (type === "cancelled") {
      const { to, customerName, date, time, service } = body;
      if (!to || !customerName || !date || !time) {
        return NextResponse.json(
          { error: "Missing required fields: to, customerName, date, time" },
          { status: 400 }
        );
      }
      const toStr = String(to);
      const nameStr = String(customerName);
      const dateStr = String(date);
      const timeStr = String(time);
      const serviceStr = service ? String(service) : "";

      const [customerResult, adminResult] = await Promise.all([
        resend.emails.send({
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          to: [toStr],
          subject: SUBJECTS.cancelled,
          html: buildCancelledEmail(nameStr, dateStr, timeStr, serviceStr),
        }),
        resend.emails.send({
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          to: [ADMIN_EMAIL],
          subject: SUBJECTS.cancelledAdmin(nameStr, dateStr, timeStr),
          html: buildAdminCancelled(nameStr, toStr, dateStr, timeStr, serviceStr),
        }),
      ]);

      const errMsg = customerResult.error?.message ?? adminResult.error?.message;
      if (errMsg) {
        console.error("[send-confirmation] Resend error:", errMsg);
        return NextResponse.json(
          { error: errMsg },
          { status: 500 }
        );
      }
      whatsappStatus = await notifyAdminWhatsAppCancelled({
        customerName: nameStr,
        email: toStr,
        date: dateStr,
        time: timeStr,
        service: serviceStr,
      });
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    return NextResponse.json({ ok: true, whatsapp: whatsappStatus });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to send email";
    console.error("[send-confirmation] Error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
