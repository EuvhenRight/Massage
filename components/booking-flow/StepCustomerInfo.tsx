"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { bookingSchema, type BookingFormData } from "@/lib/booking-schema";
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
  const { fullName, email, phone, setCustomerInfo } = useBookingFlow();

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
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
    <div className="space-y-4">
      <p className="text-icyWhite/60 text-sm">
        Tell us how to reach you.
      </p>

      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-icyWhite/80 text-sm">
                  Full name *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="John Smith"
                    className="h-10 bg-white/5 border-white/10 text-icyWhite placeholder:text-icyWhite/40"
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
                <FormLabel className="text-icyWhite/80 text-sm">
                  Email *
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    className="h-10 bg-white/5 border-white/10 text-icyWhite placeholder:text-icyWhite/40"
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
                <FormLabel className="text-icyWhite/80 text-sm">
                  Phone *
                </FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="+1 234 567 8900"
                    className="h-10 bg-white/5 border-white/10 text-icyWhite placeholder:text-icyWhite/40"
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
            className="w-full h-11 rounded-xl text-sm font-medium bg-gold-soft/20 border border-gold-soft/50 text-gold-soft hover:bg-gold-soft/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Booking…" : "Confirm booking"}
          </button>
        </form>
      </Form>
    </div>
  );
}
