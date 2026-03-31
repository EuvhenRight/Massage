"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getDateKey } from "@/lib/booking";
import { getPlaceAccentUi } from "@/lib/place-accent-ui";
import type { Place } from "@/lib/places";
import {
  getWorkingHoursForDate,
  isDateAvailable,
  type OccupiedSlot,
} from "@/lib/availability-firestore";
import type { ScheduleData } from "@/lib/schedule-firestore";
import { getSchedule } from "@/lib/schedule-firestore";
import { clsx } from "clsx";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

const MONTH_KEYS = ["month1", "month2", "month3", "month4", "month5", "month6", "month7", "month8", "month9", "month10", "month11", "month12"] as const;

function getDaysInMonth(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = (first.getDay() + 6) % 7;
  const days: (Date | null)[] = Array(startPad).fill(null);
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  const total = Math.ceil(days.length / 7) * 7;
  while (days.length < total) days.push(null);
  return days;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export interface AdminTimeAvailabilityConfig {
  occupiedSlots: OccupiedSlot[];
  durationMinutes: number;
  /** Called when the visible month changes so the parent can load overlapping appointments */
  onViewMonthChange?: (monthStart: Date) => void;
}

interface AdminDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  /** When set, dates before this are not selectable (e.g. today for add mode) */
  minDate?: Date;
  place?: Place;
  disabledDateKeys?: string[];
  /** Keep the calendar open after selecting a date (useful for multi-day picking) */
  keepOpen?: boolean;
  /** Extra date keys to highlight as "already selected" */
  selectedDateKeys?: string[];
  /**
   * Parent-controlled schedule. When omitted, this component loads schedule itself.
   */
  schedule?: ScheduleData | null;
  /**
   * When set, dates with no free slot for the given duration are disabled (admin time booking).
   */
  timeAvailability?: AdminTimeAvailabilityConfig | null;
}

