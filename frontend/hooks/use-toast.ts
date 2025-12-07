import { toast } from "sonner"

type ToastFunction = typeof toast

interface ToastOptions {
  title?: string
  description?: string
  variant?: "default" | "destructive" | "success"
  duration?: number
}

export const useToast = () => {
  const showToast = ({ title, description, variant = "default", duration = 4000 }: ToastOptions) => {
    if (variant === "destructive") {
      toast.error(title || "Error", {
        description,
        duration,
      })
    } else if (variant === "success") {
      toast.success(title || "Success", {
        description,
        duration,
      })
    } else {
      toast(title || "Notification", {
        description,
        duration,
      })
    }
  }

  return {
    toast: showToast,
    dismiss: toast.dismiss,
  }
}
