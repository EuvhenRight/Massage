"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getDateKey } from "@/lib/booking";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

interface AdminDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  /** When set, dates before this are not selectable (e.g. today for add mode) */
  minDate?: Date;
}

export default function AdminDatePicker({ value, onChange, id, minDate }: AdminDatePickerProps) {
  const locale = useLocale();
  const t = useTranslations("admin");
  const MONTHS = MONTH_KEYS.map((k) => t(k));
  const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
  const weekHeaders = WEEKDAY_KEYS.map((k) => t(k));
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = value ? new Date(value + "T12:00:00") : new Date();
  const [viewMonth, setViewMonth] = useState(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth()));

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
      const d = value ? new Date(value + "T12:00:00") : new Date();
      setViewMonth(new Date(d.getFullYear(), d.getMonth()));
    }
  }, [open, value]);

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
    const str = getDateKey(d);
    onChange(str);
    setOpen(false);
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
          className="absolute left-0 top-full z-[60] mt-1 min-w-[280px] rounded-lg border border-white/10 bg-black p-4 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Month / Year header with dropdowns */}
          <div className="mb-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-icyWhite/70 hover:bg-white/10 hover:text-icyWhite"
              aria-label={t("prevMonth")}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex gap-1">
              <Select
                value={String(viewMonth.getMonth())}
                onValueChange={(v) => handleMonthChange(Number(v))}
              >
                <SelectTrigger className="select-menu h-8 min-w-[100px] border-0 bg-white/5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={m} value={String(i)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={String(viewMonth.getFullYear())}
                onValueChange={(v) => handleYearChange(Number(v))}
              >
                <SelectTrigger className="select-menu h-8 min-w-[70px] border-0 bg-white/5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 1 + i).map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              const selected = value && sameDay(date, new Date(value + "T12:00:00"));
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

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => handleSelect(date)}
                  disabled={!!isPast}
                  className={`
                    aspect-square min-h-[32px] rounded-lg text-sm font-medium transition-colors
                    flex items-center justify-center
                    ${selected
                      ? "bg-sky-500/80 text-white ring-1 ring-sky-400/60"
                      : "text-icyWhite hover:bg-white/10"}
                    ${isToday && !selected ? "ring-2 ring-gold-soft/70 bg-gold-soft/15 text-gold-glow" : ""}
                    ${isPast ? "opacity-40 cursor-not-allowed hover:bg-transparent" : ""}
                  `}
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
              className="text-sm text-sky-400/90 hover:text-sky-300"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleSelect(today)}
              className="text-sm text-sky-400/90 hover:text-sky-300"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
