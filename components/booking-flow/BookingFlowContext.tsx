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

export type BookingStep = 1 | 2 | 3 | 4;

export interface BookingFlowState {
  step: BookingStep;
  service: string;
  date: Date | null;
  time: string | null; // HH:mm
  durationMinutes: number;
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
  fullName: "",
  email: "",
  phone: "",
};

interface BookingFlowContextValue extends BookingFlowState {
  setService: (v: string) => void;
  setDate: (v: Date | null) => void;
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
        fullName: parsed.fullName,
        email: parsed.email,
        phone: parsed.phone,
      };
    }
    return {
      ...initialState,
      service: "",
      durationMinutes: firstService?.durationMinutes ?? defaultDuration,
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
    state.fullName,
    state.email,
    state.phone,
  ]);

  const clearDraft = useCallback(() => {
    clearBookingDraft(place);
  }, [place]);

  const setService = useCallback((service: string) => {
    setState((s) => {
      const svc = services.find((x) => x.title === service);
      const duration = svc?.durationMinutes ?? defaultDuration;
      return { ...s, service, durationMinutes: duration };
    });
  }, [services, defaultDuration]);

  const setDate = useCallback((date: Date | null) => {
    setState((s) => ({ ...s, date, time: null }));
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
