"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useRef,
  useState,
  useMemo,
} from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { clsx } from "clsx";
import { Info, Lock } from "lucide-react";
import { getPlaceAccentUi } from "@/lib/place-accent-ui";
import type { Place } from "@/lib/places";
import {
  getSchedule,
  saveSchedule,
  resolveMonthScopedDaySchedule,
  type ScheduleData,
  type DaySchedule,
} from "@/lib/schedule-firestore";
import { getDateKey as getDateKeyUtil } from "@/lib/booking";
import {
  dayScheduleToWorkingWindow,
  getWorkingHoursForDate,
} from "@/lib/availability-firestore";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AdminMonthPicker from "@/components/AdminMonthPicker";

const WEEKDAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
const MONTH_KEYS = ["month1", "month2", "month3", "month4", "month5", "month6", "month7", "month8", "month9", "month10", "month11", "month12"] as const;

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

const DEFAULT_OPEN_DAY: DaySchedule = {
  mode: "window",
  open: "09:00",
  close: "18:00",
};

/** Single setup shape: always save as window; derive display for legacy slotBegins/allDay. */
function coerceToWindowDay(d: NonNullable<DaySchedule>): {
  mode: "window";
  open: string;
  close: string;
} {
  if (d.mode === "window") {
    return {
      mode: "window",
      open: d.open ?? "09:00",
      close: d.close ?? "18:00",
    };
  }
  const wh = dayScheduleToWorkingWindow(d);
  return { mode: "window", open: wh.open, close: wh.close };
}

interface AppointmentForDate {
  startTime: { toDate?: () => Date } | Date;
}

export type AdminAvailabilityManagerHandle = {
  save: () => Promise<void>;
};

interface AdminAvailabilityManagerProps {
  place?: Place;
  schedule?: ScheduleData | null;
  onScheduleChange?: (schedule: ScheduleData | null) => void;
  appointments?: AppointmentForDate[];
  onSavingChange?: (saving: boolean) => void;
}

function formatMonthLabel(value: string, monthNames: string[]): string {
  const [y, m] = value.split("-").map(Number);
  if (!y || !m) return value;
  return `${monthNames[(m ?? 1) - 1]} ${y}`;
}

