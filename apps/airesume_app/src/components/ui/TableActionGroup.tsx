"use client"

import * as React from "react"
import { Eye, Edit3, Trash2, MoreHorizontal, Download, Copy } from "lucide-react"
import { IconButton } from "./IconButton"
import { cn } from "@/lib/utils"

export interface TableActionGroupProps {
  onView?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onDuplicate?: () => void
  onDownload?: () => void
  onMore?: () => void
  viewTooltip?: string
  editTooltip?: string
  deleteTooltip?: string
  duplicateTooltip?: string
  downloadTooltip?: string
  className?: string
  size?: "sm" | "md"
}

export function TableActionGroup({
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  onDownload,
  onMore,
  viewTooltip = "View",
  editTooltip = "Edit",
  deleteTooltip = "Delete",
  duplicateTooltip = "Duplicate",
  downloadTooltip = "Download",
  className,
  size = "sm",
}: TableActionGroupProps) {
  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      {onView && (
        <IconButton
          variant="secondary"
          size={size}
          aria-label={viewTooltip}
          tooltip={viewTooltip}
          onClick={onView}
        >
          <Eye className="w-3.5 h-3.5" />
        </IconButton>
      )}

      {onEdit && (
        <IconButton
          variant="secondary"
          size={size}
          aria-label={editTooltip}
          tooltip={editTooltip}
          onClick={onEdit}
        >
          <Edit3 className="w-3.5 h-3.5" />
        </IconButton>
      )}

      {onDuplicate && (
        <IconButton
          variant="secondary"
          size={size}
          aria-label={duplicateTooltip}
          tooltip={duplicateTooltip}
          onClick={onDuplicate}
        >
          <Copy className="w-3.5 h-3.5" />
        </IconButton>
      )}

      {onDownload && (
        <IconButton
          variant="secondary"
          size={size}
          aria-label={downloadTooltip}
          tooltip={downloadTooltip}
          onClick={onDownload}
        >
          <Download className="w-3.5 h-3.5" />
        </IconButton>
      )}

      {onDelete && (
        <IconButton
          variant="danger"
          size={size}
          aria-label={deleteTooltip}
          tooltip={deleteTooltip}
          onClick={onDelete}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </IconButton>
      )}

      {onMore && (
        <IconButton
          variant="ghost"
          size={size}
          aria-label="More options"
          tooltip="More options"
          onClick={onMore}
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </IconButton>
      )}
    </div>
  )
}
