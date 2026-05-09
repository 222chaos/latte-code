import { useState, useRef, useCallback, useEffect } from 'react'
import { useWebSocket } from '../../hooks/useWebSocket.ts'
import { useGuiStore } from '../../store/guiStore.ts'
import { useToastStore } from '../../store/toastStore.ts'
import { Send, Paperclip, ChevronDown, ArrowUp, Square, X, Clock } from 'lucide-react'
import Tooltip from '../ui/Tooltip.tsx'

const FALLBACK_MODELS = [
  { id: 'claude-opus-4', name: 'Claude Opus 4', tag: 'Opus' },
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', tag: 'Sonnet' },
  { id: 'deepseek-chat', name: 'DeepSeek V3', tag: 'DeepSeek' },
  { id: 'gpt-4o', name: 'GPT-4o', tag: 'OpenAI' },
]

function getTag(name: string): string {
  // Extract first word or short prefix as tag
  const firstWord = name.split(/[\s\-]/)[0]
  if (firstWord.length <= 6) return firstWord
  return firstWord.slice(0, 5)
}

export default function Composer() {
  const [value, setValue] = useState('')
  const [modelOpen, setModelOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const [attachments, setAttachments] = useState<{ name: string; dataUrl: string }[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastSubmitTime = useRef(0)
  const { send } = useWebSocket()
  const model = useGuiStore((s) => s.model)
  const setModel = useGuiStore((s) => s.setSessionInfo)
  const isGenerating = useGuiStore((s) => s.isGenerating)
  const isHistoryView = useGuiStore((s) => s.isHistoryView)
  const availableModels = useGuiStore((s) => s.availableModels)

  const handleSubmit = useCallback(() => {
    if (isGenerating || isHistoryView) return
    const now = Date.now()
    if (now - lastSubmitTime.current < 300) return
    lastSubmitTime.current = now
    const trimmed = value.trim()
    if (!trimmed && attachments.length === 0) return
    send({
      type: 'user_input',
      payload: {
        content: trimmed || (attachments.length > 0 ? `Attached ${attachments.length} file(s)` : ''),
        attachments: attachments.map((a) => a.dataUrl),
      },
    })
    setValue('')
    setAttachments([])
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, attachments, send, isGenerating, isHistoryView])

  const handleStop = useCallback(() => {
    send({ type: 'user_interrupt' })
  }, [send])

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

  const models = availableModels.length > 0
    ? availableModels.map((m) => ({ ...m, tag: getTag(m.name) }))
    : FALLBACK_MODELS
  const currentModel = models.find((m) => m.id === model || (model === '' && m.id === 'default')) || models[0]
  const hasValue = value.trim().length > 0

  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  const MAX_ATTACHMENTS = 5

  const processFile = (file: File) => {
    if (attachments.length >= MAX_ATTACHMENTS) {
      useToastStore.getState().addToast({
        type: 'warning',
        message: `Maximum ${MAX_ATTACHMENTS} attachments allowed`,
        duration: 3000,
      })
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      useToastStore.getState().addToast({
        type: 'error',
        message: `File too large: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB > 10MB limit)`,
        duration: 4000,
      })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setAttachments((prev) => prev.length < MAX_ATTACHMENTS ? [...prev, { name: file.name, dataUrl: reader.result as string }] : prev)
    }
    reader.onerror = () => {
      useToastStore.getState().addToast({ type: 'error', message: `Failed to read file: ${file.name}`, duration: 3000 })
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="shrink-0 px-3 md:px-4 pb-4 md:pb-5 pt-2" style={{ background: 'var(--content-bg)' }}>
      <div className="max-w-3xl mx-auto">
        {isHistoryView && (
          <div className="mb-2 px-3 py-1.5 rounded-xl text-[11px] md:text-[12px] font-medium text-center flex items-center justify-center gap-1.5"
            style={{ background: 'var(--card-bg)', color: 'var(--text-tertiary)', border: '1px solid var(--card-border)' }}
          >
            <Clock size={12} strokeWidth={1.5} />
            Viewing past conversation — new messages will continue without historical context
          </div>
        )}
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
            opacity: isHistoryView ? 0.7 : 1,
          }}
        >
          {/* ── Attach ── */}
          <Tooltip content="Attach file" side="top">
            <button
              className="flex items-center justify-center h-8 w-8 md:h-9 md:w-9 shrink-0 rounded-xl transition-colors"
              style={{ color: 'var(--text-quaternary)' }}
              onClick={() => fileInputRef.current?.click()}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Paperclip size={18} strokeWidth={1.5} />
            </button>
          </Tooltip>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              Array.from(e.target.files || []).forEach(processFile)
              e.target.value = ''
            }}
          />

          {/* ── Textarea ── */}
          <textarea
            ref={textareaRef}
            data-composer
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={(e) => {
              const items = e.clipboardData?.items
              if (!items) return
              const files: File[] = []
              for (const item of items) {
                if (item.kind === 'file') {
                  const file = item.getAsFile()
                  if (file) files.push(file)
                }
              }
              if (files.length === 0) return
              e.preventDefault()
              files.forEach(processFile)
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={isHistoryView ? 'Viewing past conversation...' : 'Ask anything...'}
            rows={1}
            readOnly={isHistoryView}
            className="flex-1 resize-none bg-transparent text-[14px] md:text-[15px] leading-relaxed outline-none py-2 md:py-2.5 placeholder:text-[var(--text-quaternary)]"
            style={{ color: 'var(--text-primary)', maxHeight: '200px' }}
          />

          {/* ── Right Actions ── */}
          <div className="flex items-center gap-1 md:gap-1.5 shrink-0 pb-0.5">
            {/* ── Model Selector ── */}
            <div className="relative hidden sm:block">
              <Tooltip content={isGenerating ? 'Wait for response to finish' : 'Select model'} side="top">
                <button
                  onClick={() => !isGenerating && setModelOpen(!modelOpen)}
                  disabled={isGenerating}
                  className="flex items-center gap-1 h-7 md:h-8 px-2 md:px-2.5 rounded-lg text-[10px] md:text-[11px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                    {models.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          const modelId = m.id === 'default' ? '' : m.id
                          setModel({ model: modelId })
                          setModelOpen(false)
                          send({ type: 'user_input', payload: { content: `/model ${modelId || 'default'}` } })
                          useToastStore.getState().addToast({
                            type: 'info',
                            message: `Switched to ${m.name}`,
                            duration: 2000,
                          })
                        }}
                        className="w-full text-left px-3.5 py-2.5 transition-colors flex items-center gap-3"
                        style={{ color: (model === m.id || (model === '' && m.id === 'default')) ? 'var(--accent)' : 'var(--text-secondary)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium">{m.name}</div>
                          <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-quaternary)' }}>
                            {m.id}
                          </div>
                        </div>
                        {(model === m.id || (model === '' && m.id === 'default')) && (
                          <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* ── Stop / Send Button ── */}
            {isGenerating ? (
              <Tooltip content="Stop generating" side="top">
                <button
                  onClick={handleStop}
                  className="flex items-center justify-center h-8 w-8 md:h-9 md:w-9 rounded-xl transition-all"
                  style={{
                    background: 'var(--apple-red)',
                    color: '#fff',
                  }}
                >
                  <Square size={14} strokeWidth={2.5} fill="currentColor" />
                </button>
              </Tooltip>
            ) : (
              <Tooltip content={isHistoryView ? 'Start a new chat to continue' : (hasValue ? 'Send message' : 'Type a message')} side="top">
                <button
                  onClick={handleSubmit}
                  disabled={!hasValue || isHistoryView}
                  className="flex items-center justify-center h-8 w-8 md:h-9 md:w-9 rounded-xl transition-all"
                  style={{
                    background: hasValue && !isHistoryView ? 'var(--accent)' : 'transparent',
                    color: '#fff',
                    opacity: hasValue && !isHistoryView ? 1 : 0.3,
                  }}
                >
                  {hasValue && !isHistoryView ? (
                    <ArrowUp size={18} strokeWidth={2.5} />
                  ) : (
                    <Send size={18} strokeWidth={1.5} />
                  )}
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        {/* ── Attachments preview ── */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 mb-1">
            {attachments.map((a, i) => {
              const isImage = a.dataUrl.startsWith('data:image')
              return (
                <div
                  key={i}
                  className="flex items-center gap-1.5 rounded-lg text-[11px] font-medium overflow-hidden"
                  style={{
                    background: 'var(--card-bg)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--card-border)',
                  }}
                >
                  {isImage ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1">
                      <img
                        src={a.dataUrl}
                        alt={a.name}
                        className="h-6 w-6 rounded object-cover"
                        draggable={false}
                      />
                      <span className="truncate max-w-[100px]">{a.name}</span>
                      <button
                        onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                        className="ml-0.5 rounded-md transition-colors"
                        style={{ color: 'var(--text-quaternary)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--apple-red)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-quaternary)')}
                      >
                        <X size={12} strokeWidth={2} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1">
                      <Paperclip size={11} strokeWidth={1.5} />
                      <span className="truncate max-w-[120px]">{a.name}</span>
                      <button
                        onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                        className="ml-0.5 rounded-md transition-colors"
                        style={{ color: 'var(--text-quaternary)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--apple-red)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-quaternary)')}
                      >
                        <X size={12} strokeWidth={2} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Hint ── */}
        <p className="text-center text-[10px] md:text-[11px] mt-2 font-medium" style={{ color: 'var(--text-quaternary)' }}>
          Shift + Enter for new line
        </p>
      </div>
    </div>
  )
}
