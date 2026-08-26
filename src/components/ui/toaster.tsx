"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        // Check if description is a React element (custom component)
        const isCustomComponent = typeof description === 'object' && description !== null && 'type' in description;

        return (
          <Toast key={id} {...props}>
            <div className="flex w-full items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {title && <ToastTitle className="text-white whitespace-nowrap">{title}</ToastTitle>}
                {description && <span className="text-small text-gray-400 truncate">{description}</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {action}
                {!isCustomComponent && <ToastClose />}
              </div>
            </div>
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

