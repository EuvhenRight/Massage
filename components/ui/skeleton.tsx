import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-white/10",
        "relative overflow-hidden",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer-sweep after:bg-gradient-to-r after:from-transparent after:via-white/[0.06] after:to-transparent",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
