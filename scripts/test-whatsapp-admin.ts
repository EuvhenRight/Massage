/**
 * Sends a sample admin WhatsApp via Twilio (no Resend, no Next.js).
 * Run from project root: npm run test:whatsapp
 * Requires .env.local: staff phones (ADMIN / DEPILATION_MASTER / optional MASSAGE_MASTER), TWILIO_*, sandbox join on each recipient handset.
 */
import "./load-env";
import {
  notifyAdminWhatsAppNew,
  notifyAdminWhatsAppCancelled,
  notifyStaffWhatsAppNew,
  notifyStaffWhatsAppCancelled,
  twilioWhatsAppEnvSummary,
} from "../lib/whatsapp-admin-notify";

async function main() {
  const env = twilioWhatsAppEnvSummary();
  console.log("Twilio env check:", env);
  if (!env.ready) {
    console.log(
      "\nMissing variables — set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM,\nand at least one staff E.164: ADMIN_WHATSAPP_PHONE and/or DEPILATION_MASTER_WHATSAPP_PHONE.\n"
    );
    process.exitCode = 1;
    return;
  }
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

  console.log("Testing staff WhatsApp massage path (→ massage master / ADMIN)…");
  const staffMassage = await notifyStaffWhatsAppNew(
    {
      customerName: "Test masáž",
      email: "test@example.com",
      date: "12. 4. 2026",
      time: "16:00",
      service: "Masáž — test",
    },
    { bookingPlace: "massage" }
  );
  console.log("staff massage new →", staffMassage);

  console.log("Testing staff WhatsApp depilation path (→ depilation master)…");
  const staffNew = await notifyStaffWhatsAppNew(
    {
      customerName: "Test depilácia",
      email: "test@example.com",
      date: "11. 4. 2026",
      time: "10:00",
      service: "Depilácia — test",
    },
    { bookingPlace: "depilation" }
  );
  console.log("staff depilation new →", staffNew);

  console.log("Testing admin WhatsApp (cancelled)…");
  const cancelledResult = await notifyAdminWhatsAppCancelled({
    customerName: "Test zákazník",
    email: "test@example.com",
    date: "10. 4. 2026",
    time: "14:00",
    service: "Test služba",
  });
  console.log("cancelled →", cancelledResult);

  console.log("Testing staff WhatsApp depilation cancel…");
  const staffCancel = await notifyStaffWhatsAppCancelled(
    {
      customerName: "Test depilácia",
      email: "test@example.com",
      date: "11. 4. 2026",
      time: "10:00",
      service: "Depilácia — test",
    },
    { bookingPlace: "depilation" }
  );
  console.log("staff depilation cancelled →", staffCancel);

  console.log("Testing staff WhatsApp massage cancel…");
  const staffMassageCancel = await notifyStaffWhatsAppCancelled(
    {
      customerName: "Test masáž",
      email: "test@example.com",
      date: "12. 4. 2026",
      time: "16:00",
      service: "Masáž — test",
    },
    { bookingPlace: "massage" }
  );
  console.log("staff massage cancelled →", staffMassageCancel);

  if (newResult === "skipped" && cancelledResult === "skipped") {
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
