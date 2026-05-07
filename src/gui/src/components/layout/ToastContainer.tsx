import { useToastStore } from '../../store/toastStore.ts'
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'

const ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
}

const COLORS = {
  info: { border: 'rgba(10, 132, 255, 0.3)', icon: 'var(--apple-blue)' },
  success: { border: 'rgba(48, 209, 88, 0.3)', icon: 'var(--apple-green)' },
  warning: { border: 'rgba(255, 159, 10, 0.3)', icon: 'var(--apple-orange)' },
  error: { border: 'rgba(255, 69, 58, 0.3)', icon: 'var(--apple-red)' },
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const removeToast = useToastStore((s) => s.removeToast)

  return (
    <div className="absolute top-4 right-4 z-40 flex flex-col gap-2.5 w-80 pointer-events-none max-h-[40vh] overflow-y-auto">
      {toasts.map((toast, idx) => {
        const Icon = ICONS[toast.type]
        const color = COLORS[toast.type]
        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 px-4 py-3.5 rounded-[16px] animate-slide-in-right"
            style={{
              background: 'var(--glass-bg-strong)',
              backdropFilter: 'var(--glass-backdrop-strong)',
              WebkitBackdropFilter: 'var(--glass-backdrop-strong)',
              border: `1px solid ${color.border}`,
              boxShadow: 'var(--shadow-lg)',
              animationDelay: `${idx * 40}ms`,
            }}
          >
            <Icon size={16} strokeWidth={1.5} style={{ color: color.icon, marginTop: 2 }} />
            <span className="text-[13px] flex-1 leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              {toast.message}
            </span>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex items-center justify-center h-5 w-5 rounded-md transition-colors shrink-0 mt-0.5"
              style={{ color: 'var(--text-quaternary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-hover)'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text-quaternary)'
              }}
            >
              <X size={12} strokeWidth={2} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
