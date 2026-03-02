"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const YEARS = Array.from({ length: 24 }, (_, i) => new Date().getFullYear() - 1 + i);

/** Value is "default" | "YYYY-MM" */
interface AdminMonthPickerProps {
  value: "default" | string; // "default" or "2025-03"
  onChange: (value: "default" | string) => void;
}

export default function AdminMonthPicker({ value, onChange }: AdminMonthPickerProps) {
  const isDefault = value === "default";
  const [year, month] = isDefault
    ? [new Date().getFullYear(), new Date().getMonth()]
    : value.split("-").map(Number);

  const monthNum = typeof month === "number" ? month : parseInt(String(month), 10) || 1;
  const yearNum = typeof year === "number" ? year : parseInt(String(year), 10) || new Date().getFullYear();

  const handleScopeChange = (v: string) => {
    if (v === "default") {
      onChange("default");
    } else {
      const now = new Date();
      onChange(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
    }
  };

  const handleMonthChange = (m: number) => {
    onChange(`${yearNum}-${String(m + 1).padStart(2, "0")}`);
  };

  const handleYearChange = (y: number) => {
    onChange(`${y}-${String(monthNum).padStart(2, "0")}`);
  };

  const goPrevMonth = () => {
    if (monthNum <= 1) {
      onChange(`${yearNum - 1}-12`);
    } else {
      onChange(`${yearNum}-${String(monthNum - 1).padStart(2, "0")}`);
    }
  };

  const goNextMonth = () => {
    if (monthNum >= 12) {
      onChange(`${yearNum + 1}-01`);
    } else {
      onChange(`${yearNum}-${String(monthNum + 1).padStart(2, "0")}`);
    }
  };

  const displayLabel = isDefault
    ? "Default (weekly, all time)"
    : `${MONTHS[monthNum - 1]} ${yearNum}`;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={isDefault ? "default" : "month"}
        onValueChange={handleScopeChange}
      >
        <SelectTrigger className="select-menu w-[200px]">
          <SelectValue>{displayLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">Default (weekly, all time)</SelectItem>
          <SelectItem value="month">
            {isDefault ? "Specific month…" : displayLabel}
          </SelectItem>
        </SelectContent>
      </Select>

      {!isDefault && (
        <>
          <Select
            value={String(monthNum - 1)}
            onValueChange={(v) => handleMonthChange(Number(v))}
          >
            <SelectTrigger className="select-menu w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={m} value={String(i)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(yearNum)}
            onValueChange={(v) => handleYearChange(Number(v))}
          >
            <SelectTrigger className="select-menu w-[88px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={goPrevMonth}
              className="p-2 rounded-lg text-icyWhite/60 hover:bg-white/10 hover:text-icyWhite transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={goNextMonth}
              className="p-2 rounded-lg text-icyWhite/60 hover:bg-white/10 hover:text-icyWhite transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
