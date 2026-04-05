"use client";

import { splitCatalogServiceTitle } from "@/lib/split-catalog-service-title";
import { cn } from "@/lib/utils";

type BookingServiceTitleDisplayProps = {
  service: string;
  variant?: "sidebar" | "mobile";
  className?: string;
};

/** Breadcrumb (muted) + last line (chosen item) for price-catalog `service` strings. */
export default function BookingServiceTitleDisplay({
  service,
  variant = "sidebar",
  className,
}: BookingServiceTitleDisplayProps) {
  const { breadcrumb, lineTitle } = splitCatalogServiceTitle(service);
  const lastClass =
    variant === "mobile"
      ? "text-sm font-semibold text-icyWhite leading-snug break-words text-right"
      : "text-sm font-semibold text-icyWhite leading-snug break-words";
  const crumbClass =
    variant === "mobile"
      ? "text-[10px] text-icyWhite/45 leading-snug break-words text-right"
      : "text-[11px] text-icyWhite/45 leading-snug break-words";

  return (
    <div className={cn("min-w-0 space-y-0.5", className)}>
      {breadcrumb ? <p className={crumbClass}>{breadcrumb}</p> : null}
      <p className={lastClass}>{lineTitle}</p>
    </div>
  );
}
