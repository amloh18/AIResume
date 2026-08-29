"use client"

import * as React from "react"
import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface PillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  onToggle?: () => void
  onClear?: () => void
  showCheckmark?: boolean
  leftIcon?: React.ReactNode
  badgeCount?: number | string
  size?: "sm" | "md" | "lg"
  variant?: "default" | "primary" | "outline"
}

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
      variant = "default",
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e)
      onToggle?.()
    }

    const sizeClasses = {
      sm: "h-7 px-2.5 text-[11px] gap-1.5",
      md: "h-8 px-3 text-xs gap-1.5",
      lg: "h-9 px-4 text-xs sm:text-sm gap-2",
    }[size]

    return (
      <button
        ref={ref}
        type="button"
        onClick={handleClick}
        className={cn(
          "inline-flex items-center justify-center font-medium select-none rounded-full border transition-all duration-150 ease-out cursor-pointer active:scale-[0.985] hover:scale-[1.015] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500/50 shrink-0",
          sizeClasses,
          selected
            ? variant === "primary"
              ? "bg-[#013f2e] dark:bg-lime-500 text-white dark:text-black border-transparent font-bold shadow-2xs"
              : "bg-gray-900 dark:bg-white text-white dark:text-black border-transparent font-bold shadow-2xs"
            : "bg-white dark:bg-[#141810] border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5",
          className
        )}
        {...props}
      >
        {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {badgeCount !== undefined && (
          <span
            className={cn(
              "px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 tabular-nums transition-colors",
              selected
                ? "bg-white/20 text-current"
                : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400"
            )}
          >
            {badgeCount}
          </span>
        )}
        {selected && showCheckmark && (
          <Check className="w-3.5 h-3.5 ml-0.5 shrink-0 text-current" />
        )}
        {selected && onClear && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              onClear()
            }}
            className="ml-1 p-0.5 hover:bg-black/10 dark:hover:bg-white/20 rounded-full cursor-pointer"
          >
            <X className="w-3 h-3 text-current" />
          </span>
        )}
      </button>
    )
  }
)
Pill.displayName = "Pill"
