"use client"

import * as React from "react"
import { Search, X } from "lucide-react"
import { Input, type InputProps } from "./input"
import { cn } from "@/lib/utils"

export interface SearchInputProps
  extends Omit<InputProps, "leftIcon" | "rightIcon"> {
  onClear?: () => void
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      className,
      value,
      onChange,
      onClear,
      placeholder = "Search...",
      size = "md",
      ...props
    },
    ref
  ) => {
    const hasValue = Boolean(value && String(value).length > 0)

    const handleClear = () => {
      if (onClear) {
        onClear()
      } else if (onChange) {
        const syntheticEvent = {
          target: { value: "" },
        } as React.ChangeEvent<HTMLInputElement>
        onChange(syntheticEvent)
      }
    }

    return (
      <div className={cn("relative w-full", className)}>
        <Input
          ref={ref}
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          size={size}
          leftIcon={<Search className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />}
          rightIcon={
            hasValue ? (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear search input"
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500/50"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : undefined
          }
          {...props}
        />
      </div>
    )
  }
)
SearchInput.displayName = "SearchInput"
