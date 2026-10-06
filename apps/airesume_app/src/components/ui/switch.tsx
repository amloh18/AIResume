"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  isLoading?: boolean
  size?: "sm" | "md"
}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, isLoading = false, size = "md", disabled, ...props }, ref) => {
  const isSm = size === "sm"

  return (
    <SwitchPrimitives.Root
      className={cn(
        "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        isSm ? "h-5 w-9" : "h-6 w-11",
        "data-[state=checked]:bg-[#013f2e] dark:data-[state=checked]:bg-lime-500 data-[state=unchecked]:bg-gray-200 dark:data-[state=unchecked]:bg-white/10",
        isLoading && "opacity-80 cursor-wait",
        className
      )}
      disabled={disabled || isLoading}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none flex items-center justify-center rounded-full bg-white dark:bg-black shadow-sm ring-0 transition-transform duration-150 ease-out",
          isSm
            ? "h-4 w-4 data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
            : "h-5 w-5 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
        )}
      >
        {isLoading && (
          <Loader2 className="w-2.5 h-2.5 animate-spin text-[#013f2e] dark:text-lime-400" />
        )}
      </SwitchPrimitives.Thumb>
    </SwitchPrimitives.Root>
  )
})
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
