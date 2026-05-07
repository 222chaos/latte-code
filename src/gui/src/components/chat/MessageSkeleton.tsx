export default function MessageSkeleton() {
  return (
    <div className="flex gap-3.5 animate-fade-in">
      {/* Avatar shimmer */}
      <div
        className="h-8 w-8 shrink-0 rounded-[10px] shimmer-bg"
        style={{ background: 'var(--card-bg)' }}
      />
      <div className="flex-1 space-y-2.5 pt-1 min-w-0">
        {/* Name line */}
        <div className="h-3.5 w-16 rounded-md shimmer-bg" style={{ background: 'var(--card-bg)' }} />
        {/* Content lines with shimmer */}
        <div className="space-y-2">
          <div className="h-4 w-full rounded-lg shimmer-bg" style={{ background: 'var(--card-bg)' }} />
          <div className="h-4 w-[92%] rounded-lg shimmer-bg" style={{ background: 'var(--card-bg)' }} />
          <div className="h-4 w-[78%] rounded-lg shimmer-bg" style={{ background: 'var(--card-bg)' }} />
          <div className="h-4 w-[45%] rounded-lg shimmer-bg" style={{ background: 'var(--card-bg)' }} />
        </div>
      </div>
    </div>
  )
}
