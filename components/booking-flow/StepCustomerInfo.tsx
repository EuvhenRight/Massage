"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { toast } from "sonner";
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
import { Checkbox } from "@/components/ui/checkbox";
import { WheelDatePicker } from "@/components/ui/WheelDatePicker";
import { Calendar, Check } from "lucide-react";

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
  const locale = useLocale();
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const formatBirthdayDisplay = useCallback(
    (iso: string): string => {
      const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!m) return "";
      const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      return date.toLocaleDateString(locale, {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    },
    [locale],
  );
  const {
    fullName,
    email,
    phone,
    birthday,
    optInMarketing,
    setCustomerInfo,
    setBirthday,
    setOptInMarketing,
    bookingGranularity,
    service,
    bookingDayCount,
  } = useBookingFlow();
  const schema = getBookingSchema({
    fullNameMin: tValidation("fullNameMin"),
    fullNameMax: tValidation("fullNameMax"),
    invalidEmail: tValidation("invalidEmail"),
    invalidPhone: tValidation("invalidPhone"),
    invalidBirthday: tValidation("invalidBirthday"),
  });

  const form = useForm<BookingFormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      service: "",
      fullName: fullName || "",
      email: email || "",
      phone: phone || "",
      birthday: birthday || "",
      optInMarketing: optInMarketing === true,
    },
  });

  const phoneValue = form.watch("phone");
  const phoneE164Ok = useMemo(
    () => !!parseWhatsappE164(phoneValue || ""),
    [phoneValue]
  );
  const phoneParsedPreview = useMemo(() => {
    const e164 = parseWhatsappE164(phoneValue || "");
    if (!e164) return null;
    return formatPhoneInternationalDisplay(e164) ?? e164;
  }, [phoneValue]);

  // WhatsApp is the only automated channel for public bookings. We still
  // require a valid international phone number because every customer-
  // facing notification (reminders, confirmation) goes through it.
  const isValid = form.formState.isValid;
  useEffect(() => {
    onValidityChange?.(isValid && phoneE164Ok);
  }, [isValid, phoneE164Ok, onValidityChange]);

  const submitForSave = useCallback(async () => {
    const ok = await form.trigger();
    if (!ok) return false;
    const values = form.getValues();
    setCustomerInfo({
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
    });
    setBirthday(values.birthday ?? "");
    setOptInMarketing(values.optInMarketing === true);
    return true;
  }, [form, setCustomerInfo, setBirthday, setOptInMarketing]);

  const submitForConfirm = useCallback(
    async (onConfirm: (data: BookingFormData) => void | Promise<void>) => {
      const values = form.getValues();
      const ok = await form.trigger();
      if (!ok) return;
      if (!parseWhatsappE164(values.phone || "")) {
        toast.error(tValidation("invalidPhone"));
        return;
      }
      setCustomerInfo({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
      });
      setBirthday(values.birthday ?? "");
      setOptInMarketing(values.optInMarketing === true);
      await onConfirm(values);
    },
    [
      form,
      setCustomerInfo,
      setBirthday,
      setOptInMarketing,
      tValidation,
    ],
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
      className="w-full min-w-0 space-y-5 sm:space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Form {...form}>
        <form className="w-full min-w-0 space-y-5 sm:space-y-6" onSubmit={(e) => e.preventDefault()}>
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
            name="birthday"
            render={({ field }) => {
              const display = formatBirthdayDisplay(field.value ?? "");
              return (
                <FormItem>
                  <FormLabel className="text-icyWhite/90 text-sm font-medium">
                    {t("birthdayLabel")}{" "}
                    <span className="text-icyWhite/45 font-normal">
                      ({t("optionalSuffix")})
                    </span>
                  </FormLabel>
                  <FormControl>
                    <button
                      type="button"
                      onClick={() => setDatePickerOpen(true)}
                      aria-haspopup="dialog"
                      className="flex w-full min-w-0 min-h-[48px] sm:min-h-[44px] items-center justify-between rounded-xl border-2 border-white/10 bg-white/[0.04] px-4 py-3 text-base sm:text-sm text-icyWhite transition-colors hover:border-white/20 focus:outline-none focus:border-gold-soft touch-manipulation"
                    >
                      <span className={display ? "text-icyWhite" : "text-icyWhite/25"}>
                        {display || t("birthdayPlaceholder")}
                      </span>
                      <Calendar
                        className="ml-3 h-5 w-5 shrink-0 text-icyWhite/55"
                        aria-hidden
                      />
                    </button>
                  </FormControl>
                  <WheelDatePicker
                    open={datePickerOpen}
                    value={field.value ?? ""}
                    onChange={(v) => field.onChange(v)}
                    onClose={() => setDatePickerOpen(false)}
                    locale={locale}
                    title={t("birthdayLabel")}
                    cancelLabel={t("cancel")}
                    confirmLabel={t("datePickerDone")}
                    clearLabel={t("datePickerClear")}
                  />
                  <p className="text-xs text-icyWhite/45 leading-relaxed">
                    {t("birthdayHint")}
                  </p>
                  <FormMessage className="text-red-400 text-xs" />
                </FormItem>
              );
            }}
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
                <p className="text-xs text-icyWhite/45 leading-relaxed">
                  {t("phoneWhatsAppHint")}
                </p>
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

          <FormField
            control={form.control}
            name="optInMarketing"
            render={({ field }) => (
              <FormItem className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <Checkbox
                    checked={field.value === true}
                    onCheckedChange={(c) => field.onChange(c === true)}
                    className="mt-0.5"
                    aria-label={t("marketingOptInLabel")}
                  />
                  <span className="text-sm text-icyWhite/85 leading-snug">
                    {t("marketingOptInLabel")}
                  </span>
                </label>
                <p className="text-xs text-icyWhite/45 leading-relaxed">
                  {t("marketingOptInHint")}
                </p>
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
