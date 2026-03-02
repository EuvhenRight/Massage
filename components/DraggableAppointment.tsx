"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { X, Pencil, Copy } from "lucide-react";
import { toast } from "sonner";
import type { AppointmentData } from "@/lib/book-appointment";
import type { ServiceData } from "@/lib/services";

const DEFAULT_COLOR = "bg-aurora-magenta/30 border-aurora-magenta/50 text-icyWhite";

function getServiceColor(service: string, services: ServiceData[]): string {
  const s = services.find((x) => x.title === service);
  if (s) return `${s.color} text-icyWhite`;
  return DEFAULT_COLOR;
}

function formatTime(date: Date | { toDate?: () => Date }): string {
  const d = typeof date === "object" && "toDate" in date && date.toDate ? date.toDate() : new Date(date as Date);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

const PAST_COLOR = "bg-gray-600/30 border-gray-500/50 text-icyWhite/80";

interface DraggableAppointmentProps {
  appointment: AppointmentData;
  disabled?: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
  services?: ServiceData[];
  isPast?: boolean;
}

export default function DraggableAppointment({
  appointment,
  disabled = false,
  onEdit,
  onCancel,
  services = [],
  isPast = false,
}: DraggableAppointmentProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: appointment.id,
    data: {
      type: "appointment",
      appointment,
    },
    disabled,
  });

  const startDate =
    appointment.startTime && "toDate" in appointment.startTime
      ? appointment.startTime.toDate()
      : new Date(appointment.startTime as Date);
  const endDate =
    appointment.endTime && "toDate" in appointment.endTime
      ? appointment.endTime.toDate()
      : new Date(appointment.endTime as Date);
  const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

  const slotCount = Math.ceil(durationMinutes / 30); // 30-min slots in admin grid
  const slotHeight = 30; // 30px per 30-min slot (2 per hour row)
  const blockHeight = slotCount * slotHeight - 2; // -2 for border

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const dateStr = startDate.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timeStr = `${formatTime(startDate)} – ${formatTime(endDate)}`;
    const text = [
      appointment.service,
      appointment.fullName || "—",
      appointment.email || "—",
      appointment.phone || "—",
      `${dateStr} at ${timeStr}`,
    ].join("\n");
    navigator.clipboard.writeText(text).then(
      () => toast.success("Appointment details copied to clipboard"),
      () => toast.error("Failed to copy")
    );
  };

  const style: React.CSSProperties = {
    minHeight: blockHeight,
    ...(transform ? { transform: CSS.Translate.toString(transform) } : {}),
  };

  return (
    <div
      ref={setNodeRef}
      data-testid="appointment-block"
      data-appointment-id={appointment.id}
      style={style}
      {...(!disabled ? { ...listeners, ...attributes } : {})}
      className={`
        absolute left-1 right-1 rounded-lg border px-2 py-1 text-xs font-medium
        truncate overflow-hidden group select-none
        ${isPast ? PAST_COLOR : getServiceColor(appointment.service, services)}
        ${isDragging ? "opacity-0 pointer-events-none" : ""}
        ${disabled ? "cursor-default" : "cursor-grab active:cursor-grabbing touch-none"}
      `}
    >
      <div className="pr-16 flex flex-col justify-center h-full min-h-[22px]">
        <div className="font-semibold truncate">{appointment.service}</div>
        <div className="text-[10px] opacity-90 truncate">{appointment.fullName}</div>
        <div className="text-[10px] opacity-75">
          {formatTime(startDate)} – {formatTime(endDate)}
        </div>
      </div>
      <div
        className="absolute top-1 right-1 flex gap-0.5 z-10"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleCopy}
          className="p-0.5 rounded hover:bg-black/20 opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Copy appointment details"
        >
          <Copy className="w-3 h-3" />
        </button>
        {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
              className="p-0.5 rounded hover:bg-black/20 opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Edit appointment"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
          {onCancel && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCancel?.();
              }}
              className="p-0.5 rounded hover:bg-black/20 opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Cancel appointment"
            >
              <X className="w-3 h-3" />
            </button>
          )}
      </div>
    </div>
  );
}
