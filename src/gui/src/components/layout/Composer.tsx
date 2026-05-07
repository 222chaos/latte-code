import { useState, useRef, useCallback, useEffect } from 'react'
import { useWebSocket } from '../../hooks/useWebSocket.ts'
import { useGuiStore } from '../../store/guiStore.ts'
import { Send, Paperclip, ChevronDown, ArrowUp } from 'lucide-react'
import Tooltip from '../ui/Tooltip.tsx'

const MODELS = [
  { id: 'claude-opus-4', name: 'Claude Opus 4', tag: 'Opus' },
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', tag: 'Sonnet' },
  { id: 'deepseek-chat', name: 'DeepSeek V3', tag: 'DeepSeek' },
  { id: 'gpt-4o', name: 'GPT-4o', tag: 'OpenAI' },
]

export default function Composer() {
  const [value, setValue] = useState('')
  const [modelOpen, setModelOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { send } = useWebSocket()
  const model = useGuiStore((s) => s.model)
  const setModel = useGuiStore((s) => s.setSessionInfo)

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed) return
    send({ type: 'user_input', payload: { content: trimmed } })
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, send])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [value])

  const currentModel = MODELS.find((m) => m.id === model) || MODELS[0]
  const hasValue = value.trim().length > 0

  return (
    <div className="shrink-0 px-3 md:px-4 pb-4 md:pb-5 pt-2" style={{ background: 'var(--content-bg)' }}>
      <div className="max-w-3xl mx-auto">
        <div
          className="flex items-end gap-1.5 md:gap-2 rounded-[20px] md:rounded-[24px] px-3 md:px-4 py-2.5 md:py-3 transition-all"
          style={{
            background: 'var(--card-bg)',
            border: focused
              ? '1px solid var(--accent)'
              : '1px solid var(--card-border)',
            boxShadow: focused
              ? '0 0 0 3px var(--accent-muted), 0 4px 24px rgba(0,0,0,0.2)'
              : '0 4px 24px rgba(0,0,0,0.15)',
          }}
        >
          {/* ── Attach ── */}
          <Tooltip content="Attach file" side="top">
            <button
              className="flex items-center justify-center h-8 w-8 md:h-9 md:w-9 shrink-0 rounded-xl transition-colors"
              style={{ color: 'var(--text-quaternary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Paperclip size={18} strokeWidth={1.5} />
            </button>
          </Tooltip>

          {/* ── Textarea ── */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Ask anything..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-[14px] md:text-[15px] leading-relaxed outline-none py-2 md:py-2.5 placeholder:text-[var(--text-quaternary)]"
            style={{ color: 'var(--text-primary)', maxHeight: '200px' }}
          />

          {/* ── Right Actions ── */}
          <div className="flex items-center gap-1 md:gap-1.5 shrink-0 pb-0.5">
            {/* ── Model Selector ── */}
            <div className="relative hidden sm:block">
              <Tooltip content="Select model" side="top">
                <button
                  onClick={() => setModelOpen(!modelOpen)}
                  className="flex items-center gap-1 h-7 md:h-8 px-2 md:px-2.5 rounded-lg text-[10px] md:text-[11px] font-medium transition-colors"
                  style={{
                    color: 'var(--text-tertiary)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color-subtle)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-hover)'
                    e.currentTarget.style.borderColor = 'var(--border-color)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bg-secondary)'
                    e.currentTarget.style.borderColor = 'var(--border-color-subtle)'
                  }}
                >
                  {currentModel.tag}
                  <ChevronDown
                    size={11}
                    strokeWidth={1.5}
                    className={`transition-transform ${modelOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              </Tooltip>
              {modelOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setModelOpen(false)} />
                  <div
                    className="absolute bottom-full right-0 mb-2 w-52 md:w-56 rounded-[14px] md:rounded-[16px] py-2 z-50 animate-fade-in-up"
                    style={{
                      background: 'var(--glass-bg-strong)',
                      backdropFilter: 'var(--glass-backdrop-strong)',
                      WebkitBackdropFilter: 'var(--glass-backdrop-strong)',
                      border: '1px solid var(--glass-border)',
                      boxShadow: 'var(--shadow-lg)',
                    }}
                  >
                    {MODELS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => { setModel({ model: m.id }); setModelOpen(false) }}
                        className="w-full text-left px-3.5 py-2.5 transition-colors flex items-center gap-3"
                        style={{ color: model === m.id ? 'var(--accent)' : 'var(--text-secondary)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium">{m.name}</div>
                          <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-quaternary)' }}>
                            {m.id}
                          </div>
                        </div>
                        {model === m.id && (
                          <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* ── Send Button ── */}
            <Tooltip content={hasValue ? 'Send message' : 'Type a message'} side="top">
              <button
                onClick={handleSubmit}
                disabled={!hasValue}
                className="flex items-center justify-center h-8 w-8 md:h-9 md:w-9 rounded-xl transition-all"
                style={{
                  background: hasValue ? 'var(--accent)' : 'transparent',
                  color: '#fff',
                  opacity: hasValue ? 1 : 0.3,
                }}
              >
                {hasValue ? (
                  <ArrowUp size={18} strokeWidth={2.5} />
                ) : (
                  <Send size={18} strokeWidth={1.5} />
                )}
              </button>
            </Tooltip>
          </div>
        </div>

        {/* ── Hint ── */}
        <p className="text-center text-[10px] md:text-[11px] mt-2 font-medium" style={{ color: 'var(--text-quaternary)' }}>
          Shift + Enter for new line
        </p>
      </div>
    </div>
  )
}
