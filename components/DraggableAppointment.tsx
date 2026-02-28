"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { X, Pencil } from "lucide-react";
import type { AppointmentData } from "@/lib/book-appointment";

const SERVICE_COLORS: Record<string, string> = {
  "Swedish Massage": "bg-amber-500/30 border-amber-500/60 text-amber-100",
  "Deep Tissue": "bg-rose-500/30 border-rose-500/60 text-rose-100",
  "Hot Stone": "bg-orange-500/30 border-orange-500/60 text-orange-100",
  "Aromatherapy": "bg-violet-500/30 border-violet-500/60 text-violet-100",
  "Sports Recovery": "bg-emerald-500/30 border-emerald-500/60 text-emerald-100",
  "Couples Retreat": "bg-pink-500/30 border-pink-500/60 text-pink-100",
  default: "bg-aurora-magenta/30 border-aurora-magenta/50 text-icyWhite",
};

function getServiceColor(service: string): string {
  return SERVICE_COLORS[service] ?? SERVICE_COLORS.default;
}

function formatTime(date: Date | { toDate?: () => Date }): string {
  const d = typeof date === "object" && "toDate" in date && date.toDate ? date.toDate() : new Date(date as Date);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

interface DraggableAppointmentProps {
  appointment: AppointmentData;
  disabled?: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
}

export default function DraggableAppointment({
  appointment,
  disabled = false,
  onEdit,
  onCancel,
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

  const slotCount = Math.ceil(durationMinutes / 30);
  const slotHeight = 60; // matches DroppableCell min-h-[60px]
  const blockHeight = slotCount * slotHeight - 2; // -2 for gap between blocks

  const style: React.CSSProperties = {
    minHeight: blockHeight,
    ...(transform ? { transform: CSS.Translate.toString(transform) } : {}),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!disabled ? { ...listeners, ...attributes } : {})}
      className={`
        absolute left-1 right-1 rounded-lg border px-2 py-1 text-xs font-medium
        truncate overflow-hidden group select-none
        ${getServiceColor(appointment.service)}
        ${isDragging ? "opacity-80 shadow-lg z-50" : ""}
        ${disabled ? "cursor-default" : "cursor-grab active:cursor-grabbing touch-none"}
      `}
    >
      <div className="pr-6 flex flex-col justify-center h-full min-h-[52px]">
        <div className="font-semibold truncate">{appointment.service}</div>
        <div className="text-[10px] opacity-90 truncate">{appointment.fullName}</div>
        <div className="text-[10px] opacity-75">
          {formatTime(startDate)} – {formatTime(endDate)}
        </div>
      </div>
      {(onEdit || onCancel) && (
        <div
          className="absolute top-1 right-1 flex gap-0.5 z-10"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
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
      )}
    </div>
  );
}
