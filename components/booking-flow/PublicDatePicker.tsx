"use client";

import { useCallback, useMemo } from "react";
import type { OccupiedSlot } from "@/lib/availability-firestore";
import { isDateAvailable } from "@/lib/availability-firestore";

interface PublicDatePickerProps {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  occupiedSlots: OccupiedSlot[];
  durationMinutes: number;
  month: Date;
  onMonthChange: (date: Date) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const days: (Date | null)[] = Array(startPad).fill(null);
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  const total = Math.ceil(days.length / 7) * 7;
  while (days.length < total) days.push(null);
  return days;
}

function isPast(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function PublicDatePicker({
  selectedDate,
  onSelectDate,
  occupiedSlots,
  durationMinutes,
  month,
  onMonthChange,
}: PublicDatePickerProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const days = useMemo(
    () => getDaysInMonth(month.getFullYear(), month.getMonth()),
    [month]
  );

  const isAvailable = useCallback(
    (date: Date) => {
      if (isPast(date)) return false;
      return isDateAvailable(date, durationMinutes, occupiedSlots);
    },
    [durationMinutes, occupiedSlots]
  );

  return (
    <div
      className="rounded-xl border border-white/10 bg-nearBlack/60 shadow-lg overflow-hidden"
      role="application"
      aria-label="Calendar"
    >
      {/* Month navigation - 44px min touch targets */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <button
          type="button"
          onClick={() =>
            onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1))
          }
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-icyWhite/70 hover:text-icyWhite hover:bg-white/10 active:bg-white/15 transition-colors touch-manipulation focus:outline-none focus:ring-2 focus:ring-gold-soft/50 focus:ring-offset-2 focus:ring-offset-nearBlack"
          aria-label="Previous month"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="font-serif text-lg sm:text-xl text-icyWhite font-medium">
          {month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </h3>
        <button
          type="button"
          onClick={() =>
            onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1))
          }
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-icyWhite/70 hover:text-icyWhite hover:bg-white/10 active:bg-white/15 transition-colors touch-manipulation focus:outline-none focus:ring-2 focus:ring-gold-soft/50 focus:ring-offset-2 focus:ring-offset-nearBlack"
          aria-label="Next month"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 bg-white/[0.02]">
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className="text-xs font-medium text-icyWhite/50 text-center py-2 sm:py-2.5"
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Date grid - 44px min touch targets (WCAG), responsive gaps */}
      <div className="grid grid-cols-7 gap-1.5 p-4">
        {days.map((date, i) => {
          if (!date) {
            return <div key={`pad-${i}`} className="aspect-square min-h-[2.75rem] sm:min-h-[2.25rem]" aria-hidden />;
          }
          const available = isAvailable(date);
          const selected = selectedDate && sameDay(date, selectedDate);
          const isToday = sameDay(date, today);

          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => available && onSelectDate(date)}
              disabled={!available}
              aria-pressed={!!selected}
              aria-label={`${date.getDate()} ${month.toLocaleDateString("en-US", { month: "long" })}${available ? ", available" : ", unavailable"}`}
              className={`
                aspect-square min-h-[2.75rem] sm:min-h-[2.25rem] min-w-[2.75rem] sm:min-w-[2.25rem]
                rounded-lg text-sm font-medium transition-colors touch-manipulation
                flex items-center justify-center
                focus:outline-none focus:ring-2 focus:ring-gold-soft/60 focus:ring-offset-2 focus:ring-offset-nearBlack
                ${available ? "cursor-pointer" : "cursor-not-allowed"}
                ${selected
                  ? "bg-gold-soft text-nearBlack ring-2 ring-gold-soft shadow-md"
                  : ""}
                ${available && !selected
                  ? "text-gold-soft/90 hover:bg-gold-soft/20 hover:text-gold-soft"
                  : ""}
                ${!available ? "text-icyWhite/30" : ""}
                ${isToday && !selected ? "ring-1 ring-icyWhite/50" : ""}
              `}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
