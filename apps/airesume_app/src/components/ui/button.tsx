import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-medium select-none cursor-pointer transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.985] hover:scale-[1.015] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-[#013f2e] hover:bg-[#02523c] active:bg-[#012e22] text-white dark:bg-lime-500 dark:hover:bg-lime-400 dark:active:bg-lime-600 dark:text-black font-semibold shadow-2xs",
        secondary:
          "bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 hover:border-gray-300 dark:hover:border-white/20 font-medium shadow-2xs",
        outline:
          "border border-gray-200/90 dark:border-white/10 bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white font-medium",
        ghost:
          "bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white font-medium hover:scale-[1.01] active:scale-[0.99]",
        danger:
          "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-medium shadow-2xs",
        accent:
          "bg-lime-500 hover:bg-lime-400 active:bg-lime-600 text-black font-semibold shadow-2xs",
        soft:
          "bg-[#013f2e]/10 dark:bg-lime-500/15 text-[#013f2e] dark:text-lime-400 hover:bg-[#013f2e]/15 dark:hover:bg-lime-500/25 font-semibold",
        link:
          "text-[#013f2e] dark:text-lime-400 underline-offset-4 hover:underline hover:scale-100 p-0 h-auto font-medium",
        default:
          "bg-[#013f2e] hover:bg-[#02523c] text-white dark:bg-lime-500 dark:hover:bg-lime-400 dark:text-black font-semibold shadow-2xs",
        destructive:
          "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-medium shadow-2xs",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-xl gap-1.5 [&_svg]:size-3.5",
        md: "h-10 px-4 text-xs sm:text-sm rounded-xl gap-2 [&_svg]:size-4",
        lg: "h-11 px-6 text-sm rounded-2xl gap-2.5 [&_svg]:size-4.5",
        "icon-sm": "h-8 w-8 p-0 rounded-xl shrink-0 [&_svg]:size-3.5",
        "icon-md": "h-10 w-10 p-0 rounded-xl shrink-0 [&_svg]:size-4",
        "icon-lg": "h-11 w-11 p-0 rounded-2xl shrink-0 [&_svg]:size-5",
        default: "h-10 px-4 text-xs sm:text-sm rounded-xl gap-2 [&_svg]:size-4",
        icon: "h-10 w-10 p-0 rounded-xl shrink-0 [&_svg]:size-4",
        tablet: "h-9 px-3.5 text-xs rounded-xl gap-1.5 [&_svg]:size-4",
        desktop: "h-11 px-6 text-sm rounded-2xl gap-2.5 [&_svg]:size-4.5",
      },
      fullWidth: {
        true: "w-full flex",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean
  loadingText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      asChild = false,
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, fullWidth, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      )
    }

    return (
      <button
        className={cn(
          buttonVariants({ variant, size, fullWidth, className }),
          isLoading && "cursor-wait opacity-80"
        )}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin text-current" />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

