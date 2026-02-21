"use client";

import { useCallback, useMemo, useState, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

export interface CalendarEvent {
  title: string;
  start: string;
  end: string;
}

interface BookingCalendarProps {
  isOpen: boolean;
  onClose: () => void;
  events?: CalendarEvent[];
  onDateSelect?: (start: Date, end: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Date helpers
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
function parseEventTime(iso: string): { hour: number; minute: number } {
  const d = new Date(iso);
  return { hour: d.getHours(), minute: d.getMinutes() };
}
function parseEventDate(iso: string): Date {
  return new Date(iso);
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

const MOCK_EVENTS: CalendarEvent[] = [
  { title: "Swedish Massage", start: "2025-02-22T10:00:00", end: "2025-02-22T11:00:00" },
  { title: "Deep Tissue", start: "2025-02-22T14:00:00", end: "2025-02-22T15:30:00" },
  { title: "Hot Stone", start: "2025-02-23T09:00:00", end: "2025-02-23T10:30:00" },
];

export default function BookingCalendar({
  isOpen,
  onClose,
  events = MOCK_EVENTS,
  onDateSelect,
  onEventClick,
}: BookingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "list">("month");

  const handlePrev = useCallback(() => {
    setCurrentDate((d) => (view === "month" ? addDays(startOfMonth(d), -1) : addWeeks(d, -1)));
  }, [view]);

  const handleNext = useCallback(() => {
    setCurrentDate((d) => (view === "month" ? addDays(endOfMonth(d), 1) : addWeeks(d, 1)));
  }, [view]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleDateSelect = useCallback(
    (start: Date, end?: Date) => {
      onDateSelect?.(start, end ?? addDays(start, 1));
    },
    [onDateSelect]
  );

  // Month grid: 6 weeks × 7 days
  const monthGrid = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate));
    const grid: Date[] = [];
    for (let i = 0; i < 42; i++) {
      grid.push(addDays(start, i));
    }
    return grid;
  }, [currentDate]);

  const weekStart = useMemo(() => startOfWeek(currentDate), [currentDate]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const listEvents = useMemo(() => {
    const start = startOfWeek(currentDate);
    const rangeEvents: { date: Date; event: CalendarEvent }[] = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(start, i);
      getEventsForDay(events, day).forEach((event) => {
        rangeEvents.push({ date: day, event });
      });
    }
    return rangeEvents.sort(
      (a, b) => parseEventDate(a.event.start).getTime() - parseEventDate(b.event.start).getTime()
    );
  }, [currentDate, events]);

  const weekEvents = useMemo(() => getEventsForWeek(events, weekStart), [events, weekStart]);

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

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-4 py-2 rounded-lg bg-aurora-yellow/15 border border-gold-soft/40 text-icyWhite hover:bg-aurora-yellow/25 hover:border-gold-soft/60 transition-all"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={handleToday}
                  className="px-4 py-2 rounded-lg bg-aurora-yellow/15 border border-gold-soft/40 text-icyWhite hover:bg-aurora-yellow/25 hover:border-gold-soft/60 transition-all"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-4 py-2 rounded-lg bg-aurora-yellow/15 border border-gold-soft/40 text-icyWhite hover:bg-aurora-yellow/25 hover:border-gold-soft/60 transition-all"
                >
                  Next
                </button>
              </div>
              <h3 className="font-serif text-xl text-icyWhite min-w-[200px] text-center">
                {view === "month" ? formatMonthYear(currentDate) : `${weekDays[0].toLocaleDateString()} – ${weekDays[6].toLocaleDateString()}`}
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

            {/* Calendar */}
            <div className="min-h-[400px] rounded-xl overflow-hidden border border-white/8 backdrop-blur-xl bg-nearBlack/60 shadow-card">
              <AnimatePresence mode="wait">
                {view === "month" && (
                  <motion.div
                    key="month"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-4"
                  >
                    <div className="grid grid-cols-7 gap-px bg-white/6 rounded-lg overflow-hidden">
                      {WEEKDAYS.map((day) => (
                        <div
                          key={day}
                          className="bg-nearBlack/80 py-2 px-2 text-center text-sm text-icyWhite/80 font-medium"
                        >
                          {day}
                        </div>
                      ))}
                      {monthGrid.map((day) => {
                        const dayEvents = getEventsForDay(events, day);
                        const inMonth = day.getMonth() === currentDate.getMonth();
                        return (
                          <div
                            key={day.toISOString()}
                            className={clsx(
                              "min-h-[80px] p-2 bg-nearBlack/60 flex flex-col",
                              !inMonth && "opacity-40"
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => handleDateSelect(day)}
                              className={clsx(
                                "w-8 h-8 rounded-lg text-sm font-medium transition-colors self-start",
                                isToday(day)
                                  ? "bg-aurora-yellow/20 text-gold-glow"
                                  : "text-icyWhite/70 hover:bg-white/10 hover:text-icyWhite"
                              )}
                            >
                              {day.getDate()}
                            </button>
                            <div className="mt-1 space-y-0.5 overflow-hidden">
                              {dayEvents.slice(0, 3).map((evt) => (
                                <button
                                  key={evt.start + evt.title}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEventClick?.(evt);
                                  }}
                                  className="w-full text-left text-xs px-2 py-1 rounded bg-aurora-magenta/30 border border-aurora-magenta/50 truncate hover:bg-aurora-magenta/40 transition-colors"
                                >
                                  {evt.title}
                                </button>
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
                  <motion.div
                    key="week"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="overflow-x-auto"
                  >
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
                          <div
                            className="border-r border-t border-white/6 py-1 pr-2 text-right text-xs text-icyWhite/60"
                          >
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
                              <div
                                key={`${day.toISOString()}-${hour}`}
                                className="border-r border-t border-white/6 min-h-[48px] p-1"
                              >
                                {cellEvents.map((evt) => {
                                  const { hour: eh, minute: em } = parseEventTime(evt.start);
                                  const { hour: endH, minute: endM } = parseEventTime(evt.end);
                                  const duration = (endH - eh) * 60 + (endM - em);
                                  return (
                                    <button
                                      key={evt.start + evt.title}
                                      type="button"
                                      onClick={() => onEventClick?.(evt)}
                                      className="w-full text-left text-xs px-2 py-1 rounded bg-aurora-magenta/30 border border-aurora-magenta/50 truncate hover:bg-aurora-magenta/40 transition-colors"
                                      style={{ minHeight: `${Math.max(duration / 2, 24)}px` }}
                                    >
                                      {evt.title}
                                      <br />
                                      <span className="text-icyWhite/70">
                                        {formatTime(evt.start)} – {formatTime(evt.end)}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </Fragment>
                      ))}
                    </div>
                  </motion.div>
                )}

                {view === "list" && (
                  <motion.div
                    key="list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-4"
                  >
                    <div className="space-y-2">
                      {listEvents.length === 0 ? (
                        <p className="text-icyWhite/60 text-center py-8">No events this week</p>
                      ) : (
                        listEvents.map(({ date, event }) => (
                          <button
                            key={event.start + event.title}
                            type="button"
                            onClick={() => onEventClick?.(event)}
                            className="w-full flex items-center gap-4 p-4 rounded-lg bg-nearBlack/80 border border-white/8 hover:bg-white/5 hover:border-gold-soft/30 transition-all text-left"
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
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
