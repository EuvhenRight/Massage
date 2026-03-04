"use client";

import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MONTH_KEYS = ["month1", "month2", "month3", "month4", "month5", "month6", "month7", "month8", "month9", "month10", "month11", "month12"] as const;

const YEARS = Array.from({ length: 24 }, (_, i) => new Date().getFullYear() - 1 + i);

/** Value is "YYYY-MM" */
interface AdminMonthPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export default function AdminMonthPicker({ value, onChange }: AdminMonthPickerProps) {
  const t = useTranslations("admin");
  const MONTHS = MONTH_KEYS.map((k) => t(k));
  const [year, month] = value.split("-").map(Number);

  const monthNum = typeof month === "number" ? month : parseInt(String(month), 10) || 1;
  const yearNum = typeof year === "number" ? year : parseInt(String(year), 10) || new Date().getFullYear();

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

  return (
    <div className="flex flex-wrap items-center gap-3">
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
          aria-label={t("prevMonth")}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={goNextMonth}
          className="p-2 rounded-lg text-icyWhite/60 hover:bg-white/10 hover:text-icyWhite transition-colors"
          aria-label={t("nextMonth")}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
