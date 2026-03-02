"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { clsx } from "clsx";
import { Copy, Info, Lock } from "lucide-react";
import type { Place } from "@/lib/places";
import { getSchedule, saveSchedule, type ScheduleData, type DaySchedule } from "@/lib/schedule-firestore";
import { getWorkingHoursForDate } from "@/lib/availability-firestore";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AdminMonthPicker from "@/components/AdminMonthPicker";

const WEEKDAYS = [
  { day: 0, label: "Sunday" },
  { day: 1, label: "Monday" },
  { day: 2, label: "Tuesday" },
  { day: 3, label: "Wednesday" },
  { day: 4, label: "Thursday" },
  { day: 5, label: "Friday" },
  { day: 6, label: "Saturday" },
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function timeOptions(): string[] {
  const options: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      options.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return options;
}

const TIME_OPTIONS = timeOptions();

interface AdminAvailabilityManagerProps {
  place?: Place;
  schedule?: ScheduleData | null;
  onScheduleChange?: (schedule: ScheduleData | null) => void;
}

function formatMonthLabel(value: string): string {
  const [y, m] = value.split("-").map(Number);
  if (!y || !m) return value;
  return `${MONTH_NAMES[(m ?? 1) - 1]} ${y}`;
}

function MonthCalendar({
  year,
  month,
  schedule,
  onToggle,
}: {
  year: number;
  month: number;
  schedule: ScheduleData;
  onToggle: (date: Date) => void;
}) {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const startPad = first.getDay();
  const daysInMonth = last.getDate();
  const cells: (number | null)[] = [...Array(startPad).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const weekHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="inline-block">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekHeaders.map((h) => (
          <div key={h} className="text-center text-xs text-icyWhite/50 font-medium py-1">
            {h}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`pad-${i}`} className="w-9 h-9" />;
          }
          const date = new Date(year, month - 1, day);
          const isOpen = getWorkingHoursForDate(schedule, date) !== null;
          return (
            <button
              key={day}
              type="button"
              onClick={() => onToggle(date)}
              title={`${day} – ${isOpen ? "Open" : "Closed"} (click to toggle)`}
              className={clsx(
                "w-9 h-9 rounded-lg text-sm font-medium transition-colors",
                isOpen
                  ? "bg-gold-soft/20 text-gold-glow border border-gold-soft/40 hover:bg-gold-soft/30"
                  : "bg-white/5 text-icyWhite/40 border border-white/10 hover:bg-white/10 hover:text-icyWhite/60"
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminAvailabilityManager({
  place = "massage",
  schedule: scheduleProp,
  onScheduleChange,
}: AdminAvailabilityManagerProps) {
  const [internalSchedule, setInternalSchedule] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scope, setScope] = useState<"default" | string>("default");

  const schedule = scheduleProp ?? internalSchedule;
  const setSchedule = onScheduleChange ?? setInternalSchedule;

  useEffect(() => {
    if (scheduleProp != null) {
      setLoading(false);
      return;
    }
    getSchedule(place)
      .then(setInternalSchedule)
      .catch(() => toast.error("Failed to load schedule"))
      .finally(() => setLoading(false));
  }, [place, scheduleProp]);

  const isDefault = scope === "default";
  const activeSchedule: Record<number, DaySchedule> = isDefault
    ? (schedule?.defaultSchedule ?? {})
    : (schedule?.monthOverrides?.[scope] ?? schedule?.defaultSchedule ?? {});

  const updateDay = (day: number, value: DaySchedule) => {
    if (!schedule) return;
    if (isDefault) {
      setSchedule({
        ...schedule,
        defaultSchedule: { ...schedule.defaultSchedule, [day]: value },
      });
    } else {
      const overrides = { ...(schedule.monthOverrides ?? {}) };
      const current = overrides[scope] ?? { ...schedule.defaultSchedule };
      overrides[scope] = { ...current, [day]: value };
      setSchedule({ ...schedule, monthOverrides: overrides });
    }
  };

  const copyFromDefault = () => {
    if (!schedule || isDefault) return;
    const overrides = { ...(schedule.monthOverrides ?? {}) };
    overrides[scope] = { ...schedule.defaultSchedule };
    setSchedule({ ...schedule, monthOverrides: overrides });
    toast.success(`Copied default schedule to ${formatMonthLabel(scope)}.`);
  };

  const getDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const toggleDate = (date: Date) => {
    if (!schedule) return;
    const dateKey = getDateKey(date);
    const current = getWorkingHoursForDate(schedule, date);
    const dateOverrides = { ...(schedule.dateOverrides ?? {}) };
    if (current) {
      dateOverrides[dateKey] = null;
    } else {
      const dayOfWeek = date.getDay();
      const fallback = activeSchedule[dayOfWeek] ?? { open: "09:00", close: "18:00" };
      dateOverrides[dateKey] = fallback;
    }
    setSchedule({ ...schedule, dateOverrides });
  };

  const handleSave = async () => {
    if (!schedule) return;
    setSaving(true);
    try {
      await saveSchedule(schedule, place);
      toast.success("Availability saved.");
    } catch {
      toast.error("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-nearBlack/80 p-6">
        <p className="text-icyWhite/60">Loading...</p>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="rounded-xl border border-white/10 bg-nearBlack/80 p-6">
        <p className="text-icyWhite/60">Could not load schedule.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-nearBlack/80 overflow-hidden">
      {/* Prep time bar */}
      <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-b border-white/10 bg-white/[0.02]">
        <Lock className="h-4 w-4 text-icyWhite/40 shrink-0" />
        <span className="text-sm text-icyWhite/70">Prep time between appointments:</span>
        <Select
          value={String(schedule?.prepBufferMinutes ?? 15)}
          onValueChange={async (v) => {
            if (!schedule) return;
            const next = { ...schedule, prepBufferMinutes: parseInt(v, 10) };
            setSchedule(next);
            try {
              await saveSchedule(next, place);
              toast.success("Prep time updated.");
            } catch {
              setSchedule(schedule);
              toast.error("Failed to save.");
            }
          }}
        >
          <SelectTrigger className="w-20 h-8 text-sm bg-white/5 border-white/10 text-icyWhite [&>span]:line-clamp-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[5, 10, 15, 20, 25, 30].map((m) => (
              <SelectItem key={m} value={String(m)}>
                {m} min
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span
          title="Minutes reserved after each appointment for preparation. This time cannot be booked."
          className="inline-flex cursor-help rounded-full p-0.5 text-icyWhite/50 hover:text-gold-soft/80 transition-colors"
          aria-label="Prep buffer info"
        >
          <Info className="h-3.5 w-3.5" />
        </span>
      </div>

      {/* Main: weekdays left, month controls + calendar right */}
      <div className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-start gap-8">
          {/* Left: Weekly schedule */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-end gap-3 mb-4">
              <div>
                <span className="text-xs text-icyWhite/50 block mb-1">Manage schedule for</span>
                <AdminMonthPicker value={scope} onChange={setScope} />
              </div>
              {!isDefault && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyFromDefault}
                  className="border-white/10 text-icyWhite hover:bg-white/10"
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Copy from default
                </Button>
              )}
            </div>
            <div className="space-y-2">
        {WEEKDAYS.map(({ day, label }) => {
          const daySched = activeSchedule[day];
          const isOpen = daySched !== null;

          return (
            <div
              key={day}
              className={clsx(
                "flex flex-wrap items-center gap-4 p-4 rounded-xl border transition-colors",
                isOpen
                  ? "border-white/10 bg-white/[0.02]"
                  : "border-white/5 bg-transparent"
              )}
            >
              <label className="flex items-center gap-2 min-w-[120px] cursor-pointer">
                <Checkbox
                  checked={isOpen}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      updateDay(day, { open: "09:00", close: "18:00" });
                    } else {
                      updateDay(day, null);
                    }
                  }}
                />
                <span className="text-icyWhite">{label}</span>
              </label>
              {isOpen && daySched && (
                <div className="flex items-center gap-2">
                  <span className="text-icyWhite/60 text-sm">From</span>
                  <Select
                    value={daySched.open}
                    onValueChange={(v) => updateDay(day, { ...daySched, open: v })}
                  >
                    <SelectTrigger className="w-24 [&>span]:line-clamp-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-icyWhite/60 text-sm">to</span>
                  <Select
                    value={daySched.close}
                    onValueChange={(v) => updateDay(day, { ...daySched, close: v })}
                  >
                    <SelectTrigger className="w-24 [&>span]:line-clamp-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {!isOpen && (
                <span className="text-icyWhite/40 text-sm">Closed</span>
              )}
            </div>
          );
        })}
            </div>
          </div>

          {/* Right: Toggle days calendar (when month selected) */}
          {!isDefault && (
            <div className="lg:w-[300px] lg:shrink-0 lg:border-l lg:border-white/10 lg:pl-8">
              <h3 className="font-medium text-icyWhite mb-1">Toggle days for {formatMonthLabel(scope)}</h3>
              <p className="text-xs text-icyWhite/60 mb-3">
                Click any day to switch it on or off. Green = open, gray = closed.
              </p>
              <MonthCalendar
                year={parseInt(scope.split("-")[0] ?? "2025", 10)}
                month={parseInt(scope.split("-")[1] ?? "1", 10)}
                schedule={schedule}
                onToggle={toggleDate}
              />
            </div>
          )}
        </div>

        <div className="pt-6 mt-6 border-t border-white/10">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gold-soft/20 text-gold-soft hover:bg-gold-soft/30"
          >
            {saving ? "Saving..." : "Save availability"}
          </Button>
        </div>
      </div>
    </div>
  );
}
