"use client";

import { useCallback, useEffect, useMemo, useState, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

export interface CalendarEvent {
  title: string;
  start: string;
  end: string;
}

export interface ServiceOption {
  title: string;
}

interface BookingCalendarProps {
  isOpen: boolean;
  onClose: () => void;
  services?: ServiceOption[];
  onBookingSuccess?: () => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.getFullYear(), d.getMonth(), diff);
}
function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}
function addWeeks(d: Date, n: number): Date {
  return addDays(d, n * 7);
}
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}
function formatMonthYear(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}
function formatTimeSlot(t: string): string {
  const [h, m] = t.split(":").map(Number);
  if (h === 0) return `12:${String(m).padStart(2, "0")} am`;
  if (h < 12) return `${h}:${String(m).padStart(2, "0")} am`;
  if (h === 12) return `12:${String(m).padStart(2, "0")} pm`;
  return `${h - 12}:${String(m).padStart(2, "0")} pm`;
}
function parseEventTime(iso: string): { hour: number; minute: number } {
  const d = new Date(iso);
  return { hour: d.getHours(), minute: d.getMinutes() };
}
function parseEventDate(iso: string): Date {
  return new Date(iso);
}
function getDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function aptToEvent(a: { date: string; time: string; durationMinutes: number; service?: string }): CalendarEvent {
  const [h, m] = a.time.split(":").map(Number);
  const start = new Date(a.date + "T" + a.time);
  const end = new Date(start.getTime() + a.durationMinutes * 60 * 1000);
  return {
    title: a.service || "Appointment",
    start: start.toISOString(),
    end: end.toISOString(),
  };
}
function isEventInDay(event: CalendarEvent, day: Date): boolean {
  const start = parseEventDate(event.start);
  const end = parseEventDate(event.end);
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const dayEnd = addDays(dayStart, 1);
  return start < dayEnd && end > dayStart;
}
function isEventInWeekRange(event: CalendarEvent, weekStart: Date): boolean {
  const weekEnd = addDays(weekStart, 7);
  const start = parseEventDate(event.start);
  return start >= weekStart && start < weekEnd;
}
function getEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events.filter((e) => isEventInDay(e, day));
}
function getEventsForWeek(events: CalendarEvent[], weekStart: Date): CalendarEvent[] {
  return events.filter((e) => isEventInWeekRange(e, weekStart));
}

