'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface TruncateTextProps extends React.HTMLAttributes<HTMLSpanElement> {
	children: string
	/** When true, adds title attribute for native tooltip on hover (recommended for truncated content) */
	titleTooltip?: boolean
	/** Max length to consider "long" — if exceeded, title tooltip is added (when titleTooltip) */
	tooltipThreshold?: number
}

/**
 * Single-line truncation with ellipsis. Use for service names, paths, full names.
 * Add titleTooltip so users can hover to see full text.
 * Parent must have min-w-0 in flex layouts for truncation to work.
 */
const TruncateText = forwardRef<HTMLSpanElement, TruncateTextProps>(
	(
		{ children, className, titleTooltip = true, tooltipThreshold = 30, ...props },
		ref
	) => {
		const showTitle = titleTooltip && children.length > tooltipThreshold
		return (
			<span
				ref={ref}
				className={cn('block truncate min-w-0', className)}
				title={showTitle ? children : undefined}
				{...props}
			>
				{children}
			</span>
		)
	}
)

TruncateText.displayName = 'TruncateText'

export { TruncateText }
