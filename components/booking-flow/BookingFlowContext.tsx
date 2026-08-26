"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
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
import { toggleNotifyChannel } from "@/lib/notify-channels";
import {
  addBookingItem,
  bookingDayCountForCart,
  bookingItemFromServiceRow,
  canAddBookingItem,
  hasBookingItem,
  isTbdCart,
  joinItemTitles,
  removeBookingItem,
  sumItemPrices,
  totalDurationMinutes,
  type AddItemCheck,
  type BookingItem,
  type CartPriceTotal,
} from "@/lib/booking-items";
import {
  normalizeItemBookingDayCount,
  type SexKey,
} from "@/types/price-catalog";

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

/**
 * What the flow actually stores. `items` is the source of truth for everything
 * service-related — title, duration, granularity and price are all derived from
 * it (see {@link deriveBookingFlowState}), so a one-service and a five-service
 * booking travel the exact same code path.
 */
export interface BookingCoreState {
  step: BookingStep;
  items: BookingItem[];
  date: Date | null;
  time: string | null; // HH:mm
  fullName: string;
  email: string;
  phone: string;
  /** YYYY-MM-DD, empty when not provided. Drives birthday greetings (optional). */
  birthday: string;
  /** GDPR-compliant marketing opt-in — default OFF. Required for Marketing-category WhatsApp templates. */
  optInMarketing: boolean;
  notifyByEmail: boolean;
  notifyByWhatsApp: boolean;
  /** Woman / man branch when booking from the price catalog (depilation). */
  catalogSex: SexKey | null;
}

export interface BookingFlowState extends BookingCoreState {
  /** Denormalized join of every item title — kept for legacy readers and emails. */
  service: string;
  /** Sum of all item durations (the block the customer occupies). */
  durationMinutes: number;
  bookingGranularity: BookingGranularity;
  bookingDayCount: number;
  /** Shown on step 2 when bookingGranularity is "tbd" */
  scheduleTbdCustomerMessage: string;
  /** Sent to Firestore for admin when bookingGranularity is "tbd" */
  scheduleTbdAdminHint: string;
  /** Running total across the cart, with sale prices already applied. */
  priceTotal: CartPriceTotal;
}

const initialCoreState: BookingCoreState = {
  step: 1,
  items: [],
  date: null,
  time: null,
  fullName: "",
  email: "",
  phone: "",
  birthday: "",
  optInMarketing: false,
  // Public booking is WhatsApp-only by product decision. Email is still
  // collected (in case staff needs an alternate contact channel) but no
  // automated email goes out for customer-initiated bookings. Admin
  // manual booking has its own checkbox UI in `AdminAppointmentModal`.
  notifyByEmail: false,
  notifyByWhatsApp: true,
  catalogSex: null,
};

/** Project the cart onto the flat shape every step component already consumes. */
function deriveBookingFlowState(core: BookingCoreState): BookingFlowState {
  const tbd = isTbdCart(core.items);
  const first = core.items[0];
  return {
    ...core,
    service: joinItemTitles(core.items),
    durationMinutes: core.items.length
      ? totalDurationMinutes(core.items)
      : 60,
    bookingGranularity: tbd ? "tbd" : "time",
    bookingDayCount: bookingDayCountForCart(core.items),
    scheduleTbdCustomerMessage: tbd
      ? (first?.scheduleTbdCustomerMessage ?? "")
      : "",
    scheduleTbdAdminHint: tbd ? (first?.scheduleTbdAdminHint ?? "") : "",
    priceTotal: sumItemPrices(core.items),
  };
}

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

/**
 * Build the single cart line a preset (`?service=`, `defaultService`) implies.
 * The catalog step later refines duration/granularity once the catalog loads.
 */
