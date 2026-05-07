import { useState } from 'react'
import { useGuiStore } from '../../store/guiStore.ts'
import { Clock, Settings, X, MessageSquare, Sparkles, Pencil, Trash2, Check } from 'lucide-react'
import Tooltip from '../ui/Tooltip.tsx'

interface Props {
  onClose: () => void
}

export default function Sidebar({ onClose }: Props) {
  const sessions = useGuiStore((s) => s.sessions)
  const deleteSession = useGuiStore((s) => s.deleteSession)
  const renameSession = useGuiStore((s) => s.renameSession)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const startRename = (id: string, currentName: string) => {
    setEditingId(id)
    setEditValue(currentName)
  }

  const confirmRename = (id: string) => {
    if (editValue.trim()) {
      renameSession(id, editValue.trim())
    }
    setEditingId(null)
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 z-10 bg-black/50 md:hidden animate-fade-in"
        onClick={onClose}
      />

      <div
        className="flex flex-col w-[280px] md:w-[260px] shrink-0 overflow-hidden z-20 animate-slide-in-right fixed md:relative inset-y-0 left-0 md:inset-auto"
        style={{
          background: 'var(--glass-bg-strong)',
          backdropFilter: 'var(--glass-backdrop-strong)',
          WebkitBackdropFilter: 'var(--glass-backdrop-strong)',
          borderRight: '1px solid var(--glass-border)',
          boxShadow: '4px 0 24px rgba(0,0,0,0.3)',
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-4 md:px-3.5 py-3 shrink-0"
          style={{ borderBottom: '1px solid var(--border-color)' }}
        >
          <div className="flex items-center gap-2">
            <MessageSquare size={14} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
            <span
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Chats
            </span>
          </div>
          <Tooltip content="Close sidebar" side="bottom">
            <button
              onClick={onClose}
              className="flex items-center justify-center h-8 w-8 rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </Tooltip>
        </div>

        {/* ── Session List ── */}
        <div className="flex-1 overflow-y-auto p-3 md:p-2.5 space-y-0.5">
          {sessions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 md:py-10 px-4 text-center">
              <Sparkles size={20} strokeWidth={1.5} style={{ color: 'var(--text-quaternary)' }} className="mb-2.5" />
              <p className="text-[13px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>
                No chats yet
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-quaternary)' }}>
                Start a new conversation to see it here
              </p>
            </div>
          )}
          {sessions.map((s) => (
            <div
              key={s.id}
              className="group relative w-full"
            >
              {editingId === s.id ? (
                <div className="flex items-center gap-2 px-3 py-2">
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') confirmRename(s.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    onBlur={() => confirmRename(s.id)}
                    className="flex-1 text-[13px] bg-transparent outline-none px-2 py-1 rounded-lg"
                    style={{
                      color: 'var(--text-primary)',
                      border: '1px solid var(--accent)',
                      background: 'var(--bg-secondary)',
                    }}
                  />
                  <button
                    onClick={() => confirmRename(s.id)}
                    className="flex items-center justify-center h-6 w-6 rounded-md transition-colors"
                    style={{ color: 'var(--apple-green)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Check size={14} strokeWidth={2} />
                  </button>
                </div>
              ) : (
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-hover)'
                    e.currentTarget.style.color = 'var(--text-primary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }}
                >
                  <Clock
                    size={14}
                    strokeWidth={1.5}
                    style={{ color: 'var(--text-quaternary)' }}
                    className="shrink-0 group-hover:!text-[var(--text-tertiary)] transition-colors"
                  />
                  <span className="text-[13px] truncate flex-1">{s.name}</span>

                  {/* Actions - appear on hover */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Tooltip content="Rename" side="bottom" delay={300}>
                      <button
                        onClick={(e) => { e.stopPropagation(); startRename(s.id, s.name) }}
                        className="flex items-center justify-center h-6 w-6 rounded-md transition-colors"
                        style={{ color: 'var(--text-quaternary)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <Pencil size={12} strokeWidth={1.5} />
                      </button>
                    </Tooltip>
                    <Tooltip content="Delete" side="bottom" delay={300}>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSession(s.id) }}
                        className="flex items-center justify-center h-6 w-6 rounded-md transition-colors"
                        style={{ color: 'var(--text-quaternary)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 69, 58, 0.12)'
                          e.currentTarget.style.color = 'var(--apple-red)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.color = 'var(--text-quaternary)'
                        }}
                      >
                        <Trash2 size={12} strokeWidth={1.5} />
                      </button>
                    </Tooltip>
                  </div>

                  {s.status === 'active' && (
                    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Footer ── */}
        <div
          className="px-3 py-3 shrink-0"
          style={{ borderTop: '1px solid var(--border-color)' }}
        >
          <button
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
          >
            <Settings size={14} strokeWidth={1.5} />
            <span className="text-[13px]">Settings</span>
          </button>
        </div>
      </div>
    </>
  )
}
