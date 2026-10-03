"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

export interface TabsListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
  variant?: "line" | "segmented"
}

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, variant = "line", ...props }, ref) => {
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        variant === "line"
          ? "flex items-end gap-6 border-b border-gray-200 dark:border-white/10"
          : "inline-flex items-center bg-gray-100/90 dark:bg-white/5 p-1 rounded-2xl border border-gray-200/50 dark:border-white/5 h-11 shrink-0",
        className
      )}
      {...props}
    />
  )
})
TabsList.displayName = TabsPrimitive.List.displayName

export interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  variant?: "line" | "segmented"
  icon?: React.ReactNode
  badge?: string | number
}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, variant = "line", icon, badge, children, ...props }, ref) => {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap text-small font-medium select-none cursor-pointer transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500/50 disabled:pointer-events-none disabled:opacity-50 group",
        variant === "line"
          ? "py-2.5 border-b-2 border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 data-[state=active]:border-lime-500 data-[state=active]:text-lime-600 dark:data-[state=active]:text-lime-400 data-[state=active]:font-semibold"
          : "px-3.5 py-1.5 rounded-xl text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-[#1a230f] data-[state=active]:text-gray-900 dark:data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:shadow-2xs",
        className
      )}
      {...props}
    >
      {icon && (
        <span className="shrink-0 transition-transform duration-150 group-hover:scale-105">
          {icon}
        </span>
      )}
      {typeof children === 'string' ? <span>{children}</span> : children}
      {badge !== undefined && (
        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-gray-200 dark:bg-white/10 group-data-[state=active]:bg-[#013f2e]/10 dark:group-data-[state=active]:bg-lime-500/20 group-data-[state=active]:text-[#013f2e] dark:group-data-[state=active]:text-lime-400 font-bold ml-0.5">
          {badge}
        </span>
      )}
    </TabsPrimitive.Trigger>
  )
})
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500/50",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