function MonthCalendar({
  year,
  month,
  schedule,
  onToggle,
  weekHeaders,
  getDayToggleTitle,
  openDayClassName,
}: {
  year: number;
  month: number;
  schedule: ScheduleData;
  onToggle: (date: Date) => void;
  weekHeaders: string[];
  getDayToggleTitle: (day: number, status: string) => string;
  openDayClassName: string;
}) {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const startPad = first.getDay();
  const daysInMonth = last.getDate();
  const cells: (number | null)[] = [...Array(startPad).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

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
              title={getDayToggleTitle(day, isOpen ? "open" : "closed")}
              className={clsx(
                "w-9 h-9 rounded-lg text-sm font-medium transition-colors",
                isOpen
                  ? openDayClassName
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

function countAppointmentsOnDate(
  appointments: AppointmentForDate[] | undefined,
  date: Date
): number {
  if (!appointments?.length) return 0;
  const key = getDateKeyUtil(date);
  return appointments.filter((apt) => {
    const start =
      apt.startTime && typeof apt.startTime === "object" && "toDate" in apt.startTime
        ? (apt.startTime as { toDate: () => Date }).toDate()
        : new Date(apt.startTime as Date);
    return getDateKeyUtil(start) === key;
  }).length;
}

const AdminAvailabilityManager = forwardRef<
  AdminAvailabilityManagerHandle,
  AdminAvailabilityManagerProps
>(function AdminAvailabilityManager(
  {
    place = "massage",
    schedule: scheduleProp,
    onScheduleChange,
    appointments = [],
    onSavingChange,
  },
  ref,
) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const ui = useMemo(() => getPlaceAccentUi(place), [place]);
  const [internalSchedule, setInternalSchedule] = useState<ScheduleData | null>(null);

  const monthNames = MONTH_KEYS.map((k) => t(k));
  const weekHeaders = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].map((k) => t(k));
  const WEEKDAYS = WEEKDAY_KEYS.map((key, i) => ({ day: i, label: t(key) }));
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<string>(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
  });

  const schedule = scheduleProp ?? internalSchedule;
  const scheduleRef = useRef(schedule);
  scheduleRef.current = schedule;

  const setSchedule = (next: ScheduleData | null) => {
    if (next) scheduleRef.current = next;
    (onScheduleChange ?? setInternalSchedule)(next);
  };

  useEffect(() => {
    if (scheduleProp != null) {
      setLoading(false);
      return;
    }
    getSchedule(place)
      .then(setInternalSchedule)
      .catch(() => toast.error(t("loadScheduleFailed")))
      .finally(() => setLoading(false));
  }, [place, scheduleProp, t]);

  const updateDay = (day: number, value: DaySchedule) => {
    if (!schedule) return;
    const overrides = { ...(schedule.monthOverrides ?? {}) };
    const current = { ...(overrides[scope] ?? {}) };
    current[day] = value;
    overrides[scope] = current;
    setSchedule({ ...schedule, monthOverrides: overrides });
  };

  const getDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const toggleDate = (date: Date) => {
    if (!schedule) return;
    const dateKey = getDateKey(date);
    const current = getWorkingHoursForDate(schedule, date);
    const dateOverrides = { ...(schedule.dateOverrides ?? {}) };
    if (current) {
      const count = countAppointmentsOnDate(appointments, date);
      if (count > 0 && !window.confirm(t("closeDayWithAppointmentsConfirm", { count }))) {
        return;
      }
      dateOverrides[dateKey] = null;
    } else {
      const dayOfWeek = date.getDay();
      const base = resolveMonthScopedDaySchedule(schedule, scope, dayOfWeek);
      dateOverrides[dateKey] =
        base === null ? DEFAULT_OPEN_DAY : coerceToWindowDay(base);
    }
    setSchedule({ ...schedule, dateOverrides });
  };

  const handleSave = useCallback(async () => {
    const toSave = scheduleRef.current;
    if (!toSave) return;
    onSavingChange?.(true);
    try {
      await saveSchedule(toSave, place);
      toast.success(t("availabilitySaved"));
    } catch (err) {
      console.error("Save schedule failed:", err);
      toast.error(t("saveFailed"));
    } finally {
      onSavingChange?.(false);
    }
  }, [place, t, onSavingChange]);

  useImperativeHandle(ref, () => ({ save: handleSave }), [handleSave]);

  if (loading) {
    return (
      <div className={clsx(ui.adminNestedPanel, "p-6")}>
        <p className="text-icyWhite/60">{tCommon("loading")}</p>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className={clsx(ui.adminNestedPanel, "p-6")}>
        <p className="text-icyWhite/60">{t("couldNotLoadSchedule")}</p>
      </div>
    );
  }

  return (
    <div className={ui.adminNestedPanel}>
      {/* Prep time bar */}
      <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-b border-white/10 bg-white/[0.02]">
        <Lock className="h-4 w-4 text-icyWhite/40 shrink-0" />
        <span className="text-sm text-icyWhite/70">{t("prepTimeBetween")}</span>
        <Select
          value={String(schedule?.prepBufferMinutes ?? 15)}
          onValueChange={async (v) => {
            if (!schedule) return;
            const next = { ...schedule, prepBufferMinutes: parseInt(v, 10) };
            setSchedule(next);
            try {
              await saveSchedule(next, place);
              toast.success(t("prepTimeUpdated"));
            } catch {
              setSchedule(schedule);
              toast.error(t("saveFailed"));
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
          title={t("prepBufferTitle")}
          className={clsx(
            "inline-flex cursor-help rounded-full p-0.5 text-icyWhite/50 transition-colors",
            ui.availabilityInfoHover
          )}
          aria-label={t("prepBufferAria")}
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
                <span className="text-xs text-icyWhite/50 block mb-1">{t("manageScheduleFor")}</span>
                <AdminMonthPicker value={scope} onChange={setScope} />
              </div>
            </div>
            <p className="text-xs text-icyWhite/55 mb-3 max-w-xl leading-relaxed">
              {t("scheduleHoursOnlyHint")}
            </p>
            <div className="space-y-2">
        {WEEKDAYS.map(({ day, label }) => {
          const daySched = resolveMonthScopedDaySchedule(schedule, scope, day);
          const isOpen = daySched != null;
          const windowHours = daySched ? coerceToWindowDay(daySched) : null;

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
                  className={ui.adminCheckbox}
                  checked={isOpen}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      updateDay(day, { mode: "window", open: "09:00", close: "18:00" });
                    } else {
                      updateDay(day, null);
                    }
                  }}
                />
                <span className="text-icyWhite">{label}</span>
              </label>
              {isOpen && daySched && windowHours && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-icyWhite/60 text-sm">{t("from")}</span>
                  <Select
                    value={windowHours.open}
                    onValueChange={(v) =>
                      updateDay(day, {
                        mode: "window",
                        open: v,
                        close: windowHours.close,
                      })
                    }
                  >
                    <SelectTrigger className="w-24 [&>span]:line-clamp-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-icyWhite/60 text-sm">{t("to")}</span>
                  <Select
                    value={windowHours.close}
                    onValueChange={(v) =>
                      updateDay(day, {
                        mode: "window",
                        open: windowHours.open,
                        close: v,
                      })
                    }
                  >
                    <SelectTrigger className="w-24 [&>span]:line-clamp-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {!isOpen && (
                <span className="text-icyWhite/40 text-sm">{t("closedShort")}</span>
              )}
            </div>
          );
        })}
            </div>
          </div>

          {/* Right: Toggle days calendar */}
          {(
            <div className="lg:w-[300px] lg:shrink-0 lg:border-l lg:border-white/10 lg:pl-8">
              <h3 className="font-medium text-icyWhite mb-3">{t("toggleDaysFor")} {formatMonthLabel(scope, monthNames)}</h3>
              <div className={ui.availabilityCallout}>
                <div className="flex items-start gap-3">
                  <span
                    className={clsx(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                      ui.availabilityCalloutIcon
                    )}
                  >
                    <Info className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 space-y-2">
                    <p className="text-sm text-icyWhite/90">{t("dayToggleInfo")}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="flex items-center gap-1.5">
                        <span
                          className={clsx("h-3 w-3 rounded border", ui.availabilityLegendOpen)}
                          aria-hidden
                        />
                        <span className="text-icyWhite/80">{t("dayToggleLegendOpen")}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded border border-white/10 bg-white/5" aria-hidden />
                        <span className="text-icyWhite/80">{t("dayToggleLegendClosed")}</span>
                      </span>
                    </div>
                    <p className="text-xs text-icyWhite/60">{t("dayToggleTip")}</p>
                  </div>
                </div>
              </div>
              <MonthCalendar
                year={parseInt(scope.split("-")[0] ?? "2025", 10)}
                month={parseInt(scope.split("-")[1] ?? "1", 10)}
                schedule={schedule}
                onToggle={toggleDate}
                weekHeaders={weekHeaders}
                openDayClassName={ui.availabilityDayOpen}
                getDayToggleTitle={(day, statusKey) => t("dayToggleTitle", { day, status: statusKey === "open" ? t("open") : t("closedShort") })}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

AdminAvailabilityManager.displayName = "AdminAvailabilityManager";

export default AdminAvailabilityManager;
