"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const iconButtonVariants = cva(
  "inline-flex items-center justify-center select-none cursor-pointer transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] hover:scale-[1.02] shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white shadow-2xs",
        secondary:
          "bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white shadow-2xs",
        primary:
          "bg-[#013f2e] hover:bg-[#02523c] text-white dark:bg-lime-500 dark:hover:bg-lime-400 dark:text-black shadow-2xs",
        ghost:
          "bg-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5",
        outline:
          "border border-gray-200/90 dark:border-white/10 bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white",
        danger:
          "bg-transparent hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 border border-transparent hover:border-red-200 dark:hover:border-red-900/40",
        accent:
          "bg-lime-500 hover:bg-lime-400 text-black shadow-2xs",
      },
      size: {
        sm: "h-8 w-8 rounded-xl [&_svg]:size-3.5",
        md: "h-10 w-10 rounded-xl [&_svg]:size-4",
        lg: "h-11 w-11 rounded-2xl [&_svg]:size-5",
      },
      shape: {
        rounded: "rounded-xl",
        pill: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      shape: "rounded",
    },
  }
)

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  "aria-label": string
  isLoading?: boolean
  tooltip?: string
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant,
      size,
      shape,
      isLoading = false,
      "aria-label": ariaLabel,
      tooltip,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        aria-label={ariaLabel}
        title={tooltip || ariaLabel}
        disabled={disabled || isLoading}
        className={cn(iconButtonVariants({ variant, size, shape, className }))}
        {...props}
      >
        {isLoading ? <Loader2 className="animate-spin text-current" /> : children}
      </button>
    )
  }
)
IconButton.displayName = "IconButton"
