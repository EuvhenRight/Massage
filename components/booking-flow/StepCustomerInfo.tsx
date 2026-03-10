"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { getBookingSchema, type BookingFormData } from "@/lib/booking-schema";
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

interface StepCustomerInfoProps {
  onSubmit: (data: BookingFormData) => void | Promise<void>;
  isSubmitting?: boolean;
}

export default function StepCustomerInfo({
  onSubmit,
  isSubmitting = false,
}: StepCustomerInfoProps) {
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
    defaultValues: {
      service: "",
      fullName: fullName || "",
      email: email || "",
      phone: phone || "",
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setCustomerInfo({
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
    });
    await onSubmit(values);
  });

  return (
    <motion.div
      className="space-y-5 sm:space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
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
                    className="min-h-[48px] sm:min-h-[44px] h-auto py-3 sm:py-2.5 text-base sm:text-sm bg-white/5 border-white/10 text-icyWhite placeholder:text-icyWhite/40 focus:ring-gold-soft/30 touch-manipulation"
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
                    placeholder={t("placeholderEmail")}
                    className="min-h-[48px] sm:min-h-[44px] h-auto py-3 sm:py-2.5 text-base sm:text-sm bg-white/5 border-white/10 text-icyWhite placeholder:text-icyWhite/40 focus:ring-gold-soft/30 touch-manipulation"
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
                    placeholder={t("placeholderPhone")}
                    className="min-h-[48px] sm:min-h-[44px] h-auto py-3 sm:py-2.5 text-base sm:text-sm bg-white/5 border-white/10 text-icyWhite placeholder:text-icyWhite/40 focus:ring-gold-soft/30 touch-manipulation"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-red-400 text-xs" />
              </FormItem>
            )}
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[52px] sm:min-h-[48px] py-3 sm:py-2.5 rounded-xl text-sm font-semibold bg-gold-soft text-nearBlack hover:bg-gold-glow active:scale-[0.99] shadow-lg shadow-gold-soft/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 touch-manipulation"
          >
            {isSubmitting ? t("bookingInProgress") : t("confirmBooking")}
          </button>
        </form>
      </Form>
    </motion.div>
  );
}
