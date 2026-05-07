import { useGuiStore } from '../../store/guiStore.ts'
import { Sun, Moon, Settings, GitBranch, CircleDollarSign, Wifi, WifiOff } from 'lucide-react'

export default function StatusBar() {
  const connected = useGuiStore((s) => s.connected)
  const model = useGuiStore((s) => s.model)
  const branch = useGuiStore((s) => s.branch)
  const cost = useGuiStore((s) => s.cost)
  const theme = useGuiStore((s) => s.theme)
  const setTheme = useGuiStore((s) => s.setTheme)

  return (
    <div
      className="flex h-7 items-center justify-between px-3 select-none shrink-0 z-10"
      style={{
        background: 'var(--sidebar-bg)',
        backdropFilter: 'var(--sidebar-backdrop)',
        borderTop: '1px solid var(--border-color)',
      }}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          {connected ? (
            <Wifi size={10} style={{ color: '#34C759' }} />
          ) : (
            <WifiOff size={10} style={{ color: '#FF3B30' }} />
          )}
          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>

        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--card-bg)', color: 'var(--text-secondary)' }}>
          {model}
        </span>

        {branch && (
          <div className="hidden sm:flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            <GitBranch size={9} />
            {branch}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
          <CircleDollarSign size={10} />
          <span className="tabular-nums">{cost.toFixed(4)}</span>
        </div>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-1 rounded hover:bg-white/5 transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={12} /> : <Moon size={12} />}
        </button>

        <button
          className="p-1 rounded hover:bg-white/5 transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          title="Settings"
        >
          <Settings size={12} />
        </button>
      </div>
    </div>
  )
}
