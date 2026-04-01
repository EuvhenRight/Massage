"use client";

import { useLocale, useTranslations } from "next-intl";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { AppointmentData } from "@/lib/book-appointment";
import {
  adminCalendarBlockHeightPx,
  adminCalendarEffectiveSlotTier,
  adminCalendarMinDisplayHeightForTier,
  adminCalendarSlotTier,
  type AdminCalendarSlotTier,
} from "@/lib/admin-calendar-grid-layout";
import { formatTime as formatTimeUi } from "@/lib/format-date";
import {
  ADMIN_APPOINTMENT_FALLBACK_COLOR,
  findServiceDataForAppointment,
  type ServiceData,
} from "@/lib/services";
import { resolvedOpaqueCalendarSlotFill } from "@/lib/section-calendar-colors";

const DEFAULT_COLOR = `${ADMIN_APPOINTMENT_FALLBACK_COLOR} text-icyWhite`;

function getServiceColor(
  appointment: Pick<AppointmentData, "service" | "serviceId">,
  services: ServiceData[],
): string {
  const s = findServiceDataForAppointment(appointment, services);
  if (s) {
    return `${resolvedOpaqueCalendarSlotFill(s.color, ADMIN_APPOINTMENT_FALLBACK_COLOR)} text-icyWhite`;
  }
  return DEFAULT_COLOR;
}

const PAST_COLOR = "bg-gray-600 border-gray-500 text-icyWhite/80";

export interface PositionedCalendarLayout {
  topPx: number;
  heightPx: number;
  zIndex: number;
}

interface DraggableAppointmentProps {
  appointment: AppointmentData;
  disabled?: boolean;
  /** Rendered under `DragOverlay`: no absolute grid positioning; fixed size for correct grab preview. */
  isDragOverlay?: boolean;
  dragId?: string;
  blockHeight?: number;
  positionedCalendar?: PositionedCalendarLayout | null;
  onOpenDetail?: () => void;
  onEdit?: () => void;
  onCancel?: () => void;
  services?: ServiceData[];
  isPast?: boolean;
  layout?: "calendar" | "list";
  /**
   * TBD / full-day-without-days rows: muted transparent look in list (and drag overlay).
   * Omit for blocks placed on the week grid so catalog section colors apply.
   */
  awaitingCalendarAssignment?: boolean;
}

function tierChrome(tier: AdminCalendarSlotTier): string {
  switch (tier) {
    case "micro":
      return "rounded-md border border-white/25 px-1.5 py-0.5 shadow-sm shadow-black/40";
    case "compact":
      return "rounded-md border border-white/20 px-2 py-1 shadow-sm shadow-black/35";
    case "short":
      return "rounded-lg border border-white/18 px-2 py-1.5 shadow-md shadow-black/30";
    case "medium":
      return "rounded-lg border border-white/15 px-2.5 py-1.5 shadow-md shadow-black/25 ring-1 ring-black/20";
    case "full":
      return "rounded-xl border border-white/12 px-3 py-2 shadow-lg shadow-black/30 ring-1 ring-black/25";
  }
}

