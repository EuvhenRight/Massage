"use client";

import { useTranslations } from "next-intl";
import { useBookingFlow } from "./BookingFlowContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StepServiceProps {
  services: { title: string; durationMinutes?: number }[];
}

export default function StepService({ services }: StepServiceProps) {
  const t = useTranslations("booking");
  const tCommon = useTranslations("common");
  const { service, setService } = useBookingFlow();

  return (
    <div className="space-y-4">
      <p className="text-icyWhite/60 text-sm">
        {t("pickService")}.
      </p>
      <div className="space-y-2">
        <label className="block text-xs font-medium text-icyWhite/70">
          {tCommon("services")}
        </label>
        <Select value={service} onValueChange={setService}>
          <SelectTrigger className="h-10">
            <SelectValue placeholder={t("selectService")} />
          </SelectTrigger>
          <SelectContent>
            {services.map((s) => (
              <SelectItem key={s.title} value={s.title}>
                {s.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
