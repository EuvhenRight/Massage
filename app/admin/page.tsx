"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import type { Schedule, DaySchedule } from "@/lib/booking";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AdminPage() {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [appointments, setAppointments] = useState<Array<{ id: string; date: string; time: string; service?: string; customerName?: string }>>([]);
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideClosed, setOverrideClosed] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState("09:00");
  const [overrideClose, setOverrideClose] = useState("18:00");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchSchedule = useCallback(async () => {
    const res = await fetch("/api/schedule");
    if (res.ok) setSchedule(await res.json());
  }, []);

  const fetchAppointments = useCallback(async () => {
    const res = await fetch("/api/appointments");
    if (res.ok) setAppointments(await res.json());
  }, []);

  useEffect(() => {
    fetchSchedule();
    fetchAppointments();
  }, [fetchSchedule, fetchAppointments]);

  const updateDaySchedule = async (day: number, value: DaySchedule) => {
    if (!schedule) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultSchedule: { ...schedule.defaultSchedule, [day]: value },
        }),
      });
      if (res.ok) {
        setSchedule(await res.json());
        setMessage("Saved");
      } else setMessage("Failed to save");
    } catch {
      setMessage("Error saving");
    } finally {
      setSaving(false);
    }
  };

  const updateSlotDuration = async (minutes: number) => {
    if (!schedule) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotDurationMinutes: minutes }),
      });
      if (res.ok) {
        setSchedule(await res.json());
        setMessage("Saved");
      } else setMessage("Failed to save");
    } catch {
      setMessage("Error saving");
    } finally {
      setSaving(false);
    }
  };

  const addDateOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideDate) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          override: {
            date: overrideDate,
            closed: overrideClosed,
            open: overrideOpen,
            close: overrideClose,
          },
        }),
      });
      if (res.ok) {
        setSchedule(await res.json());
        setOverrideDate("");
        setMessage("Override saved");
      } else setMessage("Failed to save");
    } catch {
      setMessage("Error saving");
    } finally {
      setSaving(false);
    }
  };

  const removeOverride = async (date: string) => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          override: { date, remove: true },
        }),
      });
      if (res.ok) {
        setSchedule(await res.json());
        setMessage("Override removed");
      } else setMessage("Failed to remove");
    } catch {
      setMessage("Error");
    } finally {
      setSaving(false);
    }
  };

  if (!schedule) {
    return (
      <main className="min-h-screen bg-nearBlack text-icyWhite flex items-center justify-center">
        <p className="text-icyWhite/70">Loading...</p>
      </main>
    );
  }

  const overrideEntries = Object.entries(schedule.overrides).filter(([, v]) => v !== undefined);

  return (
    <main className="min-h-screen bg-nearBlack text-icyWhite p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <Link
            href="/"
            className="text-gold-soft hover:text-gold-glow transition-colors text-sm"
          >
            ← Back to Aurora
          </Link>
          <h1 className="font-serif text-2xl text-icyWhite">Admin — Schedule & Bookings</h1>
        </div>

        {message && (
          <p
            className={clsx(
              "mb-6 py-2 px-4 rounded-lg",
              message.includes("Failed") || message.includes("Error")
                ? "bg-aurora-magenta/20 text-aurora-magenta"
                : "bg-gold-soft/20 text-gold-glow"
            )}
          >
            {message}
          </p>
        )}

        {/* Slot duration */}
        <section className="mb-10 p-6 rounded-xl border border-white/10 bg-nearBlack/60">
          <h2 className="font-serif text-lg text-gold-soft mb-4">Timeslot Duration</h2>
          <select
            value={schedule.slotDurationMinutes}
            onChange={(e) => updateSlotDuration(Number(e.target.value))}
            disabled={saving}
            className="bg-nearBlack border border-white/20 rounded-lg px-4 py-2 text-icyWhite"
          >
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>60 minutes</option>
            <option value={90}>90 minutes</option>
            <option value={120}>2 hours</option>
          </select>
        </section>

        {/* Default weekly schedule */}
        <section className="mb-10 p-6 rounded-xl border border-white/10 bg-nearBlack/60">
          <h2 className="font-serif text-lg text-gold-soft mb-4">Default Weekly Schedule</h2>
          <p className="text-sm text-icyWhite/70 mb-6">
            Set working hours for each day. Uncheck &quot;Open&quot; to close that day.
          </p>
          <div className="space-y-4">
            {DAY_NAMES.map((name, day) => {
              const daySchedule = schedule.defaultSchedule[day];
              const isOpen = daySchedule !== null;
              return (
                <div
                  key={day}
                  className="flex flex-wrap items-center gap-4 p-4 rounded-lg bg-nearBlack/80 border border-white/5"
                >
                  <span className="w-28 text-icyWhite/90">{name}</span>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isOpen}
                      onChange={(e) =>
                        updateDaySchedule(day, e.target.checked ? { open: "09:00", close: "18:00" } : null)
                      }
                      disabled={saving}
                      className="rounded border-white/30"
                    />
                    <span className="text-sm">Open</span>
                  </label>
                  {isOpen && daySchedule && (
                    <>
                      <input
                        type="time"
                        value={daySchedule.open}
                        onChange={(e) =>
                          updateDaySchedule(day, { ...daySchedule, open: e.target.value })
                        }
                        disabled={saving}
                        className="bg-nearBlack border border-white/20 rounded px-3 py-1.5 text-sm"
                      />
                      <span className="text-icyWhite/50">to</span>
                      <input
                        type="time"
                        value={daySchedule.close}
                        onChange={(e) =>
                          updateDaySchedule(day, { ...daySchedule, close: e.target.value })
                        }
                        disabled={saving}
                        className="bg-nearBlack border border-white/20 rounded px-3 py-1.5 text-sm"
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Date overrides */}
        <section className="mb-10 p-6 rounded-xl border border-white/10 bg-nearBlack/60">
          <h2 className="font-serif text-lg text-gold-soft mb-4">Date Overrides</h2>
          <p className="text-sm text-icyWhite/70 mb-4">
            Close specific dates or set custom hours (e.g. holidays, special hours).
          </p>
          <form onSubmit={addDateOverride} className="flex flex-wrap items-end gap-4 mb-6">
            <div>
              <label className="block text-xs text-icyWhite/60 mb-1">Date</label>
              <input
                type="date"
                value={overrideDate}
                onChange={(e) => setOverrideDate(e.target.value)}
                required
                className="bg-nearBlack border border-white/20 rounded px-3 py-2 text-sm"
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={overrideClosed}
                onChange={(e) => setOverrideClosed(e.target.checked)}
                className="rounded border-white/30"
              />
              <span className="text-sm">Closed</span>
            </label>
            {!overrideClosed && (
              <>
                <div>
                  <label className="block text-xs text-icyWhite/60 mb-1">Open</label>
                  <input
                    type="time"
                    value={overrideOpen}
                    onChange={(e) => setOverrideOpen(e.target.value)}
                    className="bg-nearBlack border border-white/20 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-icyWhite/60 mb-1">Close</label>
                  <input
                    type="time"
                    value={overrideClose}
                    onChange={(e) => setOverrideClose(e.target.value)}
                    className="bg-nearBlack border border-white/20 rounded px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-gold-soft/20 border border-gold-soft/40 text-gold-glow hover:bg-gold-soft/30 disabled:opacity-50"
            >
              Add Override
            </button>
          </form>
          {overrideEntries.length > 0 && (
            <ul className="space-y-2">
              {overrideEntries.map(([date, override]) => (
                <li
                  key={date}
                  className="flex items-center justify-between py-2 px-3 rounded bg-nearBlack/80 border border-white/5"
                >
                  <span className="text-icyWhite/90">
                    {date} — {override ? `${override.open}–${override.close}` : "Closed"}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeOverride(date)}
                    disabled={saving}
                    className="text-sm text-aurora-magenta hover:underline"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Appointments list */}
        <section className="p-6 rounded-xl border border-white/10 bg-nearBlack/60">
          <h2 className="font-serif text-lg text-gold-soft mb-4">Upcoming Appointments</h2>
          {appointments.length === 0 ? (
            <p className="text-icyWhite/60">No appointments yet.</p>
          ) : (
            <ul className="space-y-2">
              {appointments.slice(0, 20).map((a) => (
                <li
                  key={a.id}
                  className="flex justify-between py-2 px-3 rounded bg-nearBlack/80 border border-white/5"
                >
                  <span>
                    {a.date} {a.time} — {a.service || "Appointment"}
                    {a.customerName && ` (${a.customerName})`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
