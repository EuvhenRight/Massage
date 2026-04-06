"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { getBookingAccent } from "@/lib/booking-accent";
import { getBookingSchema, type BookingFormData } from "@/lib/booking-schema";
import {
  formatPhoneInternationalDisplay,
  parseWhatsappE164,
} from "@/lib/phone-e164";
import type { Place } from "@/lib/places";
import { useBookingFlow } from "./BookingFlowContext";
import TbdBookingRecap from "./TbdBookingRecap";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Check, MessageCircle } from "lucide-react";

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
  const {
    fullName,
    email,
    phone,
    setCustomerInfo,
    bookingGranularity,
    service,
    bookingDayCount,
  } = useBookingFlow();
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

  const phoneValue = form.watch("phone");
  const phoneParsedPreview = useMemo(() => {
    const e164 = parseWhatsappE164(phoneValue || "");
    if (!e164) return null;
    return formatPhoneInternationalDisplay(e164) ?? e164;
  }, [phoneValue]);

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
          {bookingGranularity === "tbd" && service && (
            <TbdBookingRecap
              accent={accent}
              service={service}
              bookingDayCount={bookingDayCount}
            />
          )}
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
                    variant="booking"
                    placeholder={t("placeholderFullName")}
                    maxLength={100}
                    autoComplete="name"
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
                    variant="booking"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    maxLength={254}
                    placeholder={t("placeholderEmail")}
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
              <FormItem className="space-y-3">
                <FormLabel className="text-icyWhite/90 text-sm font-medium">
                  {t("phone")}
                </FormLabel>
                <div
                  className={`flex gap-3 rounded-xl p-3.5 sm:p-4 ${accent.inputBorder} bg-white/[0.04]`}
                >
                  <MessageCircle
                    className="h-5 w-5 shrink-0 text-emerald-400/85 mt-0.5"
                    aria-hidden
                  />
                  <p className="text-[13px] sm:text-sm text-icyWhite/65 leading-relaxed">
                    {t("phoneWhatsAppHint")}
                  </p>
                </div>
                <FormControl>
                  <Input
                    variant="booking"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={28}
                    spellCheck={false}
                    placeholder={t("placeholderPhone")}
                    {...field}
                  />
                </FormControl>
                {phoneParsedPreview && !form.formState.errors.phone && (
                  <p
                    className="flex items-center gap-2 text-xs text-emerald-400/90"
                    role="status"
                  >
                    <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>{t("phoneRecognizedLabel", { number: phoneParsedPreview })}</span>
                  </p>
                )}
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