export default function DraggableAppointment({
  appointment,
  disabled = false,
  isDragOverlay = false,
  dragId,
  blockHeight,
  positionedCalendar = null,
  onOpenDetail,
  onEdit,
  services = [],
  isPast = false,
  layout = "calendar",
  awaitingCalendarAssignment = false,
}: DraggableAppointmentProps) {
  const locale = useLocale();
  const t = useTranslations("admin");

  const isTbd = appointment.scheduleTbd === true;
  const isFullDay = appointment.adminBookingMode === "day";

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: isDragOverlay
      ? `__drag-overlay__${appointment.id}`
      : (dragId ?? appointment.id),
    data: {
      type: "appointment",
      appointment,
    },
    disabled: disabled || isDragOverlay || isTbd || isFullDay,
  });

  const startDate =
    appointment.startTime && "toDate" in appointment.startTime
      ? appointment.startTime.toDate()
      : new Date(appointment.startTime as Date);
  const endDate =
    appointment.endTime && "toDate" in appointment.endTime
      ? appointment.endTime.toDate()
      : new Date(appointment.endTime as Date);
  const durationMinutes = Math.round(
    (endDate.getTime() - startDate.getTime()) / 60000
  );
  const explicitFullDayCount =
    appointment.adminFullDayDates?.length && appointment.adminFullDayDates.length > 0
      ? appointment.adminFullDayDates.length
      : 0;
  const storedMultiDay = Math.floor(Number(appointment.multiDayFullDayCount));
  const fullDayDaysLabel =
    explicitFullDayCount > 0 ||
    (Number.isFinite(storedMultiDay) && storedMultiDay > 0)
      ? t("dayCountValue", {
          count:
            explicitFullDayCount > 0
              ? explicitFullDayCount
              : Math.max(1, storedMultiDay),
        })
      : t("selectedDaysEmpty");

  const gridBasedHeight = adminCalendarBlockHeightPx(Math.max(1, durationMinutes));
  const usePositionedCalendar =
    layout === "calendar" && positionedCalendar != null;

  const rawCalendarHeight = usePositionedCalendar
    ? positionedCalendar.heightPx
    : (blockHeight ?? gridBasedHeight);

  const isList = layout === "list";

  const overlayPixelHeight =
    isDragOverlay && typeof blockHeight === "number" ? blockHeight : undefined;

  const renderedHeightForTier =
    usePositionedCalendar && positionedCalendar
      ? positionedCalendar.heightPx
      : overlayPixelHeight;

  /** Timed grid only: density by duration (15 / 30 / 45 / 60+ min) and rendered height. */
  const timedTier: AdminCalendarSlotTier | null =
    !isList && !isFullDay && !isTbd
      ? adminCalendarEffectiveSlotTier(durationMinutes, renderedHeightForTier ?? null)
      : null;

  const displayCalendarHeight = usePositionedCalendar
    ? positionedCalendar.heightPx
    : overlayPixelHeight != null
      ? overlayPixelHeight
      : isList || isFullDay || isTbd
        ? rawCalendarHeight
        : Math.max(
            rawCalendarHeight,
            adminCalendarMinDisplayHeightForTier(adminCalendarSlotTier(durationMinutes))
          );

  const hasNamedCustomer = (appointment.fullName || "").trim().length > 0;
  const customerLabel = hasNamedCustomer
    ? (appointment.fullName || "").trim()
    : t("customer");

  const style: React.CSSProperties = isList
    ? {
        minHeight: 52,
        ...(transform ? { transform: CSS.Translate.toString(transform) } : {}),
      }
    : isDragOverlay && layout === "calendar"
      ? {
          position: "relative",
          width: "7.35rem",
          minWidth: "5rem",
          maxWidth: "8rem",
          height: displayCalendarHeight,
          minHeight: displayCalendarHeight,
          maxHeight: displayCalendarHeight,
          boxSizing: "border-box",
        }
    : usePositionedCalendar
      ? {
          position: "absolute",
          top: positionedCalendar.topPx,
          height: positionedCalendar.heightPx,
          left: "0.1875rem",
          right: "0.1875rem",
          zIndex: positionedCalendar.zIndex,
          minHeight: 0,
          ...(transform ? { transform: CSS.Translate.toString(transform) } : {}),
        }
      : {
          minHeight: displayCalendarHeight,
          ...(transform ? { transform: CSS.Translate.toString(transform) } : {}),
        };

  const hoverTitle = (() => {
    if (timedTier === "micro" || timedTier === "compact") {
      return [
        appointment.service,
        hasNamedCustomer ? customerLabel : undefined,
        `${formatTimeUi(startDate, { locale })} – ${formatTimeUi(endDate, { locale })}`,
        appointment.adminNote?.trim() || undefined,
      ]
        .filter(Boolean)
        .join(" · ");
    }
    const parts: (string | undefined)[] = [
      appointment.service,
      appointment.fullName?.trim() || undefined,
    ];
    if (!isTbd && !isFullDay) {
      parts.push(`${formatTimeUi(startDate, { locale })} – ${formatTimeUi(endDate, { locale })}`);
    } else if (isFullDay) {
      parts.push(`${t("allDayNoClockTime")} · ${fullDayDaysLabel}`);
    } else if (isTbd) {
      parts.push(t("listTbdNoTimeYet"));
    }
    if (appointment.adminNote?.trim()) parts.push(appointment.adminNote.trim());
    return parts.filter(Boolean).join(" · ");
  })();

  const handleCardClick = (e: React.MouseEvent) => {
    if (!onOpenDetail) return;
    e.stopPropagation();
    onOpenDetail();
  };

  const listOrSpecialChrome =
    "rounded-xl border border-white/12 px-3 py-2.5 text-sm shadow-md ring-1 ring-black/20";

  const listAwaitingChrome =
    "rounded-xl px-3 py-2.5 text-sm shadow-none ring-0";

  /** Unscheduled queue + drag preview only — not for positioned grid cells. */
  const showAwaitingListChrome =
    awaitingCalendarAssignment &&
    !isPast &&
    (isList || isDragOverlay);

  const calendarShell = showAwaitingListChrome
    ? listAwaitingChrome
    : isList || isFullDay || isTbd
      ? listOrSpecialChrome
      : timedTier
        ? tierChrome(timedTier)
        : "rounded-lg border border-white/15 px-2 py-1.5";

  const surfaceClass = isPast
    ? PAST_COLOR
    : showAwaitingListChrome
      ? "bg-transparent border-2 border-dashed border-white/45 text-icyWhite/95"
      : getServiceColor(appointment, services);

  /** Tall grid blocks: pin service / name / time to the top instead of vertically centering. */
  const timedBlockHeightPx = usePositionedCalendar
    ? positionedCalendar.heightPx
    : !isList && !isFullDay && !isTbd
      ? displayCalendarHeight
      : 0;
  const alignTimedContentToTop =
    timedTier === "medium" ||
    timedTier === "full" ||
    (!isList && !isFullDay && !isTbd && timedBlockHeightPx >= 62);
  const innerColumnJustify =
    isList || isTbd || isFullDay || alignTimedContentToTop
      ? "justify-start"
      : "justify-center";

  return (
    <div
      ref={setNodeRef}
      data-testid="appointment-block"
      data-appointment-id={appointment.id}
      data-slot-tier={
        showAwaitingListChrome
          ? "awaiting"
          : timedTier ?? (isList ? "list" : "special")
      }
      style={style}
      title={onOpenDetail ? undefined : hoverTitle || undefined}
      {...(!disabled && !isTbd && !isFullDay ? { ...listeners, ...attributes } : {})}
      onClick={
        onOpenDetail
          ? handleCardClick
          : isFullDay && onEdit
            ? (e) => {
                e.stopPropagation();
                onEdit();
              }
            : undefined
      }
      className={`
        ${
          isList
            ? "relative w-full"
            : isDragOverlay && layout === "calendar"
              ? "relative shrink-0"
              : usePositionedCalendar
                ? ""
                : "absolute left-1 right-1"
        }
        text-xs font-medium
        ${calendarShell}
        relative overflow-hidden
        ${
          showAwaitingListChrome
            ? ""
            : "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-gradient-to-b before:from-white/[0.1] before:to-transparent"
        }
        group select-none
        ${usePositionedCalendar ? "pointer-events-auto" : ""}
        ${surfaceClass}
        ${isDragging ? "opacity-0 pointer-events-none" : ""}
        ${
          isFullDay && onEdit
            ? "cursor-pointer"
            : disabled || isTbd || isFullDay
              ? "cursor-default"
              : "cursor-grab touch-none active:cursor-grabbing"
        }
      `}
    >
      <div
        className={`relative z-[1] flex h-full min-h-[18px] w-full flex-col ${innerColumnJustify}`}
      >
        {isList ? (
          <>
            <div className="line-clamp-2 text-sm font-semibold tracking-tight">
              {appointment.service}
            </div>
            <div className="mt-0.5 line-clamp-1 text-[11px] opacity-90">
              {appointment.fullName}
            </div>
            <div className="mt-0.5 text-[10px] tabular-nums text-icyWhite/70">
              {isTbd ? (
                <>
                  <span>{t("listTbdNoTimeYet")}</span>
                  {durationMinutes > 0 && (
                    <span className="text-icyWhite/50">
                      {" "}
                      · {t("durationMinutesAbbr", { minutes: durationMinutes })}
                    </span>
                  )}
                </>
              ) : isFullDay ? (
                <>
                  {t("allDayNoClockTime")}
                  <span className="text-icyWhite/55">
                    {" "}
                    · {fullDayDaysLabel}
                  </span>
                </>
              ) : (
                <>
                  {formatTimeUi(startDate, { locale })} – {formatTimeUi(endDate, { locale })}
                </>
              )}
            </div>
            {appointment.adminNote?.trim() && (
              <div className="mt-0.5 line-clamp-2 text-[10px] italic opacity-60">
                {appointment.adminNote.trim()}
              </div>
            )}
          </>
        ) : isTbd ? (
          <>
            <div className="line-clamp-2 text-[11px] font-semibold leading-snug tracking-tight sm:text-xs">
              {appointment.service}
            </div>
            <div className="mt-0.5 text-[9px] leading-tight text-icyWhite/75">
              {t("listTbdNoTimeYet")}
              {durationMinutes > 0 && (
                <span className="text-icyWhite/50">
                  {" "}
                  · {t("durationMinutesAbbr", { minutes: durationMinutes })}
                </span>
              )}
            </div>
          </>
        ) : isFullDay ? (
          <>
            <div className="line-clamp-2 text-xs font-semibold leading-snug tracking-tight sm:text-sm">
              {appointment.service}
            </div>
            <div className="mt-1 text-[10px] leading-snug text-icyWhite/80">
              {t("allDayNoClockTime")}
              <span className="text-icyWhite/55">
                {" "}
                · {fullDayDaysLabel}
              </span>
            </div>
          </>
        ) : timedTier === "micro" ? (
          <div className="line-clamp-1 text-[9px] font-semibold leading-none tracking-tight text-icyWhite sm:text-[10px]">
            <span className="text-icyWhite">{appointment.service || "—"}</span>
            <span className="font-normal text-icyWhite/75"> · {formatTimeUi(startDate, { locale })}</span>
          </div>
        ) : timedTier === "compact" ? (
          <div className="flex min-h-0 flex-col justify-center gap-0.5">
            <div className="line-clamp-1 text-[10px] font-semibold leading-tight tracking-tight text-icyWhite">
              {appointment.service || "—"}
            </div>
            <div className="line-clamp-1 text-[9px] tabular-nums leading-none text-icyWhite/70">
              {formatTimeUi(startDate, { locale })} – {formatTimeUi(endDate, { locale })}
            </div>
          </div>
        ) : timedTier === "short" ? (
          <div className="flex min-h-0 flex-col justify-center gap-0.5">
            <div className="line-clamp-2 text-[10px] font-semibold leading-snug tracking-tight text-icyWhite sm:text-[11px]">
              {appointment.service}
            </div>
            <div className="line-clamp-1 truncate text-[9px] text-icyWhite/88 sm:text-[10px]">
              {customerLabel}
            </div>
            <div className="text-[9px] tabular-nums leading-none text-icyWhite/65 sm:text-[10px]">
              {formatTimeUi(startDate, { locale })} – {formatTimeUi(endDate, { locale })}
            </div>
          </div>
        ) : timedTier === "medium" ? (
          <div className="flex min-h-0 flex-col justify-start gap-1">
            <div className="line-clamp-2 text-[11px] font-semibold leading-snug tracking-tight sm:text-xs">
              {appointment.service}
            </div>
            <div className="line-clamp-1 truncate text-[10px] text-icyWhite/90">
              {customerLabel}
            </div>
            <div className="text-[10px] tabular-nums text-icyWhite/65">
              {formatTimeUi(startDate, { locale })} – {formatTimeUi(endDate, { locale })}
            </div>
            {appointment.adminNote?.trim() ? (
              <div className="line-clamp-1 truncate text-[9px] italic text-icyWhite/50">
                {appointment.adminNote.trim()}
              </div>
            ) : null}
          </div>
        ) : timedTier === "full" ? (
          <div className="flex min-h-0 flex-col justify-start gap-1">
            <div className="line-clamp-2 text-xs font-semibold leading-snug tracking-tight sm:text-sm">
              {appointment.service}
            </div>
            <div className="line-clamp-1 truncate text-[11px] text-icyWhite/92">
              {customerLabel}
            </div>
            <div className="text-[11px] tabular-nums text-icyWhite/70">
              {formatTimeUi(startDate, { locale })} – {formatTimeUi(endDate, { locale })}
            </div>
            {appointment.adminNote?.trim() ? (
              <div className="line-clamp-2 truncate text-[10px] italic text-icyWhite/55">
                {appointment.adminNote.trim()}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
