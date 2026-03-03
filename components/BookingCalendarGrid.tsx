"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import { clsx as cn } from "clsx";
import { db } from "@/lib/firebase";
import { getSchedule } from "@/lib/schedule-firestore";
import {
  updateAppointmentTime,
  deleteAppointment,
  type AppointmentData,
} from "@/lib/book-appointment";
import type { ServiceData } from "@/lib/services";
import type { Place } from "@/lib/places";
import { formatDateForEmail, formatTimeForEmail } from "@/lib/format-date";
import DroppableCell, { makeCellId, cellIdToTimestamp } from "./DroppableCell";
import { getPrepBufferMinutes } from "@/lib/availability-firestore";
import DraggableAppointment from "./DraggableAppointment";

/** Standard collision: pointer, then rect, then closest center */
const calendarCollisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) return pointerHits;
  const rectHits = rectIntersection(args);
  if (rectHits.length > 0) return rectHits;
  return closestCenter(args);
};

const SLOT_START_HOUR = 8;
const SLOT_END_HOUR = 20;
// 15-min grid resolution in admin (4 slots per hour, Google Calendar style)
const SLOT_INTERVAL = 15;
const HOUR_SLOTS = Array.from(
  { length: SLOT_END_HOUR - SLOT_START_HOUR },
  (_, i) => SLOT_START_HOUR + i
);

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

function isToday(d: Date): boolean {
  const t = new Date();
  return (
    d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate()
  );
}

function isAppointmentPast(apt: AppointmentData): boolean {
  const end = apt.endTime && "toDate" in apt.endTime ? apt.endTime.toDate() : new Date(apt.endTime as Date);
  return end.getTime() < Date.now();
}

function isCellPast(day: Date, hour: number, minute: number): boolean {
  const d = new Date(day);
  d.setHours(hour, minute, 0, 0);
  return d.getTime() < Date.now();
}

function isDayPast(day: Date): boolean {
  const endOfDay = new Date(day);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay.getTime() < Date.now();
}

function formatTime(hour: number, minute: number): string {
  if (hour === 0) return `12:${String(minute).padStart(2, "0")} am`;
  if (hour < 12) return `${hour}:${String(minute).padStart(2, "0")} am`;
  if (hour === 12) return `12:${String(minute).padStart(2, "0")} pm`;
  return `${hour - 12}:${String(minute).padStart(2, "0")} pm`;
}

function toAppointmentData(doc: { id: string; data: () => Record<string, unknown> }): AppointmentData {
  const d = doc.data();
  return {
    id: doc.id,
    startTime: (d.startTime as Timestamp) ?? new Date(),
    endTime: (d.endTime as Timestamp) ?? new Date(),
    service: (d.service as string) ?? "",
    fullName: (d.fullName as string) ?? "",
    email: (d.email as string) ?? "",
    phone: (d.phone as string) ?? "",
    place: (d.place as Place) ?? "massage",
    createdAt: d.createdAt as Timestamp | undefined,
  };
}

