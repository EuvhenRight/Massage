"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
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
    <div className="space-y-5">
      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-5">
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
                    className="h-11 bg-white/5 border-white/10 text-icyWhite placeholder:text-icyWhite/40 focus:ring-gold-soft/30"
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
                    placeholder={t("placeholderEmail")}
                    className="h-11 bg-white/5 border-white/10 text-icyWhite placeholder:text-icyWhite/40 focus:ring-gold-soft/30"
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
                    placeholder={t("placeholderPhone")}
                    className="h-11 bg-white/5 border-white/10 text-icyWhite placeholder:text-icyWhite/40 focus:ring-gold-soft/30"
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
            className="w-full h-12 rounded-xl text-sm font-semibold bg-gold-soft text-nearBlack hover:bg-gold-glow shadow-lg shadow-gold-soft/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? t("bookingInProgress") : t("confirmBooking")}
          </button>
        </form>
      </Form>
    </div>
  );
}
