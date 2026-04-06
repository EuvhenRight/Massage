import * as React from "react"

import { cn } from "@/lib/utils"
import {
  unifiedInputBookingClasses,
  unifiedInputClasses,
  unifiedInputDenseClasses,
  unifiedSearchInputClasses,
} from "@/lib/unified-field-styles"

const variantClasses = {
  default: unifiedInputClasses,
  booking: unifiedInputBookingClasses,
  search: unifiedSearchInputClasses,
  dense: unifiedInputDenseClasses,
} as const

export type InputVariant = keyof typeof variantClasses

export type InputProps = React.ComponentProps<"input"> & {
  /**
   * `default` — contact-style fields.
   * `booking` — public booking wizard (larger touch targets).
   * `search` — padded for a leading search icon (`pl-10`).
   * `dense` — compact admin (price catalog, narrow widths).
   */
  variant?: InputVariant
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = "default", ...props }, ref) => {
    const base = variantClasses[variant] ?? variantClasses.default
    return (
      <input type={type} className={cn(base, className)} ref={ref} {...props} />
    )
  },
)
Input.displayName = "Input"

export { Input }
