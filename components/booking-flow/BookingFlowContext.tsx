"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import {
  loadBookingDraft,
  saveBookingDraft,
  clearBookingDraft,
  parseDraftToState,
} from "@/lib/booking-draft-storage";
import { findBookableServiceForSelection } from "@/lib/services";
import { normalizeItemBookingDayCount } from "@/types/price-catalog";

export type BookingStep = 1 | 2 | 3 | 4;

export type BookingGranularity = "time" | "day" | "tbd";

/** When picking from the price catalog, pass row metadata so duration/granularity match the item (not only the matched Firestore service row). */
export interface CatalogBookingOverrides {
  durationMinutes?: number;
  bookingGranularity?: string;
  bookingDayCount?: number;
  scheduleTbdCustomerMessage?: string;
  scheduleTbdAdminHint?: string;
}

const MAX_BOOKING_DURATION_MINUTES = 24 * 60;

function clampBookingDurationMinutes(
  raw: unknown,
  fallback: number
): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n <= 0) {
    const f = Math.floor(Number(fallback));
    return Number.isFinite(f) && f > 0
      ? Math.min(Math.max(f, 15), MAX_BOOKING_DURATION_MINUTES)
      : 60;
  }
  return Math.min(Math.max(n, 15), MAX_BOOKING_DURATION_MINUTES);
}

export interface BookingFlowState {
  step: BookingStep;
  service: string;
  date: Date | null;
  time: string | null; // HH:mm
  durationMinutes: number;
  bookingGranularity: BookingGranularity;
  bookingDayCount: number;
  /** Shown on step 2 when bookingGranularity is "tbd" */
  scheduleTbdCustomerMessage: string;
  /** Sent to Firestore for admin when bookingGranularity is "tbd" */
  scheduleTbdAdminHint: string;
  fullName: string;
  email: string;
  phone: string;
}

const initialState: BookingFlowState = {
  step: 1,
  service: "",
  date: null,
  time: null,
  durationMinutes: 60,
  bookingGranularity: "time",
  bookingDayCount: 1,
  scheduleTbdCustomerMessage: "",
  scheduleTbdAdminHint: "",
  fullName: "",
  email: "",
  phone: "",
};

function granularityFromService(
  svc:
    | {
        bookingGranularity?: string;
      }
    | undefined
): BookingGranularity {
  if (svc?.bookingGranularity === "day" || svc?.bookingGranularity === "tbd") {
    return "tbd";
  }
  return "time";
}

function dayCountFromService(
  svc: { bookingDayCount?: number; bookingGranularity?: string } | undefined
): number {
  if (svc?.bookingGranularity !== "day" && svc?.bookingGranularity !== "tbd") {
    return 1;
  }
  const n = Math.floor(Number(svc.bookingDayCount));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(14, n);
}

interface BookingFlowContextValue extends BookingFlowState {
  setService: (v: string, catalog?: CatalogBookingOverrides | null) => void;
  /** Second arg: when set, stores that time; when omitted, clears time (normal date change). */
  setDate: (v: Date | null, presetTime?: string | null) => void;
  setTime: (v: string | null) => void;
  setStep: (s: BookingStep) => void;
  setCustomerInfo: (info: { fullName: string; email: string; phone: string }) => void;
  nextStep: () => void;
  prevStep: () => void;
  reset: () => void;
  clearDraft: () => void;
}

const BookingFlowContext = createContext<BookingFlowContextValue | null>(null);

export function useBookingFlow() {
  const ctx = useContext(BookingFlowContext);
  if (!ctx) throw new Error("useBookingFlow must be used within BookingFlowProvider");
  return ctx;
}

interface BookingFlowProviderProps {
  children: ReactNode;
  defaultService?: string;
  defaultDuration?: number;
  place?: string;
  services: {
    id?: string;
    title: string;
    durationMinutes?: number;
    bookingGranularity?: string;
    bookingDayCount?: number;
    scheduleTbdMessage?: string;
    scheduleTbdAdminNote?: string;
    titleSk?: string;
    titleEn?: string;
    titleRu?: string;
    titleUk?: string;
  }[];
  onComplete?: (state: BookingFlowState) => void;
}

