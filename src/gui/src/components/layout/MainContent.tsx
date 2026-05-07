import { useRef, useEffect } from 'react'
import { useGuiStore } from '../../store/guiStore.ts'
import { sendWsMessage } from '../../hooks/wsSender.ts'
import { Bot, Sparkles, Zap, Code, FileCode, Bug } from 'lucide-react'
import AssistantMessage from '../chat/AssistantMessage.tsx'
import ToolCallCard from '../chat/ToolCallCard.tsx'
import TypingIndicator from '../chat/TypingIndicator.tsx'
import ScrollButton from './ScrollButton.tsx'
import PermissionCard from '../permissions/PermissionCard.tsx'
import MessageActions from '../chat/MessageActions.tsx'

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function isSameDay(a: number, b: number) {
  const d1 = new Date(a)
  const d2 = new Date(b)
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()
}

function formatDateDivider(ts: number) {
  const d = new Date(ts)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)

  if (isSameDay(ts, now.getTime())) return 'Today'
  if (isSameDay(ts, yesterday.getTime())) return 'Yesterday'
  return d.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

const QUICK_ACTIONS = [
  { icon: Code, label: 'Explain this code' },
  { icon: Zap, label: 'Refactor to TypeScript' },
  { icon: FileCode, label: 'Write unit tests' },
  { icon: Bug, label: 'Debug an error' },
]

export default function MainContent() {
  const messages = useGuiStore((s) => s.messages)
  const toolCalls = useGuiStore((s) => s.toolCalls)
  const isStreaming = useGuiStore((s) => {
    const hasRunningTools = s.toolCalls.some((tc) => tc.status === 'running')
    const lastMsg = s.messages[s.messages.length - 1]
    const lastIsIncomplete = lastMsg?.role === 'assistant' && lastMsg.done === false
    return hasRunningTools || lastIsIncomplete
  })
  const scrollRef = useRef<HTMLDivElement>(null)
  const shouldScrollRef = useRef(true)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (shouldScrollRef.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages, toolCalls])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    shouldScrollRef.current = nearBottom
  }

  return (
    <div className="flex-1 overflow-hidden relative">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="absolute inset-0 overflow-y-auto"
        style={{ background: 'var(--content-bg)' }}
      >
        {/* ── Empty State ── */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-full gap-5 md:gap-6 px-4 md:px-6 py-10 md:py-12">
            <div
              className="h-16 w-16 md:h-[72px] md:w-[72px] rounded-[18px] md:rounded-[22px] flex items-center justify-center"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <Sparkles size={32} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
            </div>
            <div className="text-center space-y-1.5">
              <h1
                className="text-xl md:text-[22px] font-semibold tracking-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                How can I help you today?
              </h1>
              <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                Ask anything or choose a quick action below
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 md:gap-2.5 mt-1 md:mt-2 max-w-lg">
              {QUICK_ACTIONS.map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  onClick={() => sendWsMessage({ type: 'user_input', payload: { content: label } })}
                  className="flex items-center gap-2 px-3.5 md:px-4 py-2 md:py-2.5 rounded-xl text-[13px] transition-all group"
                  style={{
                    background: 'var(--card-bg)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--card-border)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--card-bg-hover)'
                    e.currentTarget.style.borderColor = 'var(--card-border-hover)'
                    e.currentTarget.style.transform = 'scale(1.02)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--card-bg)'
                    e.currentTarget.style.borderColor = 'var(--card-border)'
                    e.currentTarget.style.transform = 'scale(1)'
                  }}
                >
                  <Icon size={14} strokeWidth={1.5} className="transition-colors group-hover:!text-[var(--accent)]" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Messages ── */}
        <div className="max-w-3xl mx-auto px-3 md:px-4 py-6 md:py-8 space-y-6 md:space-y-8">
          {messages.map((msg, idx) => {
            const isLast = idx === messages.length - 1
            const isUser = msg.role === 'user'
            const time = formatTime(msg.timestamp)
            const showDivider = idx === 0 || !isSameDay(msg.timestamp, messages[idx - 1].timestamp)

            return (
              <div key={msg.id}>
                {/* ── Date Divider ── */}
                {showDivider && (
                  <div className="flex items-center justify-center my-6 md:my-8">
                    <div className="h-px flex-1" style={{ background: 'var(--border-color)' }} />
                    <span
                      className="px-3 text-[10px] md:text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-quaternary)' }}
                    >
                      {formatDateDivider(msg.timestamp)}
                    </span>
                    <div className="h-px flex-1" style={{ background: 'var(--border-color)' }} />
                  </div>
                )}

                {isUser ? (
                  /* ── User Message ── */
                  <div
                    className="flex justify-end animate-fade-in-up group"
                    style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                  >
                    <div className="max-w-[88%] md:max-w-[82%] flex flex-col items-end gap-1">
                      <div
                        className="rounded-[20px] md:rounded-[22px] rounded-tr-sm px-4 md:px-5 py-2.5 md:py-3.5 text-[14px] md:text-[15px] leading-relaxed"
                        style={{
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-color-subtle)',
                          boxShadow: 'var(--shadow-xs)',
                        }}
                      >
                        {msg.content}
                      </div>
                      <div className="flex items-center gap-2 mr-1">
                        <span
                          className="text-[10px] font-medium"
                          style={{ color: 'var(--text-quaternary)' }}
                        >
                          {time}
                        </span>
                        <MessageActions content={msg.content} role="user" />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── AI Message ── */
                  <div
                    className="flex gap-3 md:gap-3.5 animate-fade-in-up group"
                    style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                  >
                    {/* Avatar */}
                    <div
                      className="flex h-7 w-7 md:h-8 md:w-8 shrink-0 items-center justify-center rounded-[8px] md:rounded-[10px] mt-0.5"
                      style={{
                        background: 'var(--card-bg)',
                        border: '1px solid var(--card-border)',
                        color: 'var(--accent)',
                        boxShadow: 'var(--shadow-xs)',
                      }}
                    >
                      <Bot size={16} strokeWidth={1.5} />
                    </div>

                    <div className="flex-1 min-w-0 pt-0.5">
                      {/* Name + Time + Actions */}
                      <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                        <span
                          className="text-[12px] md:text-[13px] font-semibold"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          Claude
                        </span>
                        <span
                          className="text-[10px] font-medium"
                          style={{ color: 'var(--text-quaternary)' }}
                        >
                          {time}
                        </span>
                        <MessageActions content={msg.content} role="assistant" />
                      </div>

                      {/* Content */}
                      <div
                        className="text-[14px] md:text-[15px] leading-[1.65] md:leading-[1.7]"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <AssistantMessage
                          content={msg.content}
                          thinking={msg.thinking}
                          streaming={isLast && isStreaming}
                        />
                      </div>

                      {/* Note: msg.toolUses / msg.toolResults are not populated by the current
                          WebSocket handler. Tool calls are rendered globally below instead. */}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          <PermissionCard />

          {isStreaming && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
            <TypingIndicator />
          )}

          {toolCalls.length > 0 && (
            <div className="space-y-2 md:space-y-2.5">
              {toolCalls.map((tc) => (
                <ToolCallCard
                  key={tc.toolUseId || `${tc.toolName}-${JSON.stringify(tc.input)}`}
                  toolName={tc.toolName}
                  input={tc.input}
                  status={tc.status}
                  output={tc.output}
                  durationMs={tc.durationMs}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <ScrollButton containerRef={scrollRef} />
    </div>
  )
}
