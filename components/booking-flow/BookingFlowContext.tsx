"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export type BookingStep = 1 | 2;

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
  services,
  onComplete,
}: BookingFlowProviderProps) {
  const firstService = services[0];
  const [state, setState] = useState<BookingFlowState>({
    ...initialState,
    service: (defaultService || firstService?.title) ?? "",
    durationMinutes: firstService?.durationMinutes ?? defaultDuration,
  });

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
      step: Math.min(2, s.step + 1) as BookingStep,
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
      service: (defaultService || first?.title) ?? "",
      durationMinutes: first?.durationMinutes ?? defaultDuration,
    });
  }, [defaultService, defaultDuration, services]);

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
  };

  return (
    <BookingFlowContext.Provider value={value}>
      {children}
    </BookingFlowContext.Provider>
  );
}
