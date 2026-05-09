import { Bot } from 'lucide-react'

export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 px-1 py-2 animate-fade-in">
      {/* ── Bot Mini Avatar ── */}
      <div
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          color: 'var(--accent)',
        }}
      >
        <Bot size={13} strokeWidth={1.5} />
      </div>

      {/* ── Bouncing Dots ── */}
      <div
        className="flex items-center gap-[5px] px-3 py-2 rounded-xl"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
        }}
      >
        <span
          className="h-[5px] w-[5px] rounded-full"
          style={{
            background: 'var(--accent)',
            animation: 'typing-dot 1.4s ease-in-out infinite',
            animationDelay: '0ms',
          }}
        />
        <span
          className="h-[5px] w-[5px] rounded-full"
          style={{
            background: 'var(--accent)',
            animation: 'typing-dot 1.4s ease-in-out infinite',
            animationDelay: '160ms',
          }}
        />
        <span
          className="h-[5px] w-[5px] rounded-full"
          style={{
            background: 'var(--accent)',
            animation: 'typing-dot 1.4s ease-in-out infinite',
            animationDelay: '320ms',
          }}
        />
      </div>
    </div>
  )
}
