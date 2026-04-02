/**
 * Sends a sample admin WhatsApp via Twilio (no Resend, no Next.js).
 * Run from project root: npm run test:whatsapp
 * Requires .env.local: ADMIN_WHATSAPP_PHONE, TWILIO_*, and Twilio sandbox join on that phone.
 */
import "./load-env";
import {
  notifyAdminWhatsAppNew,
  notifyAdminWhatsAppCancelled,
} from "../lib/whatsapp-admin-notify";

async function main() {
  console.log("Testing admin WhatsApp (new booking)…");
  const newResult = await notifyAdminWhatsAppNew({
    customerName: "Test zákazník",
    email: "test@example.com",
    date: "10. 4. 2026",
    time: "14:00",
    service: "Test služba",
    fullCalendarDayCount: 2,
  });
  console.log("new booking →", newResult);

  console.log("Testing admin WhatsApp (cancelled)…");
  const cancelledResult = await notifyAdminWhatsAppCancelled({
    customerName: "Test zákazník",
    email: "test@example.com",
    date: "10. 4. 2026",
    time: "14:00",
    service: "Test služba",
  });
  console.log("cancelled →", cancelledResult);

  if (newResult === "skipped" && cancelledResult === "skipped") {
    console.log(
      "\nBoth skipped: set ADMIN_WHATSAPP_PHONE + TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_WHATSAPP_FROM in .env.local"
    );
    process.exitCode = 1;
    return;
  }
  if (newResult === "failed" || cancelledResult === "failed") {
    console.log(
      "\n63031: From and To must differ — TWILIO_WHATSAPP_FROM = Twilio sandbox/prod sender; ADMIN_WHATSAPP_PHONE = your phone.\n63007: Copy the exact From from Console → Messaging → Try WhatsApp; SID/token must be the same Twilio account."
    );
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