export default function BookingCalendar({
  isOpen,
  onClose,
  services = [],
  onBookingSuccess,
}: BookingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "list">("month");
  const [schedule, setSchedule] = useState<{
    defaultSchedule: Record<number, unknown>;
    overrides: Record<string, unknown>;
    slotDurationMinutes?: number;
  } | null>(null);
  const [appointments, setAppointments] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookingForm, setBookingForm] = useState({ customerName: "", customerEmail: "", customerPhone: "", service: "" });
  const [submitting, setSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState("");

  const isWorkingDay = useCallback((day: Date): boolean => {
    if (!schedule) return true;
    const key = getDateKey(day);
    const override = schedule.overrides[key];
    if (override !== undefined) return override !== null;
    const daySchedule = schedule.defaultSchedule[day.getDay()];
    return daySchedule !== null && daySchedule !== undefined;
  }, [schedule]);

  const fetchSchedule = useCallback(async () => {
    const res = await fetch("/api/schedule");
    if (res.ok) setSchedule(await res.json());
  }, []);

  const fetchAppointments = useCallback(async () => {
    const res = await fetch("/api/appointments");
    if (res.ok) {
      const data = await res.json();
      setAppointments(data.map(aptToEvent));
    }
  }, []);

  const fetchAvailability = useCallback(async (date: Date) => {
    const key = getDateKey(date);
    const res = await fetch(`/api/availability?date=${key}`);
    if (res.ok) {
      const data = await res.json();
      setAvailableSlots(data.slots || []);
    } else setAvailableSlots([]);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchSchedule();
      fetchAppointments();
    }
  }, [isOpen, fetchSchedule, fetchAppointments]);

  useEffect(() => {
    if (selectedDate && isWorkingDay(selectedDate)) {
      fetchAvailability(selectedDate);
    } else {
      setAvailableSlots([]);
      setSelectedSlot(null);
    }
  }, [selectedDate, isWorkingDay, fetchAvailability]);

  const handleDateSelect = useCallback((day: Date) => {
    if (!isWorkingDay(day)) return;
    setSelectedDate(day);
    setSelectedSlot(null);
    setBookingForm({
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      service: services[0]?.title ?? "",
    });
    setBookingSuccess(false);
    setBookingError("");
  }, [isWorkingDay, services]);

  const resetBooking = useCallback(() => {
    setSelectedDate(null);
    setSelectedSlot(null);
    setAvailableSlots([]);
    setBookingSuccess(false);
  }, []);

  const handleSubmitBooking = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedSlot) return;
    setSubmitting(true);
    setBookingError("");
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: getDateKey(selectedDate),
          time: selectedSlot,
          durationMinutes: schedule?.slotDurationMinutes ?? 60,
          service: bookingForm.service || undefined,
          customerName: bookingForm.customerName || undefined,
          customerEmail: bookingForm.customerEmail || undefined,
          customerPhone: bookingForm.customerPhone || undefined,
        }),
      });
      if (res.ok) {
        setBookingSuccess(true);
        fetchAppointments();
        onBookingSuccess?.();
      } else {
        const data = await res.json().catch(() => ({}));
        setBookingError(data.error || "Booking failed. Please try another slot.");
      }
    } finally {
      setSubmitting(false);
    }
  }, [selectedDate, selectedSlot, bookingForm, schedule, fetchAppointments, onBookingSuccess]);

  const monthGrid = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate));
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  const weekStart = useMemo(() => startOfWeek(currentDate), [currentDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const listEvents = useMemo(() => {
    const range: { date: Date; event: CalendarEvent }[] = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      getEventsForDay(appointments, day).forEach((event) => range.push({ date: day, event }));
    }
    return range.sort((a, b) => parseEventDate(a.event.start).getTime() - parseEventDate(b.event.start).getTime());
  }, [appointments, weekStart]);

  const weekEvents = useMemo(() => getEventsForWeek(appointments, weekStart), [appointments, weekStart]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-nearBlack/80 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-4 md:inset-8 lg:inset-16 z-[51] overflow-auto rounded-2xl border border-white/10 bg-nearBlack/95 backdrop-blur-xl p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-modal-title"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 id="booking-modal-title" className="font-serif text-2xl text-icyWhite">
                Book Your Experience
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-icyWhite/70 hover:text-icyWhite rounded-lg hover:bg-white/5 transition-colors"
                aria-label="Close booking modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <AnimatePresence mode="wait">
              {bookingSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-12 text-center"
                >
                  <p className="text-gold-glow text-xl font-serif mb-4">Booking confirmed!</p>
                  <p className="text-icyWhite/80 mb-6">
                    {selectedDate && selectedSlot && (
                      <>
                        {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at {formatTimeSlot(selectedSlot)}
                      </>
                    )}
                  </p>
                  <div className="flex gap-4 justify-center">
                    <button
                      type="button"
                      onClick={resetBooking}
                      className="px-4 py-2 rounded-lg bg-gold-soft/20 border border-gold-soft/40 text-gold-glow hover:bg-gold-soft/30"
                    >
                      Book another
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-lg border border-white/20 text-icyWhite hover:bg-white/5"
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              ) : selectedDate ? (
                <motion.div
                  key="booking"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <button
                    type="button"
                    onClick={resetBooking}
                    className="text-sm text-icyWhite/70 hover:text-icyWhite mb-4"
                  >
                    ← Back to calendar
                  </button>
                  <h3 className="font-serif text-lg text-gold-soft mb-4">
                    {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </h3>
                  {availableSlots.length === 0 ? (
                    <p className="text-icyWhite/60">No available slots for this day.</p>
                  ) : (
                    <form onSubmit={handleSubmitBooking} className="space-y-6">
                      <div>
                        <label className="block text-sm text-icyWhite/80 mb-2">Select time</label>
                        <div className="flex flex-wrap gap-2">
                          {availableSlots.map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setSelectedSlot(slot)}
                              className={clsx(
                                "px-4 py-2 rounded-lg text-sm transition-all",
                                selectedSlot === slot
                                  ? "bg-gold-soft/30 border border-gold-soft text-gold-glow"
                                  : "bg-white/5 border border-white/10 text-icyWhite/80 hover:border-gold-soft/40"
                              )}
                            >
                              {formatTimeSlot(slot)}
                            </button>
                          ))}
                        </div>
                      </div>
                      {selectedSlot && (
                        <>
                          {services.length > 0 && (
                            <div>
                              <label className="block text-sm text-icyWhite/80 mb-2">Service</label>
                              <select
                                value={bookingForm.service}
                                onChange={(e) => setBookingForm((f) => ({ ...f, service: e.target.value }))}
                                className="w-full max-w-sm bg-nearBlack border border-white/20 rounded-lg px-4 py-2 text-icyWhite"
                              >
                                {services.map((s) => (
                                  <option key={s.title} value={s.title}>{s.title}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          <div>
                            <label className="block text-sm text-icyWhite/80 mb-2">Name *</label>
                            <input
                              type="text"
                              required
                              value={bookingForm.customerName}
                              onChange={(e) => setBookingForm((f) => ({ ...f, customerName: e.target.value }))}
                              className="w-full max-w-sm bg-nearBlack border border-white/20 rounded-lg px-4 py-2 text-icyWhite"
                              placeholder="Your name"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-icyWhite/80 mb-2">Email *</label>
                            <input
                              type="email"
                              required
                              value={bookingForm.customerEmail}
                              onChange={(e) => setBookingForm((f) => ({ ...f, customerEmail: e.target.value }))}
                              className="w-full max-w-sm bg-nearBlack border border-white/20 rounded-lg px-4 py-2 text-icyWhite"
                              placeholder="your@email.com"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-icyWhite/80 mb-2">Phone</label>
                            <input
                              type="tel"
                              value={bookingForm.customerPhone}
                              onChange={(e) => setBookingForm((f) => ({ ...f, customerPhone: e.target.value }))}
                              className="w-full max-w-sm bg-nearBlack border border-white/20 rounded-lg px-4 py-2 text-icyWhite"
                              placeholder="Optional"
                            />
                          </div>
                          {bookingError && (
                            <p className="text-aurora-magenta text-sm">{bookingError}</p>
                          )}
                          <button
                            type="submit"
                            disabled={submitting}
                            className="px-6 py-3 rounded-lg bg-gold-soft/20 border border-gold-soft/50 text-gold-glow font-medium hover:bg-gold-soft/30 disabled:opacity-50"
                          >
                            {submitting ? "Booking..." : "Confirm booking"}
                          </button>
                        </>
                      )}
                    </form>
                  )}
                </motion.div>
              ) : (
                <motion.div key="calendar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentDate((d) => (view === "month" ? addDays(startOfMonth(d), -1) : addWeeks(d, -1)))}
                        className="px-4 py-2 rounded-lg bg-aurora-yellow/15 border border-gold-soft/40 text-icyWhite hover:bg-aurora-yellow/25 transition-all"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentDate(new Date())}
                        className="px-4 py-2 rounded-lg bg-aurora-yellow/15 border border-gold-soft/40 text-icyWhite hover:bg-aurora-yellow/25 transition-all"
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentDate((d) => (view === "month" ? addDays(endOfMonth(d), 1) : addWeeks(d, 1)))}
                        className="px-4 py-2 rounded-lg bg-aurora-yellow/15 border border-gold-soft/40 text-icyWhite hover:bg-aurora-yellow/25 transition-all"
                      >
                        Next
                      </button>
                    </div>
                    <h3 className="font-serif text-xl text-icyWhite min-w-[200px] text-center">
                      {view === "month"
                        ? formatMonthYear(currentDate)
                        : `${weekDays[0].toLocaleDateString()} – ${weekDays[6].toLocaleDateString()}`}
                    </h3>
                    <div className="flex items-center gap-1">
                      {(["month", "week", "list"] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setView(v)}
                          className={clsx(
                            "px-3 py-1.5 rounded-lg text-sm capitalize transition-all",
                            view === v
                              ? "bg-aurora-yellow/35 border border-gold-soft/70 text-icyWhite"
                              : "bg-aurora-yellow/15 border border-gold-soft/40 text-icyWhite/80 hover:bg-aurora-yellow/25"
                          )}
                        >
                          {v === "month" ? "Month" : v === "week" ? "Week" : "List"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="min-h-[400px] rounded-xl overflow-hidden border border-white/8 backdrop-blur-xl bg-nearBlack/60 shadow-card">
                    <AnimatePresence mode="wait">
                      {view === "month" && (
                        <motion.div key="month" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4">
                          <div className="grid grid-cols-7 gap-px bg-white/6 rounded-lg overflow-hidden">
                            {WEEKDAYS.map((day) => (
                              <div key={day} className="bg-nearBlack/80 py-2 px-2 text-center text-sm text-icyWhite/80 font-medium">
                                {day}
                              </div>
                            ))}
                            {monthGrid.map((day) => {
                              const dayEvents = getEventsForDay(appointments, day);
                              const inMonth = day.getMonth() === currentDate.getMonth();
                              const working = isWorkingDay(day);
                              return (
                                <div
                                  key={day.toISOString()}
                                  className={clsx("min-h-[80px] p-2 bg-nearBlack/60 flex flex-col", !inMonth && "opacity-40")}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleDateSelect(day)}
                                    disabled={!working}
                                    className={clsx(
                                      "w-8 h-8 rounded-lg text-sm font-medium transition-colors self-start",
                                      !working && "opacity-50 cursor-not-allowed text-icyWhite/50",
                                      working && isToday(day) && "bg-aurora-yellow/20 text-gold-glow",
                                      working && !isToday(day) && "text-icyWhite/70 hover:bg-white/10 hover:text-icyWhite"
                                    )}
                                  >
                                    {day.getDate()}
                                  </button>
                                  <div className="mt-1 space-y-0.5 overflow-hidden">
                                    {dayEvents.slice(0, 3).map((evt) => (
                                      <div
                                        key={evt.start + evt.title}
                                        className="w-full text-left text-xs px-2 py-1 rounded bg-aurora-magenta/30 border border-aurora-magenta/50 truncate"
                                      >
                                        {evt.title}
                                      </div>
                                    ))}
                                    {dayEvents.length > 3 && (
                                      <span className="text-xs text-icyWhite/60 px-2">+{dayEvents.length - 3}</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}

                      {view === "week" && (
                        <motion.div key="week" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="overflow-x-auto">
                          <div className="grid grid-cols-8 min-w-[700px]">
                            <div className="border-r border-white/6 bg-nearBlack/80" />
                            {weekDays.map((d) => (
                              <div
                                key={d.toISOString()}
                                className={clsx(
                                  "border-r border-white/6 py-2 text-center text-sm",
                                  isToday(d) ? "bg-aurora-yellow/10 text-gold-glow" : "text-icyWhite/80"
                                )}
                              >
                                {d.toLocaleDateString("en-US", { weekday: "short" })}
                                <br />
                                <span className="font-medium">{d.getDate()}</span>
                              </div>
                            ))}
                            {HOURS.map((hour) => (
                              <Fragment key={hour}>
                                <div className="border-r border-t border-white/6 py-1 pr-2 text-right text-xs text-icyWhite/60">
                                  {hour === 0 ? "12 am" : hour < 12 ? `${hour} am` : hour === 12 ? "12 pm" : `${hour - 12} pm`}
                                </div>
                                {weekDays.map((day) => {
                                  const cellStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0);
                                  const cellEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour + 1, 0);
                                  const cellEvents = weekEvents.filter((e) => {
                                    const start = parseEventDate(e.start);
                                    return isSameDay(start, day) && start >= cellStart && start < cellEnd;
                                  });
                                  return (
                                    <div key={`${day.toISOString()}-${hour}`} className="border-r border-t border-white/6 min-h-[48px] p-1">
                                      {cellEvents.map((evt) => (
                                        <div
                                          key={evt.start + evt.title}
                                          className="w-full text-left text-xs px-2 py-1 rounded bg-aurora-magenta/30 border border-aurora-magenta/50 truncate"
                                        >
                                          {evt.title}
                                          <br />
                                          <span className="text-icyWhite/70">
                                            {formatTime(evt.start)} – {formatTime(evt.end)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })}
                              </Fragment>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {view === "list" && (
                        <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4">
                          <div className="space-y-2">
                            {listEvents.length === 0 ? (
                              <p className="text-icyWhite/60 text-center py-8">No appointments this week</p>
                            ) : (
                              listEvents.map(({ date, event }) => (
                                <div
                                  key={event.start + event.title}
                                  className="w-full flex items-center gap-4 p-4 rounded-lg bg-nearBlack/80 border border-white/8"
                                >
                                  <div className="flex flex-col items-center min-w-[60px] text-gold-glow">
                                    <span className="text-lg font-serif">{date.getDate()}</span>
                                    <span className="text-xs text-icyWhite/70">
                                      {date.toLocaleDateString("en-US", { weekday: "short" })}
                                    </span>
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-icyWhite">{event.title}</div>
                                    <div className="text-sm text-icyWhite/70">
                                      {formatTime(event.start)} – {formatTime(event.end)}
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
