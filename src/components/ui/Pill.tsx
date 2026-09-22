"use client"

import * as React from "react"
import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { chipState, type ChipSize } from "./chip-styles"

export interface PillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  onToggle?: () => void
  onClear?: () => void
  showCheckmark?: boolean
  leftIcon?: React.ReactNode
  badgeCount?: number | string
  size?: ChipSize
  /**
   * @deprecated Every pill now renders the one unified outlined treatment
   * (`chip-styles.ts`). Kept only so existing call sites type-check; it no
   * longer changes the appearance. Remove the prop at the call site.
   */
  variant?: "default" | "primary" | "outline"
}

/**
 * Interactive chip. Outlined capsule; when `selected` it takes the app-green
 * border and text (no fill). `disabled` wins over `selected`.
 *
 * Geometry and colour both come from `chip-styles.ts` — this component owns
 * behaviour (toggle, clear, badge) and nothing else.
 */
export const Pill = React.forwardRef<HTMLButtonElement, PillProps>(
  (
    {
      className,
      selected = false,
      onToggle,
      onClear,
      showCheckmark = false,
      leftIcon,
      badgeCount,
      size = "md",
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      variant: _variant,
      children,
      onClick,
      disabled,
      ...props
    },
    ref
  ) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) {
        e.preventDefault()
        return
      }
      onClick?.(e)
      onToggle?.()
    }

    const state = disabled ? "disabled" : selected ? "active" : "idle"

    return (
      <button
        ref={ref}
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-pressed={disabled ? undefined : selected}
        className={cn("cursor-pointer", chipState(state, size), className)}
        {...props}
      >
        {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
        <span>{children}</span>

        {badgeCount !== undefined && (
          <span
            className={cn(
              "px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 tabular-nums transition-colors",
              selected && !disabled
                ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
            )}
          >
            {badgeCount}
          </span>
        )}

        {selected && !disabled && showCheckmark && (
          <Check className="w-3.5 h-3.5 ml-0.5 shrink-0 text-current" />
        )}

        {selected && !disabled && onClear && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear"
            onClick={(e) => {
              e.stopPropagation()
              onClear()
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                e.stopPropagation()
                onClear()
              }
            }}
            className="ml-1 p-0.5 rounded-full cursor-pointer hover:bg-[var(--color-primary-soft)]"
          >
            <X className="w-3 h-3 text-current" />
          </span>
        )}
      </button>
    )
  }
)
Pill.displayName = "Pill"
