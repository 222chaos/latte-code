import { useGuiStore } from '../../store/guiStore.ts'
import { FileCode, Palette, ListTodo, Settings, X, GitBranch } from 'lucide-react'
import DiffViewer from '../diff/DiffViewer.tsx'
import DesignStudio from '../design/DesignStudio.tsx'
import FileTree from '../diff/FileTree.tsx'
import PlanTree from '../design/PlanTree.tsx'

const TABS = [
  { id: 'sources' as const, label: 'Sources', icon: FileCode },
  { id: 'plan' as const, label: 'Plan', icon: ListTodo },
  { id: 'diff' as const, label: 'Diff', icon: GitBranch },
  { id: 'design' as const, label: 'Design', icon: Palette },
  { id: 'settings' as const, label: 'Settings', icon: Settings },
]

export default function Inspector() {
  const collapsed = useGuiStore((s) => s.inspectorCollapsed)
  const activeTab = useGuiStore((s) => s.activeInspectorTab)
  const toggle = useGuiStore((s) => s.toggleInspector)
  const setTab = useGuiStore((s) => s.setActiveInspectorTab)
  const diffs = useGuiStore((s) => s.diffs)
  const theme = useGuiStore((s) => s.theme)
  const setTheme = useGuiStore((s) => s.setTheme)
  const sources = useGuiStore((s) => s.sources)
  const planItems = useGuiStore((s) => s.planItems)
  const togglePlanItem = useGuiStore((s) => s.togglePlanItem)

  if (collapsed) return null

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className="absolute inset-0 z-40 bg-black/50 animate-fade-in md:bg-black/40"
        onClick={toggle}
      />

      {/* ── Panel ── */}
      <div
        className="absolute right-0 top-0 bottom-0 z-50 w-full md:w-[340px] flex flex-col animate-spring-in-right"
        style={{
          background: 'var(--glass-bg-strong)',
          backdropFilter: 'var(--glass-backdrop-strong)',
          WebkitBackdropFilter: 'var(--glass-backdrop-strong)',
          borderLeft: '1px solid var(--glass-border)',
          boxShadow: '-12px 0 48px rgba(0,0,0,0.4)',
        }}
      >
        {/* ── Tab Bar ── */}
        <div
          className="flex items-center justify-between px-4 md:px-3.5 py-3 shrink-0"
          style={{ borderBottom: '1px solid var(--border-color)' }}
        >
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] text-[11px] md:text-[12px] font-medium transition-all shrink-0"
                style={{
                  background: activeTab === tab.id ? 'var(--card-bg)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.background = 'var(--bg-hover)'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--text-tertiary)'
                  }
                }}
              >
                <tab.icon size={13} strokeWidth={1.5} />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.id === 'diff' && diffs.length > 0 && (
                  <span
                    className="ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                    style={{ background: 'var(--apple-red)', color: '#fff' }}
                  >
                    {diffs.length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={toggle}
            className="flex items-center justify-center h-7 w-7 rounded-lg transition-colors shrink-0 ml-2"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={15} strokeWidth={1.5} />
          </button>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'diff' && (
            <div className="space-y-3">
              {diffs.length === 0 ? (
                <EmptyState message="No file changes yet" />
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {diffs.length} file{diffs.length > 1 ? 's' : ''} changed
                    </span>
                  </div>
                  {diffs.map((d) => (
                    <DiffViewer
                      key={d.filePath}
                      filePath={d.filePath}
                      oldContent={d.oldContent}
                      newContent={d.newContent}
                      diff={d.diff}
                    />
                  ))}
                </>
              )}
            </div>
          )}

          {activeTab === 'design' && <DesignStudio />}

          {activeTab === 'sources' && (
            <div>
              {sources.length === 0 ? (
                <EmptyState message="No sources attached" />
              ) : (
                <FileTree files={sources} />
              )}
            </div>
          )}

          {activeTab === 'plan' && (
            <PlanTree items={planItems} onToggle={togglePlanItem} />
          )}

          {activeTab === 'settings' && (
            <div className="space-y-5">
              <Section title="Appearance">
                <div className="flex gap-2">
                  <ThemeButton active={theme === 'dark'} onClick={() => setTheme('dark')} label="Dark" />
                  <ThemeButton active={theme === 'light'} onClick={() => setTheme('light')} label="Light" />
                </div>
              </Section>

              <Section title="Keyboard Shortcuts">
                <div
                  className="rounded-[14px] px-3.5 py-3 space-y-2.5"
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                  }}
                >
                  <ShortcutRow keys={['Enter']} desc="Send message" />
                  <ShortcutRow keys={['Shift', 'Enter']} desc="New line" />
                  <ShortcutRow keys={['Esc']} desc="Dismiss dialog" />
                  <ShortcutRow keys={['Cmd/Ctrl', 'B']} desc="Toggle sidebar" />
                  <ShortcutRow keys={['Cmd/Ctrl', 'I']} desc="Toggle inspector" />
                  <ShortcutRow keys={['Cmd/Ctrl', 'K']} desc="Focus composer" />
                </div>
              </Section>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        className="text-[11px] font-semibold uppercase tracking-wider mb-3"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}

function ThemeButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 px-3 py-2.5 rounded-[12px] text-[13px] font-medium transition-all"
      style={{
        background: active ? 'var(--accent)' : 'var(--card-bg)',
        color: active ? '#fff' : 'var(--text-secondary)',
        border: active ? 'none' : '1px solid var(--card-border)',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'var(--card-bg-hover)'
          e.currentTarget.style.borderColor = 'var(--card-border-hover)'
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'var(--card-bg)'
          e.currentTarget.style.borderColor = 'var(--card-border)'
        }
      }}
    >
      {label}
    </button>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-10">
      <p className="text-[13px] font-medium" style={{ color: 'var(--text-quaternary)' }}>
        {message}
      </p>
    </div>
  )
}

function ShortcutRow({ keys, desc }: { keys: string[]; desc: string }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span style={{ color: 'var(--text-secondary)' }}>{desc}</span>
      <div className="flex gap-1">
        {keys.map((k) => (
          <kbd
            key={k}
            className="px-1.5 py-0.5 rounded-md text-[10px] font-mono"
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--text-tertiary)',
              border: '1px solid var(--card-border)',
              boxShadow: 'var(--shadow-inset)',
            }}
          >
            {k}
          </kbd>
        ))}
      </div>
    </div>
  )
}