function getAppointmentDuration(apt: AppointmentData): number {
  const start = apt.startTime && "toDate" in apt.startTime ? apt.startTime.toDate() : new Date(apt.startTime as Date);
  const end = apt.endTime && "toDate" in apt.endTime ? apt.endTime.toDate() : new Date(apt.endTime as Date);
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

function getAppointmentSlot(apt: AppointmentData): { date: Date; hour: number; minute: number } {
  const start = apt.startTime && "toDate" in apt.startTime ? apt.startTime.toDate() : new Date(apt.startTime as Date);
  return {
    date: start,
    hour: start.getHours(),
    minute: start.getMinutes(),
  };
}


interface BookingCalendarGridProps {
  weekStart?: Date;
  onCellClick?: (date: Date, hour: number, minute: number) => void;
  onEditAppointment?: (appointment: AppointmentData) => void;
  allowCancel?: boolean;
  allowDrag?: boolean;
  services?: ServiceData[];
  place?: Place;
}

export default function BookingCalendarGrid({
  weekStart: weekStartProp,
  onCellClick,
  onEditAppointment,
  allowCancel = false,
  allowDrag = false,
  services = [],
  place = "massage",
}: BookingCalendarGridProps) {
  const locale = useLocale();
  const t = useTranslations("admin");
  const [view, setView] = useState<"day" | "week">("week");
  const [weekStart, setWeekStart] = useState(() =>
    weekStartProp ? startOfWeek(weekStartProp) : startOfWeek(new Date())
  );
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [schedule, setSchedule] = useState<Awaited<ReturnType<typeof getSchedule>> | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{
    appointment: AppointmentData;
    newCellId: string;
  } | null>(null);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const displayDays = view === "day" ? [selectedDay] : weekDays;

  useEffect(() => {
    getSchedule(place).then(setSchedule).catch(() => setSchedule(null));
  }, [place]);

  useEffect(() => {
    const dayStart = new Date(view === "day" ? selectedDay : weekStart);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = addDays(view === "day" ? selectedDay : weekStart, view === "day" ? 1 : 7);
    dayEnd.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, "appointments"),
      where("place", "==", place),
      where("startTime", ">=", dayStart),
      where("startTime", "<", dayEnd)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) =>
        toAppointmentData({ id: doc.id, data: () => doc.data() })
      );
      setAppointments(list);
    });

    return () => unsubscribe();
  }, [weekStart, selectedDay, view, place]);

  const prepBuffer = getPrepBufferMinutes(schedule);

  const { appointmentsByCell, cellsOccupiedBy } = useMemo(() => {
    const byCell = new Map<string, AppointmentData>();
    const occupied = new Set<string>();
    const snapMinute = (m: number) => {
      const snapped = Math.round(m / 15) * 15;
      if (snapped >= 60) return 45;
      if (snapped < 0) return 0;
      return snapped;
    };
    for (const apt of appointments) {
      const start = apt.startTime && "toDate" in apt.startTime ? apt.startTime.toDate() : new Date(apt.startTime as Date);
      const end = apt.endTime && "toDate" in apt.endTime ? apt.endTime.toDate() : new Date(apt.endTime as Date);
      const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
      const blockedMinutes = durationMinutes + prepBuffer;
      const h = start.getHours();
      const m = start.getMinutes();
      const snappedMin = snapMinute(m);
      const startCellId = makeCellId(start, h, snappedMin);
      byCell.set(startCellId, apt);
      let slotStart = new Date(start);
      slotStart.setMinutes(snappedMin, 0, 0);
      const blockEnd = new Date(start.getTime() + blockedMinutes * 60 * 1000);
      while (slotStart.getTime() < blockEnd.getTime()) {
        const cid = makeCellId(slotStart, slotStart.getHours(), slotStart.getMinutes());
        occupied.add(cid);
        slotStart = new Date(slotStart.getTime() + SLOT_INTERVAL * 60 * 1000);
      }
    }
    return { appointmentsByCell: byCell, cellsOccupiedBy: occupied };
  }, [appointments, prepBuffer]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      if (!allowDrag) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const appointmentId = active.id as string;
      const cellId = String(over.id);
      // Must be a valid cell ID (YYYYMMDD-HHmm) - ignore if dropped on non-cell
      if (!/^\d{8}-\d{4}$/.test(cellId)) return;

      const appointment = appointments.find((a) => a.id === appointmentId);
      if (!appointment) return;

      const oldStart =
        appointment.startTime && "toDate" in appointment.startTime
          ? appointment.startTime.toDate()
          : new Date(appointment.startTime as Date);
      const newStart = cellIdToTimestamp(cellId);
      const oldCellId = makeCellId(oldStart, oldStart.getHours(), oldStart.getMinutes());
      if (cellId === oldCellId) return; // Same slot, no change

      // Block drop on occupied slots (other appointment or buffer) - don't open modal
      if (cellsOccupiedBy.has(cellId)) {
        const aptEnd = new Date(oldStart.getTime() + getAppointmentDuration(appointment) * 60 * 1000);
        const cellTime = newStart.getTime();
        const isOwnBody = cellTime >= oldStart.getTime() && cellTime < aptEnd.getTime();
        if (!isOwnBody) return;
      }

      if (newStart.getTime() < Date.now()) {
        toast.error(t("cannotMovePast"));
        return;
      }

      setPendingMove({ appointment, newCellId: cellId });
    },
    [appointments, allowDrag, cellsOccupiedBy, t]
  );

  const handleConfirmMove = useCallback(async () => {
    if (!pendingMove) return;
    const { appointment, newCellId } = pendingMove;
    setPendingMove(null);
    const newStart = cellIdToTimestamp(newCellId);
    if (newStart.getTime() < Date.now()) {
      toast.error(t("cannotMovePast"));
      return;
    }

    const oldStart =
      appointment.startTime && "toDate" in appointment.startTime
        ? appointment.startTime.toDate()
        : new Date(appointment.startTime as Date);

    try {
      const durationMinutes = getAppointmentDuration(appointment);
      await updateAppointmentTime(appointment.id, newStart, durationMinutes);

      try {
        await fetch("/api/send-confirmation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "rescheduled",
            to: appointment.email,
            customerName: appointment.fullName,
            service: appointment.service,
            oldDate: formatDateForEmail(oldStart),
            oldTime: formatTimeForEmail(oldStart),
            newDate: formatDateForEmail(newStart),
            newTime: formatTimeForEmail(newStart),
          }),
        });
      } catch {
        /* email failure */
      }
      toast.success(t("movedNotified"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const message =
        msg === "OVERLAP"
          ? t("slotBooked")
          : msg === "APPOINTMENT_NOT_FOUND"
            ? t("notFound")
            : t("moveFailed", { msg: String(msg) });
      toast.error(message);
    }
  }, [pendingMove, t]);

  const handleCancelMove = useCallback(() => {
    setPendingMove(null);
  }, []);

  const [pendingCancel, setPendingCancel] = useState<AppointmentData | null>(null);

  const handleCancelAppointment = useCallback((appointment: AppointmentData) => {
    setPendingCancel(appointment);
  }, []);

  const handleConfirmCancel = useCallback(async () => {
    if (!pendingCancel) return;
    const appointment = pendingCancel;
    setPendingCancel(null);

    const start =
      appointment.startTime && "toDate" in appointment.startTime
        ? appointment.startTime.toDate()
        : new Date(appointment.startTime as Date);

    try {
      await deleteAppointment(appointment.id);
      try {
        await fetch("/api/send-confirmation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "cancelled",
            to: appointment.email,
            customerName: appointment.fullName,
            date: formatDateForEmail(start),
            time: formatTimeForEmail(start),
            service: appointment.service,
          }),
        });
      } catch {
        /* email failure */
      }
      toast.success(t("cancelledNotified"));
    } catch (err) {
      toast.error(t("cancelFailed"));
    }
  }, [pendingCancel, t]);

  const handleDismissCancel = useCallback(() => setPendingCancel(null), []);

  const activeAppointment = activeId ? appointments.find((a) => a.id === activeId) : null;

  return (
    <div className="rounded-xl border border-white/10 bg-nearBlack/80 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <div className="flex gap-1 mr-2">
            <button
              type="button"
              onClick={() => {
                setView("day");
                if (view === "week") {
                  setSelectedDay(weekDays[0]);
                }
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm transition-colors",
                view === "day"
                  ? "bg-gold-soft/25 border border-gold-soft/50 text-gold-glow"
                  : "bg-white/5 border border-white/10 text-icyWhite hover:bg-white/10"
              )}
            >
              Day
            </button>
            <button
              type="button"
              onClick={() => {
                setView("week");
                setWeekStart(startOfWeek(selectedDay));
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm transition-colors",
                view === "week"
                  ? "bg-gold-soft/25 border border-gold-soft/50 text-gold-glow"
                  : "bg-white/5 border border-white/10 text-icyWhite hover:bg-white/10"
              )}
            >
              Week
            </button>
          </div>
          {view === "day" ? (
            <>
              <button
                type="button"
                onClick={() => setSelectedDay((d) => addDays(d, -1))}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-icyWhite hover:bg-white/10 text-sm"
              >
                ← Previous day
              </button>
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  setSelectedDay(today);
                }}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-icyWhite hover:bg-white/10 text-sm"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setSelectedDay((d) => addDays(d, 1))}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-icyWhite hover:bg-white/10 text-sm"
              >
                Next day →
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setWeekStart((d) => addDays(d, -7))}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-icyWhite hover:bg-white/10 text-sm"
              >
                ← Previous week
              </button>
              <button
                type="button"
                onClick={() => setWeekStart(startOfWeek(new Date()))}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-icyWhite hover:bg-white/10 text-sm"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setWeekStart((d) => addDays(d, 7))}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-icyWhite hover:bg-white/10 text-sm"
              >
                Next week →
              </button>
            </>
          )}
        </div>
        <h2 className="font-serif text-lg text-icyWhite">
          {view === "day"
            ? selectedDay.toLocaleDateString(locale, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })
            : `${weekDays[0].toLocaleDateString(locale, { month: "short" })} ${weekDays[0].getDate()} – ${weekDays[6].toLocaleDateString(locale, { month: "short" })} ${weekDays[6].getDate()}, ${weekStart.getFullYear()}`}
        </h2>
      </div>

      {/* Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={calendarCollisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `80px repeat(${displayDays.length}, 1fr)`,
              gridTemplateRows: `auto repeat(${HOUR_SLOTS.length}, minmax(56px, auto))`,
              minWidth: view === "day" ? 280 : 900,
            }}
          >
            {/* Corner + Day headers */}
            <div className="border-b border-r border-white/10 bg-nearBlack/90 p-2" />
            {displayDays.map((day) => {
              const past = isDayPast(day);
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "border-b border-r border-white/10 p-2 text-center",
                    past ? "bg-white/5 text-icyWhite/40" : isToday(day) ? "bg-gold-soft/20 text-gold-glow" : "bg-nearBlack/90"
                  )}
                >
                  <div className={cn("text-xs", past ? "text-icyWhite/40" : isToday(day) ? "text-gold-soft/90" : "text-icyWhite/60")}>
                    {day.toLocaleDateString(locale, { weekday: "short" })}
                  </div>
                  <div className={cn("font-medium", past ? "text-icyWhite/50" : isToday(day) ? "text-gold-glow" : "text-icyWhite")}>{day.getDate()}</div>
                </div>
              );
            })}

            {/* Hourly rows: 8:00, 9:00, ..., 19:00 */}
            {HOUR_SLOTS.map((hour) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const slotPastForToday = isCellPast(today, hour, 0);
              return (
                <Fragment key={hour}>
                  <div
                    className={cn(
                      "border-b border-r border-white/10 py-2 pr-2 text-right text-sm font-medium min-h-[56px] flex items-center justify-end",
                      slotPastForToday ? "text-icyWhite/35" : "text-icyWhite/70"
                    )}
                  >
                    {formatTime(hour, 0)}
                  </div>
                  {displayDays.map((day) => (
                    <div
                      key={`${day.toISOString()}-${hour}`}
                      className="min-h-[56px] flex flex-col"
                    >
                      {([0, 15, 30, 45] as const).map((minute) => {
                        const cellId = makeCellId(day, hour, minute);
                        const appointment = appointmentsByCell.get(cellId);
                        const isOccupied = cellsOccupiedBy.has(cellId);
                        return (
                          <DroppableCell
                            key={cellId}
                            id={cellId}
                            canDrop={((!isOccupied || !!appointment) && !isCellPast(day, hour, minute))}
                            isPast={isCellPast(day, hour, minute)}
                            compact
                          >
                            <div
                              className="relative w-full h-full min-h-[10px]"
                              onClick={() => !isOccupied && onCellClick?.(day, hour, minute)}
                            >
                              {appointment ? (
                                <DraggableAppointment
                                  appointment={appointment}
                                  disabled={!allowDrag || !!activeId || isAppointmentPast(appointment)}
                                  isPast={isAppointmentPast(appointment)}
                                  onEdit={
                                    allowCancel && !isAppointmentPast(appointment)
                                      ? () => onEditAppointment?.(appointment)
                                      : undefined
                                  }
                                  onCancel={
                                    allowCancel && !isAppointmentPast(appointment)
                                      ? () => handleCancelAppointment(appointment)
                                      : undefined
                                  }
                                  services={services}
                                />
                              ) : null}
                            </div>
                          </DroppableCell>
                        );
                      })}
                    </div>
                  ))}
                </Fragment>
              );
            })}
          </div>
        </div>

        <DragOverlay>
          {activeAppointment ? (
            <div className="opacity-90 pointer-events-none">
              <DraggableAppointment
                appointment={activeAppointment}
                disabled
                onEdit={undefined}
                onCancel={undefined}
                services={services}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Move confirmation modal */}
      {pendingMove && allowDrag && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-nearBlack/80 backdrop-blur-sm"
            onClick={handleCancelMove}
            aria-hidden
          />
          <div
            className="fixed left-1/2 top-1/2 z-[61] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-nearBlack p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif text-lg text-icyWhite mb-2">Reschedule appointment?</h3>
            <p className="text-sm text-icyWhite/70 mb-4">
              Move <strong>{pendingMove.appointment.fullName}</strong> (
              {pendingMove.appointment.service}) to{" "}
              {formatDateForEmail(cellIdToTimestamp(pendingMove.newCellId))} at{" "}
              {formatTimeForEmail(cellIdToTimestamp(pendingMove.newCellId))}?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCancelMove}
                className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-icyWhite hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMove}
                className="flex-1 rounded-lg bg-gold-soft/20 text-gold-soft px-4 py-2 text-sm font-medium hover:bg-gold-soft/30"
              >
                Confirm move
              </button>
            </div>
          </div>
        </>
      )}

      {/* Cancel confirmation modal */}
      {pendingCancel && allowCancel && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-nearBlack/80 backdrop-blur-sm"
            onClick={handleDismissCancel}
            aria-hidden
          />
          <div
            className="fixed left-1/2 top-1/2 z-[61] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-nearBlack p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif text-lg text-icyWhite mb-2">Cancel appointment?</h3>
            <p className="text-sm text-icyWhite/70 mb-4">
              Cancel the appointment for <strong>{pendingCancel.fullName}</strong> (
              {pendingCancel.service})? The customer will receive an email notification.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDismissCancel}
                className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-icyWhite hover:bg-white/10"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="flex-1 rounded-lg bg-red-500/20 text-red-400 px-4 py-2 text-sm font-medium hover:bg-red-500/30"
              >
                Yes, cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
