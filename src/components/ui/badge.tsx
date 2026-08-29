import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center font-medium select-none transition-all duration-150 ease-out whitespace-nowrap [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-gray-200/60 dark:border-white/5",
        secondary:
          "bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-gray-200/60 dark:border-white/5",
        primary:
          "bg-[#013f2e]/10 dark:bg-lime-500/20 text-[#013f2e] dark:text-lime-400 border border-[#013f2e]/20 dark:border-lime-500/30 font-semibold",
        success:
          "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 font-semibold",
        warning:
          "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 font-semibold",
        danger:
          "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40 font-semibold",
        destructive:
          "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40 font-semibold",
        info:
          "bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/40 font-semibold",
        outline:
          "bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300",
        active:
          "bg-[#013f2e] dark:bg-lime-500 text-white dark:text-black font-semibold border-transparent shadow-2xs",
        beta:
          "bg-lime-500/20 text-lime-700 dark:text-lime-300 border border-lime-500/30 font-bold",
      },
      size: {
        sm: "h-5 px-2 text-[10px] rounded-full gap-1 [&_svg]:size-3",
        md: "h-6 px-2.5 text-xs rounded-full gap-1.5 [&_svg]:size-3.5",
        lg: "h-7 px-3 text-xs rounded-full gap-1.5 [&_svg]:size-4",
      },
      interactive: {
        true: "cursor-pointer hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500/50",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

function Badge({
  className,
  variant,
  size,
  interactive,
  leftIcon,
  rightIcon,
  children,
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant, size, interactive, className }))}
      {...props}
    >
      {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
    </div>
  )
}

export { Badge, badgeVariants }