export function BookingFlowProvider({
  children,
  defaultService = "",
  defaultDuration = 60,
  place = "massage",
  services,
  onComplete,
}: BookingFlowProviderProps) {
  const firstService = services[0];
  const [state, setState] = useState<BookingFlowState>(() => {
    if (typeof window === "undefined") {
      return {
        ...initialState,
        service: (defaultService || firstService?.title) ?? "",
        durationMinutes: firstService?.durationMinutes ?? defaultDuration,
        bookingGranularity: granularityFromService(firstService),
        bookingDayCount: dayCountFromService(firstService),
        scheduleTbdCustomerMessage: granularityFromService(firstService) === "tbd"
          ? (firstService?.scheduleTbdMessage ?? "")
          : "",
        scheduleTbdAdminHint:
          granularityFromService(firstService) === "tbd"
            ? (firstService?.scheduleTbdAdminNote ?? "")
            : "",
      };
    }
    const draft = loadBookingDraft(place);
    if (draft) {
      const parsed = parseDraftToState(draft);
      return {
        step: parsed.step as BookingFlowState["step"],
        service: parsed.service,
        date: parsed.date,
        time: parsed.time,
        durationMinutes: parsed.durationMinutes,
        bookingGranularity: parsed.bookingGranularity,
        bookingDayCount: parsed.bookingDayCount ?? 1,
        scheduleTbdCustomerMessage: parsed.scheduleTbdCustomerMessage,
        scheduleTbdAdminHint: parsed.scheduleTbdAdminHint,
        fullName: parsed.fullName,
        email: parsed.email,
        phone: parsed.phone,
      };
    }
    return {
      ...initialState,
      service: "",
      durationMinutes: firstService?.durationMinutes ?? defaultDuration,
      bookingGranularity: granularityFromService(firstService),
      bookingDayCount: dayCountFromService(firstService),
      scheduleTbdCustomerMessage:
        granularityFromService(firstService) === "tbd"
          ? (firstService?.scheduleTbdMessage ?? "")
          : "",
      scheduleTbdAdminHint:
        granularityFromService(firstService) === "tbd"
          ? (firstService?.scheduleTbdAdminNote ?? "")
          : "",
    };
  });

  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    saveBookingDraft(place, {
      step: state.step,
      service: state.service,
      date: state.date,
      time: state.time,
      durationMinutes: state.durationMinutes,
      bookingGranularity: state.bookingGranularity,
      bookingDayCount: state.bookingDayCount,
      scheduleTbdCustomerMessage: state.scheduleTbdCustomerMessage,
      scheduleTbdAdminHint: state.scheduleTbdAdminHint,
      fullName: state.fullName,
      email: state.email,
      phone: state.phone,
    });
  }, [
    place,
    state.step,
    state.service,
    state.date,
    state.time,
    state.durationMinutes,
    state.bookingGranularity,
    state.bookingDayCount,
    state.scheduleTbdCustomerMessage,
    state.scheduleTbdAdminHint,
    state.fullName,
    state.email,
    state.phone,
  ]);

  const clearDraft = useCallback(() => {
    clearBookingDraft(place);
  }, [place]);

  const setService = useCallback(
    (service: string, catalog?: CatalogBookingOverrides | null) => {
      setState((s) => {
        const trimmed = service.trim();
        const svc = trimmed
          ? findBookableServiceForSelection(service, services)
          : undefined;
        const fallbackDuration = svc?.durationMinutes ?? defaultDuration;
        const duration = catalog
          ? clampBookingDurationMinutes(catalog.durationMinutes, fallbackDuration)
          : clampBookingDurationMinutes(fallbackDuration, 60);
        const bookingGranularity = catalog
          ? granularityFromService({
              bookingGranularity: catalog.bookingGranularity,
            })
          : granularityFromService(svc);
        const bookingDayCount = catalog?.bookingDayCount != null
          ? normalizeItemBookingDayCount(catalog.bookingDayCount)
          : dayCountFromService(svc);
        return {
          ...s,
          service,
          durationMinutes: duration,
          bookingGranularity,
          bookingDayCount,
          date: bookingGranularity === "tbd" ? null : s.date,
          time: bookingGranularity === "tbd" ? null : s.time,
          scheduleTbdCustomerMessage:
            bookingGranularity === "tbd"
              ? (catalog?.scheduleTbdCustomerMessage?.trim() ||
                  svc?.scheduleTbdMessage ||
                  "")
              : "",
          scheduleTbdAdminHint:
            bookingGranularity === "tbd"
              ? (catalog?.scheduleTbdAdminHint?.trim() ||
                  svc?.scheduleTbdAdminNote ||
                  "")
              : "",
        };
      });
    },
    [services, defaultDuration]
  );

  const setDate = useCallback((date: Date | null, presetTime?: string | null) => {
    setState((s) => ({
      ...s,
      date,
      time: presetTime !== undefined ? presetTime : null,
    }));
  }, []);

  const setTime = useCallback((time: string | null) => {
    setState((s) => ({ ...s, time }));
  }, []);

  const setStep = useCallback((step: BookingStep) => {
    setState((s) => ({ ...s, step }));
  }, []);

  const setCustomerInfo = useCallback(
    (info: { fullName: string; email: string; phone: string }) => {
      setState((s) => ({ ...s, ...info }));
    },
    []
  );

  const nextStep = useCallback(() => {
    setState((s) => ({
      ...s,
      step: Math.min(4, s.step + 1) as BookingStep,
    }));
  }, []);

  const prevStep = useCallback(() => {
    setState((s) => ({
      ...s,
      step: Math.max(1, s.step - 1) as BookingStep,
    }));
  }, []);

  const reset = useCallback(() => {
    const first = services[0];
    setState({
      ...initialState,
      service: "",
      durationMinutes: first?.durationMinutes ?? defaultDuration,
      bookingGranularity: granularityFromService(first),
      bookingDayCount: dayCountFromService(first),
      scheduleTbdCustomerMessage:
        granularityFromService(first) === "tbd"
          ? (first?.scheduleTbdMessage ?? "")
          : "",
      scheduleTbdAdminHint:
        granularityFromService(first) === "tbd"
          ? (first?.scheduleTbdAdminNote ?? "")
          : "",
    });
  }, [defaultDuration, services]);

  const value: BookingFlowContextValue = {
    ...state,
    setService,
    setDate,
    setTime,
    setStep,
    setCustomerInfo,
    nextStep,
    prevStep,
    reset,
    clearDraft,
  };

  return (
    <BookingFlowContext.Provider value={value}>
      {children}
    </BookingFlowContext.Provider>
  );
}
