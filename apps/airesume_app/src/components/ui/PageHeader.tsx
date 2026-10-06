"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: React.ReactNode
  badge?: React.ReactNode
  eyebrow?: React.ReactNode
  actions?: React.ReactNode
  tabs?: React.ReactNode
}

export function PageHeader({
  className,
  title,
  description,
  badge,
  eyebrow,
  actions,
  tabs,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-gray-200 dark:border-white/10 pb-4",
        className
      )}
      {...props}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          {eyebrow && (
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {eyebrow}
            </div>
          )}

          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              {title}
            </h1>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>

          {description && (
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-normal">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
            {actions}
          </div>
        )}
      </div>

      {tabs && <div className="mt-1">{tabs}</div>}
    </div>
  )
}
