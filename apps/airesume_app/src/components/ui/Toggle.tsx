"use client"

import * as React from "react"
import { Switch, type SwitchProps } from "./switch"
import { cn } from "@/lib/utils"

export interface ToggleProps extends SwitchProps {
  label?: string
  description?: string
  labelPosition?: "left" | "right"
}

export const Toggle = React.forwardRef<
  React.ElementRef<typeof Switch>,
  ToggleProps
>(
  (
    {
      className,
      label,
      description,
      labelPosition = "right",
      id: customId,
      ...switchProps
    },
    ref
  ) => {
    const generatedId = React.useId()
    const id = customId || generatedId

    if (!label && !description) {
      return <Switch ref={ref} id={id} className={className} {...switchProps} />
    }

    return (
      <div
        className={cn(
          "inline-flex items-center gap-3 select-none",
          labelPosition === "left" && "flex-row-reverse justify-between w-full",
          className
        )}
      >
        <Switch ref={ref} id={id} {...switchProps} />
        <label htmlFor={id} className="cursor-pointer space-y-0.5 leading-none">
          {label && (
            <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
              {label}
            </div>
          )}
          {description && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {description}
            </div>
          )}
        </label>
      </div>
    )
  }
)
Toggle.displayName = "Toggle"
