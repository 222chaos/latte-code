import { useState, useCallback } from 'react'
import { useWebSocket } from './hooks/useWebSocket.ts'
import { sendWsMessage } from './hooks/wsSender.ts'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.ts'
import { useDragDrop } from './hooks/useDragDrop.ts'
import { useGuiStore } from './store/guiStore.ts'
import { Menu, Plus, X, Upload } from 'lucide-react'
import Sidebar from './components/layout/Sidebar.tsx'
import MainContent from './components/layout/MainContent.tsx'
import Inspector from './components/layout/Inspector.tsx'
import Composer from './components/layout/Composer.tsx'
import ToastContainer from './components/layout/ToastContainer.tsx'
import ErrorBoundary from './components/layout/ErrorBoundary.tsx'
import Tooltip from './components/ui/Tooltip.tsx'

export default function App() {
  useWebSocket()
  useKeyboardShortcuts()
  const connected = useGuiStore((s) => s.connected)
  const sessionName = useGuiStore((s) => s.sessionName)
  const model = useGuiStore((s) => s.model)

  const dragState = useDragDrop((files) => {
    if (files.length > 0) {
      const names = files.map((f) => f.name).join(', ')
      sendWsMessage({ type: 'user_input', payload: { content: `[Attached: ${names}]`, attachments: files.map((f) => f.name) } })
    }
  })

  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleNewChat = useCallback(() => {
    sendWsMessage({ type: 'gui_create_session', payload: {} })
    setSidebarOpen(false)
  }, [])

  if (!connected) {
    return (
      <div
        className="h-full w-full flex items-center justify-center"
        style={{ background: 'var(--content-bg)' }}
      >
        <div className="text-center space-y-6 animate-fade-in">
          {/* Apple-style spinner */}
          <div className="relative h-11 w-11 mx-auto">
            <svg className="animate-spin" viewBox="0 0 44 44" fill="none">
              <circle
                cx="22" cy="22" r="20"
                stroke="var(--text-quaternary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="60 90"
              />
              <circle
                cx="22" cy="22" r="20"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="30 120"
                opacity="0.6"
              />
            </svg>
          </div>
          <div className="space-y-1.5">
            <p className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              Connecting to Latte CLI...
            </p>
            <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
              Make sure the GUI server is running
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div
        className="h-full w-full overflow-hidden flex flex-col relative"
        style={{ background: 'var(--content-bg)' }}
      >
        {/* ── Drag overlay ── */}
        {dragState.isDragging && (
          <div
            className="absolute inset-0 z-[100] flex items-center justify-center m-4 md:m-6 rounded-[24px] md:rounded-[28px] animate-fade-in"
            style={{
              background: 'rgba(217, 119, 87, 0.10)',
              border: '2px dashed var(--accent)',
              backdropFilter: 'blur(12px) saturate(150%)',
            }}
          >
            <div className="text-center space-y-3 animate-fade-in-scale">
              <div
                className="h-16 w-16 rounded-[20px] flex items-center justify-center mx-auto"
                style={{
                  background: 'var(--glass-bg)',
                  backdropFilter: 'var(--glass-backdrop)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <Upload size={32} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
              </div>
              <p className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                Drop files to attach
              </p>
              <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                Release to upload
              </p>
            </div>
          </div>
        )}

        {/* ── Header (Apple Glassmorphism) ── */}
        <header
          className="flex h-11 md:h-12 items-center justify-between px-3 md:px-4 shrink-0 z-30"
          style={{
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--glass-bg-strong)',
            backdropFilter: 'var(--glass-backdrop)',
            WebkitBackdropFilter: 'var(--glass-backdrop)',
          }}
        >
          <div className="flex items-center gap-1.5 md:gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex items-center justify-center h-8 w-8 md:h-9 md:w-9 rounded-xl transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {sidebarOpen ? <X size={18} strokeWidth={1.5} /> : <Menu size={18} strokeWidth={1.5} />}
            </button>
            <div className="w-px h-4 mx-0.5 md:mx-1" style={{ background: 'var(--border-color)' }} />
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 h-8 md:h-9 px-2 md:px-2.5 rounded-xl transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              title="New chat"
            >
              <Plus size={16} strokeWidth={1.5} />
              <span className="text-[13px] font-medium hidden sm:inline">New</span>
            </button>
            <span
              className="text-[13px] md:text-[14px] font-semibold ml-0.5 md:ml-1 truncate max-w-[120px] md:max-w-none"
              style={{ color: 'var(--text-primary)' }}
            >
              {sessionName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="text-[10px] md:text-[11px] font-medium px-2 md:px-2.5 py-1 rounded-full"
              style={{
                background: 'var(--card-bg)',
                color: 'var(--text-tertiary)',
                border: '1px solid var(--card-border)',
              }}
            >
              {model}
            </span>
          </div>
        </header>

        {/* ── Main body ── */}
        <div className="flex flex-1 overflow-hidden relative">
          {sidebarOpen && <Sidebar onClose={() => setSidebarOpen(false)} />}
          <main className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
            <MainContent />
            <Composer />
          </main>
          <Inspector />
          <ToastContainer />
        </div>
      </div>
    </ErrorBoundary>
  )
}
