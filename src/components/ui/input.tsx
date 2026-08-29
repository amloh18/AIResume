"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: "sm" | "md" | "lg"
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  error?: boolean | string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      size = "md",
      leftIcon,
      rightIcon,
      error,
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: "h-8 text-xs rounded-xl",
      md: "h-10 text-xs sm:text-sm rounded-xl",
      lg: "h-11 text-sm rounded-2xl",
    }[size]

    const paddingClasses = cn(
      leftIcon
        ? size === "sm"
          ? "!pl-9"
          : size === "lg"
          ? "!pl-11"
          : "!pl-10"
        : size === "sm"
        ? "pl-3"
        : "pl-3.5",
      rightIcon
        ? size === "sm"
          ? "!pr-9"
          : size === "lg"
          ? "!pr-11"
          : "!pr-10"
        : size === "sm"
        ? "pr-3"
        : "pr-3.5"
    )

    return (
      <div className="relative w-full flex items-center">
        {leftIcon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-gray-400 dark:text-gray-500 shrink-0 z-10">
            {leftIcon}
          </div>
        )}

        <input
          type={type}
          className={cn(
            "w-full bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/90 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all duration-150 ease-out shadow-2xs py-0",
            "focus:bg-white dark:focus:bg-[#141810] focus:border-[#013f2e] dark:focus:border-lime-500 focus:ring-2 focus:ring-lime-500/20",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-white/5",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
            sizeClasses,
            paddingClasses,
            className
          )}
          disabled={disabled}
          ref={ref}
          {...props}
        />

        {rightIcon && (
          <div className="absolute right-3.5 flex items-center text-gray-400 dark:text-gray-500 shrink-0">
            {rightIcon}
          </div>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
