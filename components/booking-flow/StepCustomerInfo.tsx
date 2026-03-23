"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { getBookingAccent } from "@/lib/booking-accent";
import { getBookingSchema, type BookingFormData } from "@/lib/booking-schema";
import type { Place } from "@/lib/places";
import { useBookingFlow } from "./BookingFlowContext";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export interface StepCustomerInfoHandle {
  submitForSave: () => Promise<boolean>;
  submitForConfirm: (onConfirm: (data: BookingFormData) => void | Promise<void>) => void | Promise<void>;
  isValid: boolean;
}

interface StepCustomerInfoProps {
  place?: Place;
  onSubmit: (data: BookingFormData) => void | Promise<void>;
  isSubmitting?: boolean;
  onValidityChange?: (valid: boolean) => void;
}

const StepCustomerInfo = forwardRef<StepCustomerInfoHandle, StepCustomerInfoProps>(function StepCustomerInfo({
  place = "massage",
  onSubmit,
  isSubmitting = false,
  onValidityChange,
}, ref) {
  const accent = useMemo(() => getBookingAccent(place), [place]);
  const t = useTranslations("booking");
  const tValidation = useTranslations("validation");
  const { fullName, email, phone, setCustomerInfo } = useBookingFlow();
  const schema = getBookingSchema({
    fullNameMin: tValidation("fullNameMin"),
    fullNameMax: tValidation("fullNameMax"),
    invalidEmail: tValidation("invalidEmail"),
    invalidPhone: tValidation("invalidPhone"),
  });

  const form = useForm<BookingFormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      service: "",
      fullName: fullName || "",
      email: email || "",
      phone: phone || "",
    },
  });

  const isValid = form.formState.isValid;
  useEffect(() => {
    onValidityChange?.(isValid);
  }, [isValid, onValidityChange]);

  const submitForSave = useCallback(async () => {
    const ok = await form.trigger();
    if (!ok) return false;
    const values = form.getValues();
    setCustomerInfo({
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
    });
    return true;
  }, [form, setCustomerInfo]);

  const submitForConfirm = useCallback(
    async (onConfirm: (data: BookingFormData) => void | Promise<void>) => {
      const values = form.getValues();
      const ok = await form.trigger();
      if (!ok) return;
      setCustomerInfo({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
      });
      await onConfirm(values);
    },
    [form, setCustomerInfo],
  );

  useImperativeHandle(
    ref,
    () => ({
      submitForSave,
      submitForConfirm,
      get isValid() {
        return form.formState.isValid;
      },
    }),
    [submitForSave, submitForConfirm, form.formState.isValid],
  );

  return (
    <motion.div
      className="space-y-5 sm:space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Form {...form}>
        <form className="space-y-5 sm:space-y-6" onSubmit={(e) => e.preventDefault()}>
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-icyWhite/90 text-sm font-medium">
                  {t("fullName")}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("placeholderFullName")}
                    maxLength={100}
                    autoComplete="name"
                    className={`min-h-[48px] sm:min-h-[44px] h-auto py-3 sm:py-2.5 text-base sm:text-sm bg-white/5 ${accent.inputBorder} text-icyWhite placeholder:text-icyWhite/40 ${accent.inputFocus}`}
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-red-400 text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-icyWhite/90 text-sm font-medium">
                  {t("email")}
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    maxLength={254}
                    placeholder={t("placeholderEmail")}
                    className={`min-h-[48px] sm:min-h-[44px] h-auto py-3 sm:py-2.5 text-base sm:text-sm bg-white/5 ${accent.inputBorder} text-icyWhite placeholder:text-icyWhite/40 ${accent.inputFocus}`}
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-red-400 text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-icyWhite/90 text-sm font-medium">
                  {t("phone")}
                </FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={20}
                    placeholder={t("placeholderPhone")}
                    className={`min-h-[48px] sm:min-h-[44px] h-auto py-3 sm:py-2.5 text-base sm:text-sm bg-white/5 ${accent.inputBorder} text-icyWhite placeholder:text-icyWhite/40 ${accent.inputFocus}`}
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-red-400 text-xs" />
              </FormItem>
            )}
          />

          <p className="text-xs text-icyWhite/50 leading-relaxed">{t("bookingInfo")}</p>
        </form>
      </Form>
    </motion.div>
  );
});

export default StepCustomerInfo;
