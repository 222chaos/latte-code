import { useState, useEffect, useRef, useMemo } from 'react'
import { useGuiStore } from '../../store/guiStore.ts'
import { Command, Hash } from 'lucide-react'

interface Props {
  query: string
  onSelect: (commandName: string) => void
  onClose: () => void
}

export default function CommandPalette({ query, onSelect, onClose }: Props) {
  const commands = useGuiStore((s) => s.commands)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  const search = query.slice(1).toLowerCase().trim()

  const filtered = useMemo(() => {
    if (!search) return commands
    return commands.filter((cmd) => {
      const nameMatch = cmd.name.toLowerCase().includes(search)
      const aliasMatch = cmd.aliases?.some((a) => a.toLowerCase().includes(search))
      const descMatch = cmd.description.toLowerCase().includes(search)
      const descZhMatch = cmd.descriptionZh?.toLowerCase().includes(search)
      return nameMatch || aliasMatch || descMatch || descZhMatch
    })
  }, [commands, search])

  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  useEffect(() => {
    const el = itemRefs.current[selectedIndex]
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [selectedIndex])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        e.stopPropagation()
        setSelectedIndex((i) => (i + 1) % filtered.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        e.stopPropagation()
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length)
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        e.stopPropagation()
        const cmd = filtered[selectedIndex]
        if (cmd) onSelect(cmd.name)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [filtered, selectedIndex, onSelect, onClose])

  if (filtered.length === 0) {
    return (
      <div
        className="absolute bottom-full left-0 right-0 mb-2 max-h-72 overflow-y-auto rounded-[16px] md:rounded-[18px] py-3 px-1 z-50 animate-fade-in-up"
        style={{
          background: 'var(--glass-bg-strong)',
          backdropFilter: 'var(--glass-backdrop-strong)',
          WebkitBackdropFilter: 'var(--glass-backdrop-strong)',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div className="flex items-center justify-center py-6 gap-2">
          <Command size={14} strokeWidth={1.5} style={{ color: 'var(--text-quaternary)' }} />
          <span className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
            No matching commands
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={listRef}
      className="absolute bottom-full left-0 right-0 mb-2 max-h-72 overflow-y-auto rounded-[16px] md:rounded-[18px] py-2 z-50 animate-fade-in-up"
      style={{
        background: 'var(--glass-bg-strong)',
        backdropFilter: 'var(--glass-backdrop-strong)',
        WebkitBackdropFilter: 'var(--glass-backdrop-strong)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      {filtered.map((cmd, idx) => {
        const isSelected = idx === selectedIndex
        return (
          <button
            key={cmd.name}
            ref={(el) => { itemRefs.current[idx] = el }}
            onClick={() => onSelect(cmd.name)}
            onMouseEnter={() => setSelectedIndex(idx)}
            className="w-full text-left px-3 py-2 flex items-start gap-3 transition-colors"
            style={{
              background: isSelected ? 'var(--bg-hover)' : 'transparent',
              borderRadius: 10,
              margin: '0 4px',
              width: 'calc(100% - 8px)',
            }}
          >
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] mt-0.5"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                color: 'var(--accent)',
              }}
            >
              <Hash size={13} strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className="text-[13px] font-semibold"
                  style={{ color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}
                >
                  /{cmd.name}
                </span>
                {cmd.aliases && cmd.aliases.length > 0 && (
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                    style={{
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-quaternary)',
                    }}
                  >
                    {cmd.aliases[0]}
                  </span>
                )}
                {cmd.argumentHint && (
                  <span
                    className="text-[11px] truncate"
                    style={{ color: 'var(--text-quaternary)' }}
                  >
                    {cmd.argumentHint}
                  </span>
                )}
              </div>
              <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                {cmd.descriptionZh || cmd.description}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
