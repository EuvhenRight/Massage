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

    // UPDATE (move to next hour)
    const nextHour = hour + 1;
    console.log(`\n3️⃣  UPDATE - Moving appointment to ${nextHour}:00...`);
    const newStart = new Date(`${TEST_DATE}T${nextHour}:00:00`);
    await updateAppointmentTime(created.id, newStart, 60);
    const afterUpdate = await getAppointment(created.id);
    const updatedHour = afterUpdate?.startTime && "toDate" in afterUpdate.startTime
      ? afterUpdate.startTime.toDate().getHours()
      : "?";
    console.log("   ✅ Updated - start hour:", updatedHour);

    // DELETE
    console.log("\n4️⃣  DELETE - Removing appointment...");
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
