import { useGuiStore } from '../../store/guiStore.ts'
import { GitBranch, Coffee } from 'lucide-react'

export default function TitleBar() {
  const sessionName = useGuiStore((s) => s.sessionName)
  const branch = useGuiStore((s) => s.branch)

  return (
    <div
      className="flex h-7 items-center justify-between px-3 select-none shrink-0 z-10"
      style={{
        background: 'var(--sidebar-bg)',
        backdropFilter: 'var(--sidebar-backdrop)',
        borderBottom: '1px solid var(--border-color)',
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex items-center gap-1 shrink-0">
          <div className="h-2 w-2 rounded-full bg-red-500/80" />
          <div className="h-2 w-2 rounded-full bg-yellow-500/80" />
          <div className="h-2 w-2 rounded-full bg-green-500/80" />
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <Coffee size={12} className="shrink-0" style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-semibold shrink-0" style={{ color: 'var(--text-primary)' }}>
            Latte
          </span>
          <span className="text-[10px] opacity-40 shrink-0" style={{ color: 'var(--text-secondary)' }}>/</span>
          <span className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
            {sessionName}
          </span>
        </div>
        {branch && (
          <div className="hidden sm:flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded shrink-0" style={{ background: 'var(--card-bg)', color: 'var(--text-tertiary)' }}>
            <GitBranch size={9} />
            {branch}
          </div>
        )}
      </div>
    </div>
  )
}
