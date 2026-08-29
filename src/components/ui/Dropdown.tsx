"use client"

import * as React from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DropdownOption<T = string> {
  id: T
  label: string
  icon?: React.ReactNode
  badge?: string | number
  disabled?: boolean
  description?: string
}

export interface DropdownProps<T = string> {
  options: DropdownOption<T>[]
  value?: T | T[]
  onChange?: (value: T) => void
  placeholder?: string
  label?: string
  size?: "sm" | "md" | "lg"
  align?: "left" | "right"
  width?: "auto" | "trigger" | "sm" | "md" | "lg" | string
  isMulti?: boolean
  disabled?: boolean
  className?: string
  triggerClassName?: string
  menuTitle?: string
  leftIcon?: React.ReactNode
}

export function Dropdown<T extends string = string>({
  options,
  value,
  onChange,
  placeholder = "Select...",
  label,
  size = "md",
  align = "left",
  width = "auto",
  isMulti = false,
  disabled = false,
  className,
  triggerClassName,
  menuTitle,
  leftIcon,
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  // Click outside handler
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false)
    } else if (e.key === "ArrowDown" && !isOpen) {
      setIsOpen(true)
    }
  }

  const isSelected = (optionId: T) => {
    if (Array.isArray(value)) {
      return value.includes(optionId)
    }
    return value === optionId
  }

  const selectedCount = Array.isArray(value) ? value.length : value ? 1 : 0
  const selectedOption = !Array.isArray(value) ? options.find((o) => o.id === value) : undefined

  const triggerSizeClasses = {
    sm: "h-8 px-3 text-xs rounded-xl gap-1.5",
    md: "h-10 px-3.5 text-xs sm:text-sm rounded-xl gap-2",
    lg: "h-11 px-4 text-sm rounded-2xl gap-2.5",
  }[size]

  const widthClasses = {
    auto: "w-auto min-w-[160px]",
    trigger: "w-full",
    sm: "w-48",
    md: "w-60",
    lg: "w-80",
  }[typeof width === "string" && width in { auto: 1, trigger: 1, sm: 1, md: 1, lg: 1 } ? width : "auto"]

  return (
    <div
      ref={dropdownRef}
      onKeyDown={handleKeyDown}
      className={cn("relative inline-block text-left", className)}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "inline-flex items-center justify-between border bg-white dark:bg-[#141810] border-gray-200/90 dark:border-white/10 text-gray-800 dark:text-gray-200 transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500/50 select-none shadow-2xs hover:bg-gray-50 dark:hover:bg-white/5 active:scale-[0.985] cursor-pointer",
          selectedCount > 0 && !Array.isArray(value) && "font-semibold text-gray-900 dark:text-white",
          isOpen && "border-[#013f2e] dark:border-lime-500 ring-2 ring-lime-500/20",
          disabled && "opacity-50 cursor-not-allowed",
          triggerSizeClasses,
          triggerClassName
        )}
      >
        <div className="flex items-center gap-2 truncate">
          {leftIcon && <span className="text-gray-400 dark:text-gray-500 shrink-0">{leftIcon}</span>}
          {label ? (
            <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{label}</span>
          ) : selectedOption ? (
            <span className="truncate flex items-center gap-1.5">
              {selectedOption.icon && <span className="shrink-0">{selectedOption.icon}</span>}
              <span>{selectedOption.label}</span>
            </span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500 truncate">{placeholder}</span>
          )}

          {isMulti && selectedCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#013f2e] dark:bg-lime-500 text-white dark:text-black font-bold">
              {selectedCount}
            </span>
          )}
        </div>

        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-gray-400 dark:text-gray-500 transition-transform duration-150 shrink-0 ml-1.5",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute top-full mt-1.5 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl z-50 p-1.5 dropdown-menu-animate max-h-72 overflow-y-auto space-y-0.5",
            align === "right" ? "right-0" : "left-0",
            widthClasses
          )}
        >
          {menuTitle && (
            <div className="text-[11px] font-bold text-gray-400 dark:text-gray-500 px-2.5 py-1.5 border-b border-gray-100 dark:border-white/5 uppercase tracking-wider">
              {menuTitle}
            </div>
          )}

          {options.map((option) => {
            const selected = isSelected(option.id)
            return (
              <button
                key={String(option.id)}
                type="button"
                disabled={option.disabled}
                onClick={() => {
                  onChange?.(option.id)
                  if (!isMulti) setIsOpen(false)
                }}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-xl text-xs sm:text-sm flex items-center justify-between transition-colors duration-150 select-none cursor-pointer",
                  selected
                    ? "bg-[#013f2e]/10 dark:bg-lime-500/15 text-[#013f2e] dark:text-lime-400 font-bold"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5",
                  option.disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  {option.icon && <span className="shrink-0">{option.icon}</span>}
                  <div>
                    <div>{option.label}</div>
                    {option.description && (
                      <div className="text-[11px] text-gray-400 font-normal truncate">
                        {option.description}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {option.badge && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-gray-100 dark:bg-white/10 font-bold">
                      {option.badge}
                    </span>
                  )}
                  {selected && <Check className="w-3.5 h-3.5 text-current shrink-0" />}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
