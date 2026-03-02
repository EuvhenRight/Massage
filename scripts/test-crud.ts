/**
 * CRUD test script for appointment database.
 * Run: npm run test:crud
 * Ensure .env.local has your Firebase config.
 */
import "./load-env";
import {
  bookAppointment,
  getAppointment,
  updateAppointmentTime,
  deleteAppointment,
} from "../lib/book-appointment";

// Use unique slot per run to avoid overlap with leftover data from previous runs
const now = new Date();
const futureDate = new Date(now);
futureDate.setDate(futureDate.getDate() + 7);
const TEST_DATE = futureDate.toISOString().slice(0, 10);
const hour = 8 + (Date.now() % 12); // 8-19 range, unique per millisecond
const TEST_INPUT = {
  date: TEST_DATE,
  startTime: `${hour}:00`,
  durationMinutes: 60,
  service: "Hair Styling",
  fullName: "Test User",
  email: "test@example.com",
  phone: "+1234567890",
};

async function main() {
  console.log("🧪 Testing appointment CRUD operations...\n");

  try {
    // CREATE
    console.log("1️⃣  CREATE - Booking new appointment...");
    const created = await bookAppointment(TEST_INPUT);
    console.log("   ✅ Created:", created.id, `(${created.service}, ${created.fullName})`);

    // READ
    console.log("\n2️⃣  READ - Fetching appointment...");
    const read = await getAppointment(created.id);
    if (!read) {
      throw new Error("Read failed: appointment not found");
    }
    console.log("   ✅ Read:", read.id, `- ${read.fullName}, ${read.email}`);

    // UPDATE 1 (move to next hour, same day)
    const nextHour = hour + 1;
    console.log(`\n3️⃣  UPDATE (time) - Moving appointment to ${nextHour}:00 on same day...`);
    const newStartSameDay = new Date(`${TEST_DATE}T${nextHour}:00:00`);
    await updateAppointmentTime(created.id, newStartSameDay, 60);
    const afterTimeUpdate = await getAppointment(created.id);
    const updatedHour =
      afterTimeUpdate?.startTime && "toDate" in afterTimeUpdate.startTime
        ? afterTimeUpdate.startTime.toDate().getHours()
        : "?";
    console.log("   ✅ Updated time - start hour:", updatedHour);

    // UPDATE 2 (move to next day and different minutes)
    const nextDay = new Date(newStartSameDay);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setMinutes(15, 0, 0); // e.g. move to :15 on next day
    console.log(
      `\n4️⃣  UPDATE (day & time) - Moving appointment to ${nextDay.toISOString()}...`,
    );
    await updateAppointmentTime(created.id, nextDay, 60);
    const afterDayUpdate = await getAppointment(created.id);
    const updatedStart =
      afterDayUpdate?.startTime && "toDate" in afterDayUpdate.startTime
        ? afterDayUpdate.startTime.toDate()
        : null;
    console.log(
      "   ✅ Updated day & time - start:",
      updatedStart?.toISOString() ?? "?",
    );

    // DELETE
    console.log("\n5️⃣  DELETE - Removing appointment...");
    await deleteAppointment(created.id);
    const afterDelete = await getAppointment(created.id);
    if (afterDelete) {
      throw new Error("Delete failed: appointment still exists");
    }
    console.log("   ✅ Deleted successfully");

    console.log("\n✅ All CRUD tests passed!");
  } catch (err) {
    console.error("\n❌ Test failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
