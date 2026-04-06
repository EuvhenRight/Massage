import * as React from "react"

import { cn } from "@/lib/utils"
import {
  unifiedTextareaClasses,
  unifiedTextareaDenseClasses,
} from "@/lib/unified-field-styles"

export type TextareaProps = React.ComponentProps<"textarea"> & {
  /** `default` — standard; `dense` — admin price catalog cells; `booking` — taller min-height */
  variant?: "default" | "dense" | "booking"
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const base =
      variant === "dense"
        ? unifiedTextareaDenseClasses
        : variant === "booking"
          ? cn(unifiedTextareaClasses, "min-h-[8rem] resize-y")
          : unifiedTextareaClasses

    return (
      <textarea className={cn(base, className)} ref={ref} {...props} />
    )
  },
)
Textarea.displayName = "Textarea"

export { Textarea }
