import { useEffect } from 'react'
import { useGuiStore } from '../store/guiStore.ts'

export function useKeyboardShortcuts() {
  const toggleSidebar = useGuiStore((s) => s.toggleSidebar)
  const toggleInspector = useGuiStore((s) => s.toggleInspector)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey

      // Ctrl/Cmd + B: toggle sidebar
      if (isMeta && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        toggleSidebar()
      }

      // Ctrl/Cmd + I: toggle inspector
      if (isMeta && e.key.toLowerCase() === 'i') {
        e.preventDefault()
        toggleInspector()
      }

      // Ctrl/Cmd + K: focus composer
      if (isMeta && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        const textarea = document.querySelector('textarea[data-composer]') as HTMLTextAreaElement | null
        textarea?.focus()
      }

      // Escape: close overlays or blur composer
      if (e.key === 'Escape') {
        const sidebarOpen = !useGuiStore.getState().sidebarCollapsed
        const inspectorOpen = !useGuiStore.getState().inspectorCollapsed
        if (inspectorOpen) {
          e.preventDefault()
          toggleInspector()
          return
        }
        if (sidebarOpen) {
          e.preventDefault()
          toggleSidebar()
          return
        }
        const active = document.activeElement
        if (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) {
          active.blur()
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleSidebar, toggleInspector])
}
