import { memo, useRef, useEffect, useCallback } from 'react'
import { useGuiStore } from '../../store/guiStore.ts'
import { sendWsMessage } from '../../hooks/useWebSocket.ts'
import { Bot, Sparkles, Zap, Code, FileCode, Bug } from 'lucide-react'
import AssistantMessage from '../chat/AssistantMessage.tsx'
import ToolCallCard from '../chat/ToolCallCard.tsx'
import ToolResultBlock from '../chat/ToolResultBlock.tsx'
import TypingIndicator from '../chat/TypingIndicator.tsx'
import ScrollButton from './ScrollButton.tsx'
import PermissionCard from '../permissions/PermissionCard.tsx'
import MessageActions from '../chat/MessageActions.tsx'
import type { GuiMessageItem, GuiToolCall } from '../../shared/protocol.ts'

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

/* ── Memoized Message Row ── */
interface MessageRowProps {
  msg: GuiMessageItem
  idx: number
  prevTimestamp?: number
  isLast: boolean
  isGenerating: boolean
  totalCount: number
  toolCalls: GuiToolCall['payload'][]
}

const MessageRow = memo(function MessageRow({ msg, idx, prevTimestamp, isLast, isGenerating, totalCount, toolCalls }: MessageRowProps) {
  // Note: toolCalls is a prop (not a store subscription) so memo can compare it.
  // A custom comparator below skips toolCalls comparison for messages without tool uses.
  const isUser = msg.role === 'user'
  const time = formatTime(msg.timestamp)
  const showDivider = idx === 0 || (prevTimestamp !== undefined && !isSameDay(msg.timestamp, prevTimestamp))
  const shouldAnimate = idx >= totalCount - 8
  const animDelay = shouldAnimate ? `${Math.min((idx - (totalCount - 8)) * 30, 300)}ms` : undefined

  return (
    <div style={{ contentVisibility: 'auto', containIntrinsicSize: '0 80px' }}>
      {/* ── Date Divider ── */}
      {showDivider && (
        <div className="flex items-center justify-center my-5 md:my-6">
          <div className="h-px flex-1" style={{ background: 'var(--border-color-subtle)' }} />
          <span
            className="px-3 text-[10px] font-medium uppercase tracking-[0.08em]"
            style={{ color: 'var(--text-quaternary)' }}
          >
            {formatDateDivider(msg.timestamp)}
          </span>
          <div className="h-px flex-1" style={{ background: 'var(--border-color-subtle)' }} />
        </div>
      )}

      {isUser ? (
        /* ── User Message ── */
        <div
          className={`flex justify-end group ${shouldAnimate ? 'animate-fade-in-up' : ''}`}
          style={animDelay ? { animationDelay: animDelay } : undefined}
        >
          <div className="max-w-[88%] sm:max-w-[82%] flex flex-col items-end gap-1">
            <div
              className="rounded-[20px] md:rounded-[22px] rounded-tr-sm px-4 md:px-5 py-2.5 md:py-3.5 text-[14px] md:text-[15px] leading-relaxed break-words"
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
                className="text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{ color: 'var(--text-quaternary)' }}
              >
                {time}
              </span>
              <MessageActions
                content={msg.content ?? ''}
                role="user"
                onEdit={() => {
                  const ta = document.querySelector('textarea[data-composer]') as HTMLTextAreaElement | null
                  if (ta) {
                    ta.value = msg.content
                    ta.dispatchEvent(new Event('input', { bubbles: true }))
                    ta.focus()
                  }
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        /* ── AI Message ── */
        <div
          className={`flex gap-3 md:gap-3.5 group ${shouldAnimate ? 'animate-fade-in-up' : ''}`}
          style={animDelay ? { animationDelay: animDelay } : undefined}
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
              <span className="text-[12px] md:text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                Claude
              </span>
              <span
                className="text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{ color: 'var(--text-quaternary)' }}
              >
                {time}
              </span>
              <MessageActions
                content={msg.content ?? ''}
                role="assistant"
                thinking={msg.thinking}
                onRegenerate={() => sendWsMessage({ type: 'user_input', payload: { content: '/retry' } })}
              />
            </div>

            {/* Content */}
            <div className="text-[14px] md:text-[15px] leading-[1.65] md:leading-[1.7]" style={{ color: 'var(--text-primary)' }}>
              <AssistantMessage
                content={msg.content}
                thinking={msg.thinking}
                streaming={isLast && isGenerating}
              />
            </div>

            {/* Tool Calls */}
            {msg.toolUses && msg.toolUses.length > 0 && (
              <div className="mt-3 md:mt-4 space-y-2 md:space-y-2.5">
                {msg.toolUses.map((tu) => {
                  const call = toolCalls.find(
                    (tc) => tc.toolUseId === tu.id || (tc.toolName === tu.name && tc.status === 'running')
                  )
                  const matchingResult = msg.toolResults?.find((tr) => tr.toolUseId === tu.id)
                  const derivedStatus = matchingResult
                    ? (matchingResult.isError ? 'error' : 'success')
                    : (call?.status ?? 'running')
                  return (
                    <ToolCallCard
                      key={tu.id}
                      toolName={tu.name}
                      input={tu.input}
                      status={derivedStatus as 'running' | 'success' | 'error'}
                      output={call?.output ?? matchingResult?.content}
                      durationMs={call?.durationMs}
                    />
                  )
                })}
              </div>
            )}

            {/* Tool Results */}
            {msg.toolResults?.map((tr) => (
              <ToolResultBlock key={tr.toolUseId} toolResult={tr} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}, (prev, next) => {
  if (prev.msg.id !== next.msg.id) return false
  if (prev.idx !== next.idx) return false
  if (prev.isLast !== next.isLast) return false
  if (prev.isGenerating !== next.isGenerating) return false
  if (prev.totalCount !== next.totalCount) return false
  if (prev.prevTimestamp !== next.prevTimestamp) return false
  if (prev.msg.content !== next.msg.content) return false
  if (prev.msg.thinking !== next.msg.thinking) return false
  if (prev.msg.toolUses !== next.msg.toolUses) return false
  if (prev.msg.toolResults !== next.msg.toolResults) return false
  if (next.msg.toolUses && next.msg.toolUses.length > 0 && prev.toolCalls !== next.toolCalls) return false
  return true
})

export default function MainContent() {
  const messages = useGuiStore((s) => s.messages)
  const isGenerating = useGuiStore((s) => s.isGenerating)
  const toolCalls = useGuiStore((s) => s.toolCalls)
  const scrollRef = useRef<HTMLDivElement>(null)
  const userScrolledUp = useRef(false)
  const pendingRaf = useRef(0)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    // Cancel any pending scroll to avoid stacking RAFs during rapid streaming
    if (pendingRaf.current) cancelAnimationFrame(pendingRaf.current)
    pendingRaf.current = requestAnimationFrame(() => {
      pendingRaf.current = 0
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
      if (!userScrolledUp.current || nearBottom) {
        el.scrollTop = el.scrollHeight
      }
    })
    return () => {
      if (pendingRaf.current) {
        cancelAnimationFrame(pendingRaf.current)
        pendingRaf.current = 0
      }
    }
  }, [messages])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    userScrolledUp.current = !nearBottom
  }, [])

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
                有什么可以帮你的吗？
              </h1>
              <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                输入任何问题，或选择下方快捷操作
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
          {messages.map((msg, idx) => (
            <MessageRow
              key={msg.id}
              msg={msg}
              idx={idx}
              prevTimestamp={messages[idx - 1]?.timestamp}
              isLast={idx === messages.length - 1}
              isGenerating={isGenerating}
              totalCount={messages.length}
              toolCalls={toolCalls}
            />
          ))}

          <PermissionCard />

          {isGenerating && (
            <TypingIndicator />
          )}
        </div>
      </div>
      <ScrollButton containerRef={scrollRef} />
    </div>
  )
}
