import { Shield, Check, X, Infinity } from 'lucide-react'
import { sendWsMessage } from '../../hooks/useWebSocket.ts'
import { useGuiStore } from '../../store/guiStore.ts'

export default function PermissionCard() {
  const permissions = useGuiStore((s) => s.pendingPermissions)
  const removePermission = useGuiStore((s) => s.removePermission)

  if (permissions.length === 0) return null

  const respond = (requestId: string, behavior: 'allow' | 'deny' | 'always_allow') => {
    sendWsMessage({ type: 'user_permission_response', payload: { requestId, behavior } })
    removePermission(requestId)
  }

  return (
    <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4">
      <div className="flex flex-col gap-2.5 max-h-[60vh] overflow-y-auto no-scrollbar">
        {permissions.map((p, idx) => (
          <div
            key={p.requestId}
            className="rounded-2xl p-4 md:p-5 animate-slide-in-bottom"
            style={{
              background: 'var(--glass-bg-strong)',
              backdropFilter: 'var(--glass-backdrop-strong)',
              WebkitBackdropFilter: 'var(--glass-backdrop-strong)',
              border: '1px solid var(--glass-border)',
              boxShadow: 'var(--shadow-floating)',
              animationDelay: `${idx * 60}ms`,
            }}
          >
            {/* ── Header ── */}
            <div className="flex items-center gap-2.5 mb-3">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ background: 'rgba(255, 149, 0, 0.12)' }}
              >
                <Shield size={14} style={{ color: 'var(--apple-orange)' }} />
              </div>
              <span className="text-[13px] md:text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                Permission Request
              </span>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full ml-auto"
                style={{
                  background: 'rgba(255, 149, 0, 0.12)',
                  color: 'var(--apple-orange)',
                }}
              >
                {p.toolName}
              </span>
            </div>

            {/* ── Description ── */}
            <div
              className="rounded-xl px-3.5 py-2.5 text-[11px] md:text-[12px] font-mono mb-3.5 overflow-x-auto"
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color-subtle)',
              }}
            >
              {p.description}
            </div>

            {/* ── Actions ── */}
            <div className="flex gap-2">
              <button
                onClick={() => respond(p.requestId, 'allow')}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[12px] md:text-[13px] font-semibold transition-all"
                style={{
                  background: 'var(--apple-green)',
                  color: '#000',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                <Check size={14} strokeWidth={2.5} />
                Allow
              </button>
              <button
                onClick={() => respond(p.requestId, 'deny')}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[12px] md:text-[13px] font-semibold transition-all"
                style={{
                  background: 'var(--card-bg)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--card-border)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--card-bg-hover)'
                  e.currentTarget.style.borderColor = 'var(--card-border-hover)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--card-bg)'
                  e.currentTarget.style.borderColor = 'var(--card-border)'
                }}
              >
                <X size={14} strokeWidth={2.5} />
                Deny
              </button>
              <button
                onClick={() => respond(p.requestId, 'always_allow')}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[12px] md:text-[13px] font-semibold transition-all"
                style={{
                  background: 'var(--card-bg)',
                  color: 'var(--text-tertiary)',
                  border: '1px solid var(--card-border)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--card-bg-hover)'
                  e.currentTarget.style.borderColor = 'var(--card-border-hover)'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--card-bg)'
                  e.currentTarget.style.borderColor = 'var(--card-border)'
                  e.currentTarget.style.color = 'var(--text-tertiary)'
                }}
                title="Always allow this tool"
              >
                <Infinity size={14} strokeWidth={2} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
