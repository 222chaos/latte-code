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

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  addToast: (toast) =>
    set((s) => {
      const id = Math.random().toString(36).slice(2)
      const newToast: Toast = { ...toast, id, duration: toast.duration ?? 3000 }
      const timer = setTimeout(() => {
        const state = get()
        if (state.toasts.some((t) => t.id === id)) {
          set({ toasts: state.toasts.filter((t) => t.id !== id) })
        }
      }, newToast.duration)
      ;(newToast as any)._timer = timer
      return { toasts: [...s.toasts, newToast] }
    }),
  removeToast: (id) =>
    set((s) => {
      const toast = s.toasts.find((t) => t.id === id)
      if (toast && (toast as any)._timer) {
        clearTimeout((toast as any)._timer)
      }
      return { toasts: s.toasts.filter((t) => t.id !== id) }
    }),
}))
