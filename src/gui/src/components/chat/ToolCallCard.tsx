import { useState } from 'react'
import { Wrench, ChevronDown, ChevronUp, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

interface Props {
  toolName: string
  input: Record<string, unknown>
  status: 'running' | 'success' | 'error'
  output?: string
  durationMs?: number
}

export default function ToolCallCard({ toolName, input, status, output, durationMs }: Props) {
  const [expanded, setExpanded] = useState(false)

  const statusConfig = {
    running: { icon: Loader2, color: 'var(--apple-orange)', bg: 'rgba(255, 149, 10, 0.12)', animate: 'animate-spin' },
    success: { icon: CheckCircle2, color: 'var(--apple-green)', bg: 'rgba(48, 209, 88, 0.12)', animate: '' },
    error: { icon: XCircle, color: 'var(--apple-red)', bg: 'rgba(255, 69, 58, 0.12)', animate: '' },
  }

  const cfg = statusConfig[status]
  const Icon = cfg.icon

  return (
    <div
      className="rounded-[14px] overflow-hidden text-sm transition-all"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      {/* ── Header ── */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3.5 py-3 text-left transition-colors"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--card-bg-hover)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
        }}
      >
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-[8px] shrink-0 ${cfg.animate}`}
          style={{ background: cfg.bg, color: cfg.color }}
        >
          <Icon size={14} strokeWidth={1.5} />
        </div>
        <span className="font-semibold text-[13px] flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
          {toolName}
        </span>
        {durationMs !== undefined && status !== 'running' && (
          <span className="text-[10px] font-mono tabular-nums" style={{ color: 'var(--text-quaternary)' }}>
            {(durationMs / 1000).toFixed(2)}s
          </span>
        )}
        {expanded ? (
          <ChevronUp size={14} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
        ) : (
          <ChevronDown size={14} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
        )}
      </button>

      {/* ── Expanded Content ── */}
      {expanded && (
        <div className="px-3.5 pb-3.5 space-y-2.5 animate-fade-in">
          <div
            className="rounded-[10px] px-3.5 py-2.5 text-[11px] font-mono overflow-x-auto"
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color-subtle)',
            }}
          >
            {JSON.stringify(input, null, 2)}
          </div>
          {output && (
            <div
              className="rounded-[10px] px-3.5 py-2.5 text-[11px] font-mono overflow-x-auto max-h-48 overflow-y-auto"
              style={{
                background: status === 'error' ? 'rgba(255, 69, 58, 0.06)' : 'rgba(0, 0, 0, 0.3)',
                color: status === 'error' ? 'var(--apple-red)' : 'var(--text-secondary)',
                border: '1px solid var(--border-color-subtle)',
              }}
            >
              {output}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
