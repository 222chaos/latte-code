import { create } from 'zustand'

export type ToastType = 'info' | 'success' | 'warning' | 'error'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

const timers = new Map<string, ReturnType<typeof setTimeout>>()

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) =>
    set((s) => {
      const id = Math.random().toString(36).slice(2)
      const newToast: Toast = { ...toast, id, duration: toast.duration ?? 3000 }

      // Clear any existing timer for this id (shouldn't happen)
      const existing = timers.get(id)
      if (existing) clearTimeout(existing)

      const timer = setTimeout(() => {
        timers.delete(id)
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
      }, newToast.duration)
      timers.set(id, timer)

      // Keep max 5 toasts to prevent UI overflow
      const toasts = [...s.toasts, newToast]
      if (toasts.length > 5) {
        const removed = toasts.slice(0, toasts.length - 5)
        for (const t of removed) {
          const oldTimer = timers.get(t.id)
          if (oldTimer) {
            clearTimeout(oldTimer)
            timers.delete(t.id)
          }
        }
        return { toasts: toasts.slice(-5) }
      }
      return { toasts }
    }),
  removeToast: (id) => {
    const timer = timers.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.delete(id)
    }
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
}))