function presetItem(
  title: string,
  svc:
    | {
        id?: string;
        durationMinutes?: number;
        bookingGranularity?: string;
        bookingDayCount?: number;
        scheduleTbdMessage?: string;
        scheduleTbdAdminNote?: string;
        titleSk?: string;
        titleEn?: string;
        titleRu?: string;
        titleUk?: string;
      }
    | undefined,
  fallbackDuration: number
): BookingItem {
  return bookingItemFromServiceRow({
    id: svc?.id,
    title,
    durationMinutes: svc?.durationMinutes ?? fallbackDuration,
    bookingGranularity: svc?.bookingGranularity,
    bookingDayCount: svc?.bookingDayCount,
    scheduleTbdMessage: svc?.scheduleTbdMessage,
    scheduleTbdAdminNote: svc?.scheduleTbdAdminNote,
    titleSk: svc?.titleSk,
    titleEn: svc?.titleEn,
    titleRu: svc?.titleRu,
    titleUk: svc?.titleUk,
  });
}

interface BookingFlowContextValue extends BookingFlowState {
  /** Replace the whole cart with one line. Empty string clears it. */
  setService: (v: string, catalog?: CatalogBookingOverrides | null) => void;
  /** Append a line. No-op when {@link canAddItem} would reject it. */
  addItem: (item: BookingItem) => void;
  removeItem: (key: string) => void;
  /** Add when absent, remove when present — catalog rows behave like checkboxes. */
  toggleItem: (item: BookingItem) => void;
  clearItems: () => void;
  hasItem: (key: string) => boolean;
  /** Ask before adding so the UI can explain *why* a line was refused. */
  canAddItem: (item: BookingItem) => AddItemCheck;
  setCatalogSex: (v: SexKey | null) => void;
  /** Second arg: when set, stores that time; when omitted, clears time (normal date change). */
  setDate: (v: Date | null, presetTime?: string | null) => void;
  setTime: (v: string | null) => void;
  setStep: (s: BookingStep) => void;
  setCustomerInfo: (info: { fullName: string; email: string; phone: string }) => void;
  setBirthday: (v: string) => void;
  setOptInMarketing: (v: boolean) => void;
  setNotifyByEmail: (v: boolean) => void;
  setNotifyByWhatsApp: (v: boolean) => void;
  nextStep: () => void;
  prevStep: () => void;
  reset: () => void;
  resetAfterBooking: () => void;
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
  /** When true (e.g. `?from=price`), do not restore local draft so preset service + step-2 works. */
  skipDraftRestore?: boolean;
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
  skipDraftRestore = false,
  place = "massage",
  services,
  onComplete,
}: BookingFlowProviderProps) {
  const firstService = services[0];
  const [state, setState] = useState<BookingCoreState>(() => {
    if (typeof window === "undefined") {
      const title = (defaultService || firstService?.title) ?? "";
      return {
        ...initialCoreState,
        items: title
          ? [presetItem(title, firstService, defaultDuration)]
          : [],
      };
    }
    const draft = skipDraftRestore ? null : loadBookingDraft(place);
    if (draft) {
      const parsed = parseDraftToState(draft);
      return {
        step: parsed.step as BookingStep,
        items: parsed.items,
        date: parsed.date,
        time: parsed.time,
        fullName: parsed.fullName,
        email: parsed.email,
        phone: parsed.phone,
        birthday: parsed.birthday ?? "",
        optInMarketing: parsed.optInMarketing === true,
        // Public booking is WhatsApp-only — ignore any channel choice the
        // legacy draft persisted and force the canonical values.
        notifyByEmail: false,
        notifyByWhatsApp: true,
        catalogSex: parsed.catalogSex ?? null,
      };
    }
    const preset = defaultService?.trim() ?? "";
    if (!preset) return { ...initialCoreState };
    const matched = findBookableServiceForSelection(preset, services);
    return {
      ...initialCoreState,
      items: [presetItem(preset, matched ?? firstService, defaultDuration)],
    };
  });

  useLayoutEffect(() => {
    if (!skipDraftRestore || typeof window === "undefined") return;
    clearBookingDraft(place);
  }, [skipDraftRestore, place]);

  /**
   * A draft may reference lines removed from the catalog or stored under an old
   * locale title. Drop only those lines — nuking the whole cart would throw away
   * the other services the customer already picked.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!services.length) return;
    setState((s) => {
      if (!s.items.length) return s;
      const kept = s.items.filter((i) =>
        findBookableServiceForSelection(i.title, services)
      );
      if (kept.length === s.items.length) return s;
      if (kept.length === 0) {
        clearBookingDraft(place);
        const preset = defaultService?.trim() ?? "";
        return {
          ...initialCoreState,
          items: preset
            ? [
                presetItem(
                  preset,
                  findBookableServiceForSelection(preset, services) ??
                    services[0],
                  defaultDuration
                ),
              ]
            : [],
        };
      }
      // Losing a line can invalidate a chosen slot (the block got shorter/longer),
      // so send the customer back to date/time rather than to a stale confirmation.
      return { ...s, items: kept, step: Math.min(s.step, 2) as BookingStep };
    });
  }, [services, place, defaultDuration, defaultService]);

  /** When the catalog loads after mount, apply duration / TBD fields for URL `service`. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const preset = defaultService?.trim();
    if (!preset || !services.length) return;
    setState((s) => {
      // Only refine the untouched single-line preset; once the customer has
      // built a cart, the catalog must not rewrite it underneath them.
      if (s.items.length !== 1) return s;
      const only = s.items[0]!;
      if (only.title.trim() !== preset) return s;
      const svc = findBookableServiceForSelection(preset, services);
      if (!svc) return s;
      const next = presetItem(preset, svc, defaultDuration);
      if (
        only.durationMinutes === next.durationMinutes &&
        only.granularity === next.granularity &&
        only.bookingDayCount === next.bookingDayCount
      ) {
        return s;
      }
      return { ...s, items: [next] };
    });
  }, [services, defaultService, defaultDuration]);

  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    // Nothing worth restoring — and persisting it would immediately recreate the
    // key that `resetAfterBooking` just deleted. Storage mirrors state: pristine
    // state means no draft.
    const pristine =
      state.items.length === 0 &&
      !state.date &&
      !state.time &&
      !state.fullName &&
      !state.email &&
      !state.phone &&
      !state.birthday &&
      state.step === 1;
    if (pristine) {
      clearBookingDraft(place);
      return;
    }
    saveBookingDraft(place, {
      step: state.step,
      items: state.items,
      date: state.date,
      time: state.time,
      fullName: state.fullName,
      email: state.email,
      phone: state.phone,
      birthday: state.birthday,
      optInMarketing: state.optInMarketing,
      catalogSex: state.catalogSex,
      notifyByEmail: state.notifyByEmail,
      notifyByWhatsApp: state.notifyByWhatsApp,
    });
  }, [
    place,
    state.step,
    state.items,
    state.date,
    state.time,
    state.fullName,
    state.email,
    state.phone,
    state.birthday,
    state.optInMarketing,
    state.catalogSex,
    state.notifyByEmail,
    state.notifyByWhatsApp,
  ]);

  /**
   * Wipe everything after a booking goes through: the persisted draft *and* the
   * in-memory state.
   *
   * Clearing only storage was not enough — the state still held the finished
   * booking, so the customer saw last time's services when they opened the form
   * again, and the auto-save effect wrote them straight back to localStorage on
   * the next state change. Both halves must happen together, hence one function.
   */
  const resetAfterBooking = useCallback(() => {
    clearBookingDraft(place);
    setState({ ...initialCoreState });
  }, [place]);

  /** Replace the whole cart with a single line (dropdown-style selection, or clear with ""). */
  const setService = useCallback(
    (service: string, catalog?: CatalogBookingOverrides | null) => {
      setState((s) => {
        const trimmed = service.trim();
        if (!trimmed) return { ...s, items: [] };
        const svc = findBookableServiceForSelection(service, services);
        const granularity = catalog
          ? granularityFromService({
              bookingGranularity: catalog.bookingGranularity,
            })
          : granularityFromService(svc);
        const item: BookingItem = {
          key: svc?.id || trimmed,
          title: service,
          serviceId: svc?.id,
          titleSk: svc?.titleSk,
          titleEn: svc?.titleEn,
          titleRu: svc?.titleRu,
          titleUk: svc?.titleUk,
          durationMinutes: clampBookingDurationMinutes(
            catalog ? catalog.durationMinutes : svc?.durationMinutes,
            svc?.durationMinutes ?? defaultDuration
          ),
          granularity: granularity === "tbd" ? "tbd" : "time",
          bookingDayCount:
            granularity === "tbd"
              ? catalog?.bookingDayCount != null
                ? normalizeItemBookingDayCount(catalog.bookingDayCount)
                : dayCountFromService(svc)
              : undefined,
          scheduleTbdCustomerMessage:
            granularity === "tbd"
              ? (catalog?.scheduleTbdCustomerMessage?.trim() ||
                  svc?.scheduleTbdMessage ||
                  "")
              : undefined,
          scheduleTbdAdminHint:
            granularity === "tbd"
              ? (catalog?.scheduleTbdAdminHint?.trim() ||
                  svc?.scheduleTbdAdminNote ||
                  "")
              : undefined,
        };
        return {
          ...s,
          items: [item],
          date: granularity === "tbd" ? null : s.date,
          time: granularity === "tbd" ? null : s.time,
        };
      });
    },
    [services, defaultDuration]
  );

  /**
   * Cart mutations. Every one of them clears the chosen time: the block length
   * changed, so the slot the customer picked may no longer fit or may now
   * collide with the next appointment. Date survives — only the time is at risk.
   */
  const addItem = useCallback((item: BookingItem) => {
    setState((s) => {
      const items = addBookingItem(s.items, item);
      if (items === s.items) return s;
      return { ...s, items, time: null };
    });
  }, []);

  const removeItem = useCallback((key: string) => {
    setState((s) => {
      const items = removeBookingItem(s.items, key);
      if (items.length === s.items.length) return s;
      return { ...s, items, time: null };
    });
  }, []);

  const toggleItem = useCallback((item: BookingItem) => {
    setState((s) => {
      const items = hasBookingItem(s.items, item.key)
        ? removeBookingItem(s.items, item.key)
        : addBookingItem(s.items, item);
      if (items === s.items) return s;
      return { ...s, items, time: null };
    });
  }, []);

  const clearItems = useCallback(() => {
    setState((s) => (s.items.length ? { ...s, items: [], time: null } : s));
  }, []);

  const hasItem = useCallback(
    (key: string) => hasBookingItem(state.items, key),
    [state.items]
  );

  const canAddItem = useCallback(
    (item: BookingItem) => canAddBookingItem(state.items, item),
    [state.items]
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

  const setCatalogSex = useCallback((catalogSex: SexKey | null) => {
    setState((s) => ({ ...s, catalogSex }));
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

  const setBirthday = useCallback((birthday: string) => {
    setState((s) => ({ ...s, birthday }));
  }, []);

  const setOptInMarketing = useCallback((optInMarketing: boolean) => {
    setState((s) => ({ ...s, optInMarketing }));
  }, []);

  // Notification channels are mutually exclusive: exactly one is always active.
  // Turning one on turns the other off; turning one off turns the other on.
  const setNotifyByEmail = useCallback((value: boolean) => {
    const { email, whatsapp } = toggleNotifyChannel("email", value);
    setState((s) => ({ ...s, notifyByEmail: email, notifyByWhatsApp: whatsapp }));
  }, []);

  const setNotifyByWhatsApp = useCallback((value: boolean) => {
    const { email, whatsapp } = toggleNotifyChannel("whatsapp", value);
    setState((s) => ({ ...s, notifyByEmail: email, notifyByWhatsApp: whatsapp }));
  }, []);

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
    setState({ ...initialCoreState });
  }, []);

  const value: BookingFlowContextValue = {
    ...deriveBookingFlowState(state),
    setService,
    addItem,
    removeItem,
    toggleItem,
    clearItems,
    hasItem,
    canAddItem,
    setDate,
    setTime,
    setCatalogSex,
    setStep,
    setCustomerInfo,
    setBirthday,
    setOptInMarketing,
    setNotifyByEmail,
    setNotifyByWhatsApp,
    nextStep,
    prevStep,
    reset,
    resetAfterBooking,
  };

  return (
    <BookingFlowContext.Provider value={value}>
      {children}
    </BookingFlowContext.Provider>
  );
}
