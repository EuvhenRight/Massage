"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import { clsx as cn } from "clsx";
import { db } from "@/lib/firebase";
import {
  updateAppointmentTime,
  deleteAppointment,
  type AppointmentData,
} from "@/lib/book-appointment";
import DroppableCell, { makeCellId, cellIdToTimestamp } from "./DroppableCell";
import DraggableAppointment from "./DraggableAppointment";

const SLOT_START_HOUR = 8;
const SLOT_END_HOUR = 20;
const SLOT_INTERVAL = 30;
const TIME_SLOTS = (() => {
  const slots: { hour: number; minute: number }[] = [];
  for (let h = SLOT_START_HOUR; h < SLOT_END_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_INTERVAL) {
      slots.push({ hour: h, minute: m });
    }
  }
  return slots;
})();

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

function formatDateForEmail(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeForEmail(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

interface BookingCalendarGridProps {
  weekStart?: Date;
  onCellClick?: (date: Date, hour: number, minute: number) => void;
  onEditAppointment?: (appointment: AppointmentData) => void;
  allowCancel?: boolean;
  allowDrag?: boolean;
}

export default function BookingCalendarGrid({
  weekStart: weekStartProp,
  onCellClick,
  onEditAppointment,
  allowCancel = false,
  allowDrag = false,
}: BookingCalendarGridProps) {
  const [weekStart, setWeekStart] = useState(() =>
    weekStartProp ? startOfWeek(weekStartProp) : startOfWeek(new Date())
  );
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{
    appointment: AppointmentData;
    newCellId: string;
  } | null>(null);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  useEffect(() => {
    const dayStart = new Date(weekStart);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = addDays(weekStart, 7);
    dayEnd.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, "appointments"),
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
  }, [weekStart]);

  const { appointmentsByCell, cellsOccupiedBy } = useMemo(() => {
    const byCell = new Map<string, AppointmentData>();
    const occupied = new Set<string>();
    for (const apt of appointments) {
      const start = apt.startTime && "toDate" in apt.startTime ? apt.startTime.toDate() : new Date(apt.startTime as Date);
      const end = apt.endTime && "toDate" in apt.endTime ? apt.endTime.toDate() : new Date(apt.endTime as Date);
      const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
      const startCellId = makeCellId(start, start.getHours(), start.getMinutes());
      byCell.set(startCellId, apt);
      occupied.add(startCellId);
      let mins = SLOT_INTERVAL;
      while (mins < durationMinutes) {
        const t = new Date(start.getTime() + mins * 60 * 1000);
        const cid = makeCellId(t, t.getHours(), t.getMinutes());
        occupied.add(cid);
        mins += SLOT_INTERVAL;
      }
    }
    return { appointmentsByCell: byCell, cellsOccupiedBy: occupied };
  }, [appointments]);

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
      const cellId = over.id as string;

      const appointment = appointments.find((a) => a.id === appointmentId);
      if (!appointment) return;

      const oldStart =
        appointment.startTime && "toDate" in appointment.startTime
          ? appointment.startTime.toDate()
          : new Date(appointment.startTime as Date);
      const newStart = cellIdToTimestamp(cellId);
      const oldCellId = makeCellId(oldStart, oldStart.getHours(), oldStart.getMinutes());
      if (cellId === oldCellId) return; // Same slot, no change

      setPendingMove({ appointment, newCellId: cellId });
    },
    [appointments, allowDrag]
  );

  const handleConfirmMove = useCallback(async () => {
    if (!pendingMove) return;
    const { appointment, newCellId } = pendingMove;
    setPendingMove(null);

    const oldStart =
      appointment.startTime && "toDate" in appointment.startTime
        ? appointment.startTime.toDate()
        : new Date(appointment.startTime as Date);
    const newStart = cellIdToTimestamp(newCellId);

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
      toast.success("Appointment moved. Customer notified by email.");
    } catch (err) {
      const message =
        err instanceof Error && err.message === "OVERLAP"
          ? "This time slot is already booked."
          : "Failed to move appointment.";
      toast.error(message);
    }
  }, [pendingMove]);

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
      toast.success("Appointment cancelled. Customer notified by email.");
    } catch (err) {
      toast.error("Failed to cancel appointment.");
    }
  }, [pendingCancel]);

  const handleDismissCancel = useCallback(() => setPendingCancel(null), []);

  const activeAppointment = activeId ? appointments.find((a) => a.id === activeId) : null;

  return (
    <div className="rounded-xl border border-white/10 bg-nearBlack/80 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex gap-2">
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
        </div>
        <h2 className="font-serif text-lg text-icyWhite">
          {weekDays[0].toLocaleDateString("en-US", { month: "short" })} {weekDays[0].getDate()} –{" "}
          {weekDays[6].toLocaleDateString("en-US", { month: "short" })} {weekDays[6].getDate()},{" "}
          {weekStart.getFullYear()}
        </h2>
      </div>

      {/* Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto">
          <div
            className="grid min-w-[900px]"
            style={{ gridTemplateColumns: `80px repeat(7, 1fr)` }}
          >
            {/* Corner + Day headers */}
            <div className="border-b border-r border-white/10 bg-nearBlack/90 p-2" />
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className="border-b border-r border-white/10 bg-nearBlack/90 p-2 text-center"
              >
                <div className="text-xs text-icyWhite/60">
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                </div>
                <div className="font-medium text-icyWhite">{day.getDate()}</div>
              </div>
            ))}

            {/* Time slots + cells */}
            {TIME_SLOTS.map(({ hour, minute }) => (
              <Fragment key={`${hour}-${minute}`}>
                <div
                  key={`label-${hour}-${minute}`}
                  className="border-b border-r border-white/10 py-1 pr-2 text-right text-xs text-icyWhite/60"
                >
                  {formatTime(hour, minute)}
                </div>
                {weekDays.map((day) => {
                  const cellId = makeCellId(day, hour, minute);
                  const appointment = appointmentsByCell.get(cellId);
                  const isOccupied = cellsOccupiedBy.has(cellId);

                  return (
                    <DroppableCell key={cellId} id={cellId} canDrop={!isOccupied || !!appointment}>
                      <div
                        className="relative w-full h-full min-h-[58px]"
                        onClick={() => !isOccupied && onCellClick?.(day, hour, minute)}
                      >
                        {appointment ? (
                          <DraggableAppointment
                            appointment={appointment}
                            disabled={!allowDrag || !!activeId}
                            onEdit={allowCancel ? () => onEditAppointment?.(appointment) : undefined}
                            onCancel={allowCancel ? () => handleCancelAppointment(appointment) : undefined}
                          />
                        ) : null}
                      </div>
                    </DroppableCell>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeAppointment ? (
            <div className="opacity-90">
              <DraggableAppointment
                appointment={activeAppointment}
                disabled
                onEdit={undefined}
                onCancel={undefined}
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
