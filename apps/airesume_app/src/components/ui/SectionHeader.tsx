"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: React.ReactNode
  badge?: React.ReactNode
  actions?: React.ReactNode
}

export function SectionHeader({
  className,
  title,
  description,
  badge,
  actions,
  ...props
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-white/5",
        className
      )}
      {...props}
    >
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white tracking-tight">
            {title}
          </h2>
          {badge && <div className="shrink-0">{badge}</div>}
        </div>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 font-normal">
            {description}
          </p>
        )}
      </div>

      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
