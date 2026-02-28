"use client";

import { useBookingFlow } from "./BookingFlowContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StepServiceProps {
  services: { title: string }[];
}

export default function StepService({ services }: StepServiceProps) {
  const { service, setService } = useBookingFlow();

  return (
    <div className="space-y-4">
      <p className="text-icyWhite/60 text-sm">
        Select the treatment you would like to book.
      </p>
      <div className="space-y-2">
        <label className="block text-xs font-medium text-icyWhite/70">
          Service
        </label>
        <Select value={service} onValueChange={setService}>
          <SelectTrigger className="h-10 bg-white/5 border-white/10 text-icyWhite hover:bg-white/10 transition-colors">
            <SelectValue placeholder="Select a service" />
          </SelectTrigger>
          <SelectContent>
            {services.map((s) => (
              <SelectItem key={s.title} value={s.title} className="text-icyWhite">
                {s.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
