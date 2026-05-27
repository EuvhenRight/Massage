/**
 * Unit test for the customer-channel routing used by /api/send-confirmation.
 * Verifies a client who chose Email gets email-only and a client who chose
 * WhatsApp gets WhatsApp-only — on reschedule and cancel (admin-initiated,
 * WhatsApp opt-in) and on a new booking (WhatsApp default-on).
 *
 * Pure logic, no env / network. Run: npm run test:notify
 */
import { resolveNotifyChannels, toggleNotifyChannel } from "../lib/notify-channels";

let failures = 0;
function check(
  label: string,
  actual: { email: boolean; whatsapp: boolean },
  expected: { email: boolean; whatsapp: boolean }
) {
  const ok = actual.email === expected.email && actual.whatsapp === expected.whatsapp;
  if (!ok) failures++;
  console.log(
    `${ok ? "✓" : "✗"} ${label} → email=${actual.email} whatsapp=${actual.whatsapp}` +
      (ok ? "" : ` (expected email=${expected.email} whatsapp=${expected.whatsapp})`)
  );
}

// ── Reschedule / cancel: WhatsApp is opt-in (defaultWhatsApp false) ──
console.log("\nReschedule / cancel (admin, WhatsApp opt-in):");
check("Email-only client", resolveNotifyChannels({ notifyByEmail: true, notifyByWhatsApp: false }), { email: true, whatsapp: false });
check("WhatsApp-only client", resolveNotifyChannels({ notifyByEmail: false, notifyByWhatsApp: true }), { email: false, whatsapp: true });
check("Both channels", resolveNotifyChannels({ notifyByEmail: true, notifyByWhatsApp: true }), { email: true, whatsapp: true });
check("Legacy (no flags) → email only", resolveNotifyChannels({}), { email: true, whatsapp: false });
check("String flags from form", resolveNotifyChannels({ notifyByEmail: "false", notifyByWhatsApp: "true" }), { email: false, whatsapp: true });

// ── New booking: WhatsApp default-on (public flow always sends flags) ──
console.log("\nNew booking (WhatsApp default-on):");
check("Email-only client", resolveNotifyChannels({ notifyByEmail: true, notifyByWhatsApp: false }, { defaultWhatsApp: true }), { email: true, whatsapp: false });
check("WhatsApp-only client", resolveNotifyChannels({ notifyByEmail: false, notifyByWhatsApp: true }, { defaultWhatsApp: true }), { email: false, whatsapp: true });
check("Legacy (no flags) → both", resolveNotifyChannels({}, { defaultWhatsApp: true }), { email: true, whatsapp: true });

// ── Booking-flow toggle: channels are mutually exclusive (exactly one active) ──
console.log("\nBooking-flow toggle (mutually exclusive):");
check("Turn WhatsApp on → email off", toggleNotifyChannel("whatsapp", true), { email: false, whatsapp: true });
check("Turn WhatsApp off → email on", toggleNotifyChannel("whatsapp", false), { email: true, whatsapp: false });
check("Turn Email on → WhatsApp off", toggleNotifyChannel("email", true), { email: true, whatsapp: false });
check("Turn Email off → WhatsApp on", toggleNotifyChannel("email", false), { email: false, whatsapp: true });

if (failures > 0) {
  console.error(`\n${failures} test(s) failed.`);
  process.exit(1);
}
console.log("\nAll channel-routing tests passed.");
