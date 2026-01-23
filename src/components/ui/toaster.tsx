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
            {title && <ToastTitle className="text-white">{title}</ToastTitle>}
            {description}
            {action}
            {/* Only show close button for non-custom components */}
            {!isCustomComponent && <ToastClose />}
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