export default function AdminDatePicker({
  value,
  onChange,
  id,
  minDate,
  place = "massage",
  disabledDateKeys = [],
  keepOpen = false,
  selectedDateKeys = [],
  schedule: scheduleProp,
  timeAvailability = null,
}: AdminDatePickerProps) {
  const locale = useLocale();
  const t = useTranslations("admin");
  const ui = useMemo(() => getPlaceAccentUi(place), [place]);
  const [internalSchedule, setInternalSchedule] =
    useState<Awaited<ReturnType<typeof getSchedule>> | null>(null);
  const schedule =
    scheduleProp !== undefined ? scheduleProp : internalSchedule;
  const disabledDates = useMemo(() => new Set(disabledDateKeys), [disabledDateKeys]);
  const selectedDates = useMemo(() => new Set(selectedDateKeys), [selectedDateKeys]);
  const MONTHS = MONTH_KEYS.map((k) => t(k));
  const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
  const weekHeaders = WEEKDAY_KEYS.map((k) => t(k));
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fallbackViewDate = useMemo(() => {
    if (value) return new Date(value + "T12:00:00");
    if (minDate) return new Date(minDate);
    return new Date();
  }, [value, minDate]);
  const selectedDate = fallbackViewDate;
  const [viewMonth, setViewMonth] = useState(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth()));
  const yearOptions = useMemo(
    () => Array.from({ length: 11 }, (_, i) => viewMonth.getFullYear() - 5 + i),
    [viewMonth]
  );

  const days = useMemo(
    () => getDaysInMonth(viewMonth.getFullYear(), viewMonth.getMonth()),
    [viewMonth]
  );

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  useEffect(() => {
    if (open) {
      const d = fallbackViewDate;
      setViewMonth(new Date(d.getFullYear(), d.getMonth()));
    }
  }, [open, fallbackViewDate]);

  useEffect(() => {
    if (scheduleProp !== undefined) return;
    getSchedule(place)
      .then(setInternalSchedule)
      .catch(() => setInternalSchedule(null));
  }, [place, scheduleProp]);

  const onAvailabilityMonthChange = timeAvailability?.onViewMonthChange;
  useEffect(() => {
    if (!open || !onAvailabilityMonthChange) return;
    onAvailabilityMonthChange(
      new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
    );
  }, [open, viewMonth, onAvailabilityMonthChange]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [open]);

  const handleSelect = (d: Date) => {
    if (minDate) {
      const min = new Date(minDate);
      min.setHours(0, 0, 0, 0);
      const day = new Date(d);
      day.setHours(0, 0, 0, 0);
      if (day.getTime() < min.getTime()) return;
    }
    if (getWorkingHoursForDate(schedule, d) == null) return;
    if (timeAvailability) {
      const ok = isDateAvailable(
        d,
        timeAvailability.durationMinutes,
        timeAvailability.occupiedSlots,
        schedule
      );
      if (!ok) return;
    }
    if (disabledDates.has(getDateKey(d))) return;
    const str = getDateKey(d);
    onChange(str);
    if (!keepOpen) setOpen(false);
  };

  const handleMonthChange = (monthIndex: number) => {
    setViewMonth((m) => new Date(m.getFullYear(), monthIndex));
  };

  const handleYearChange = (year: number) => {
    setViewMonth((m) => new Date(year, m.getMonth()));
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        onClick={() => setOpen(!open)}
        className="select-menu flex h-9 w-full items-center justify-between"
      >
        <span>
          {value
            ? new Date(value + "T12:00:00").toLocaleDateString(locale, {
                month: "2-digit",
                day: "2-digit",
                year: "numeric",
              })
            : t("selectDate")}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-[60] mt-1 w-[320px] max-w-[calc(100vw-2rem)] rounded-xl border border-white/10 bg-black p-4 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Month / Year header with dropdowns */}
          <div className="mb-4 grid grid-cols-[auto,1fr,auto] items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-icyWhite/70 hover:bg-white/10 hover:text-icyWhite"
              aria-label={t("prevMonth")}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="grid grid-cols-2 gap-1">
              <label className="sr-only" htmlFor={`${id ?? "admin-date"}-month`}>
                Month
              </label>
              <select
                id={`${id ?? "admin-date"}-month`}
                value={String(viewMonth.getMonth())}
                onChange={(e) => handleMonthChange(Number(e.target.value))}
                className="h-8 w-full min-w-0 rounded-md border border-white/10 bg-white/5 px-2 text-sm text-icyWhite outline-none transition-colors focus:border-white/20"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={String(i)} className="bg-nearBlack text-icyWhite">
                    {m}
                  </option>
                ))}
              </select>
              <label className="sr-only" htmlFor={`${id ?? "admin-date"}-year`}>
                Year
              </label>
              <select
                id={`${id ?? "admin-date"}-year`}
                value={String(viewMonth.getFullYear())}
                onChange={(e) => handleYearChange(Number(e.target.value))}
                className="h-8 w-full min-w-0 rounded-md border border-white/10 bg-white/5 px-2 text-sm text-icyWhite outline-none transition-colors focus:border-white/20"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={String(y)} className="bg-nearBlack text-icyWhite">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-icyWhite/70 hover:bg-white/10 hover:text-icyWhite"
              aria-label={t("nextMonth")}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekHeaders.map((wd) => (
              <div
                key={wd}
                className="text-center text-xs font-medium text-icyWhite/50"
              >
                {wd}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((date, i) => {
              if (!date) {
                return <div key={`pad-${i}`} className="aspect-square" />;
              }
              const dateKey = getDateKey(date);
              const selected = value && sameDay(date, new Date(value + "T12:00:00"));
              const isMultiSelected = selectedDates.has(dateKey);
              const isToday = sameDay(date, today);
              const isPast =
                minDate &&
                (() => {
                  const min = new Date(minDate);
                  min.setHours(0, 0, 0, 0);
                  const d = new Date(date);
                  d.setHours(0, 0, 0, 0);
                  return d.getTime() < min.getTime();
                })();
              const isUnavailable =
                getWorkingHoursForDate(schedule, date) == null;
              const isFullyBookedForTime =
                timeAvailability &&
                !isUnavailable &&
                !isDateAvailable(
                  date,
                  timeAvailability.durationMinutes,
                  timeAvailability.occupiedSlots,
                  schedule
                );
              const isOccupied = disabledDates.has(dateKey);

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => handleSelect(date)}
                  disabled={
                    !!isPast ||
                    isUnavailable ||
                    !!isFullyBookedForTime ||
                    isOccupied
                  }
                  className={clsx(
                    "aspect-square min-h-[32px] rounded-lg text-sm font-medium transition-colors flex items-center justify-center",
                    selected
                      ? ui.adminDatePickerSelected
                      : isMultiSelected
                        ? "bg-white/20 text-icyWhite ring-1 ring-white/30"
                        : "text-icyWhite hover:bg-white/10",
                    isToday && !selected && !isMultiSelected && ui.adminDatePickerToday,
                    (isPast ||
                      isUnavailable ||
                      isFullyBookedForTime ||
                      isOccupied) &&
                      "opacity-40 cursor-not-allowed hover:bg-transparent"
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Footer buttons */}
          <div className="mt-3 flex justify-between gap-2 border-t border-white/10 pt-3">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className={clsx("text-sm", ui.adminDatePickerFooter)}
            >
              {t("clear")}
            </button>
            <button
              type="button"
              onClick={() => handleSelect(today)}
              className={clsx("text-sm", ui.adminDatePickerFooter)}
            >
              {t("today")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
