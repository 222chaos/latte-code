export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 px-1 py-2 animate-fade-in">
      {/* ── Bot Mini Avatar ── */}
      <div
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px]"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          color: 'var(--accent)',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>
        </svg>
      </div>

      {/* ── Bouncing Dots ── */}
      <div
        className="flex items-center gap-[6px] px-3.5 py-2.5 rounded-[14px]"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
        }}
      >
        <span
          className="h-[6px] w-[6px] rounded-full"
          style={{
            background: 'var(--accent)',
            animation: 'typing-dot 1.4s ease-in-out infinite',
            animationDelay: '0ms',
          }}
        />
        <span
          className="h-[6px] w-[6px] rounded-full"
          style={{
            background: 'var(--accent)',
            animation: 'typing-dot 1.4s ease-in-out infinite',
            animationDelay: '160ms',
          }}
        />
        <span
          className="h-[6px] w-[6px] rounded-full"
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
