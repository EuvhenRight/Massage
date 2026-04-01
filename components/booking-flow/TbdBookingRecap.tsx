"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { BookingAccent } from "@/lib/booking-accent";

/** Step 2 (TBD / full-day catalog): show chosen service title and how many calendar days. */
export default function TbdBookingRecap({
	accent,
	service,
	bookingDayCount,
	className,
}: {
	accent: BookingAccent;
	service: string;
	bookingDayCount: number;
	className?: string;
}) {
	const t = useTranslations("booking");
	if (!service.trim()) return null;
	return (
		<div
			className={cn(
				`rounded-xl border px-4 py-3 mb-4 space-y-2 ${accent.inputBorder} bg-white/[0.04]`,
				className,
			)}
		>
			<p className="text-[11px] font-semibold uppercase tracking-wider text-icyWhite/45">
				{t("tbdYourSelectionTitle")}
			</p>
			<p className="text-sm font-medium text-icyWhite leading-snug break-words">
				{service}
			</p>
			<p className="text-sm text-icyWhite/75">
				{t("tbdYourSelectionDays", { count: bookingDayCount })}
			</p>
		</div>
	);
}
