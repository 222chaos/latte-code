import { useState, useMemo } from 'react'
import { diffLines } from 'diff'
import { FileCode, ChevronDown, ChevronUp, Check, X } from 'lucide-react'
import Tooltip from '../ui/Tooltip.tsx'

interface Props {
  filePath: string
  oldContent: string
  newContent: string
  diff?: string
  onAccept?: () => void
  onReject?: () => void
}

interface DiffLine {
  value: string
  added?: boolean
  removed?: boolean
}

export default function DiffViewer({ filePath, oldContent, newContent, diff, onAccept, onReject }: Props) {
  const [expanded, setExpanded] = useState(true)

  const lines = useMemo<DiffLine[]>(() => {
    if (diff) {
      return diff.split('\n').map((line) => ({
        value: line.slice(1),
        added: line.startsWith('+'),
        removed: line.startsWith('-'),
      }))
    }
    const changes = diffLines(oldContent ?? '', newContent ?? '')
    return changes.flatMap((change) => {
      const text = change.value.endsWith('\n') ? change.value.slice(0, -1) : change.value
      return text.split('\n').map((line) => ({
        value: line,
        added: change.added,
        removed: change.removed,
      }))
    })
  }, [oldContent, newContent, diff])

  return (
    <div
      className="rounded-[14px] overflow-hidden text-sm transition-all"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center gap-2.5 px-3.5 py-2.5"
        style={{
          background: 'rgba(0, 0, 0, 0.25)',
          borderBottom: '1px solid var(--card-border)',
        }}
      >
        <FileCode size={13} strokeWidth={1.5} style={{ color: 'var(--text-quaternary)' }} />
        <span
          className="text-[11px] font-mono flex-1 truncate"
          style={{ color: 'var(--text-secondary)' }}
        >
          {filePath}
        </span>
        <div className="flex items-center gap-0.5">
          {onAccept && (
            <Tooltip content="Accept changes" side="bottom" delay={300}>
              <button
                onClick={onAccept}
                className="flex items-center justify-center h-6 w-6 rounded-md transition-colors"
                style={{ color: 'var(--apple-green)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(48, 209, 88, 0.12)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <Check size={13} strokeWidth={2.5} />
              </button>
            </Tooltip>
          )}
          {onReject && (
            <Tooltip content="Reject changes" side="bottom" delay={300}>
              <button
                onClick={onReject}
                className="flex items-center justify-center h-6 w-6 rounded-md transition-colors"
                style={{ color: 'var(--apple-red)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 69, 58, 0.12)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <X size={13} strokeWidth={2.5} />
              </button>
            </Tooltip>
          )}
          <Tooltip content={expanded ? 'Collapse' : 'Expand'} side="bottom" delay={300}>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center justify-center h-6 w-6 rounded-md transition-colors"
              style={{ color: 'var(--text-quaternary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {expanded ? <ChevronUp size={13} strokeWidth={1.5} /> : <ChevronDown size={13} strokeWidth={1.5} />}
            </button>
          </Tooltip>
        </div>
      </div>

      {/* ── Diff Content ── */}
      {expanded && (
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-[11px] font-mono">
            <tbody>
              {lines.map((line, i) => {
                let bg = 'transparent'
                let color = 'var(--text-secondary)'
                let prefix = ' '
                if (line.added) {
                  bg = 'rgba(48, 209, 88, 0.08)'
                  color = 'var(--apple-green)'
                  prefix = '+'
                } else if (line.removed) {
                  bg = 'rgba(255, 69, 58, 0.08)'
                  color = 'var(--apple-red)'
                  prefix = '-'
                }
                return (
                  <tr key={i} style={{ background: bg }}>
                    <td
                      className="px-2 py-0.5 text-right select-none w-10"
                      style={{ color: 'var(--text-quaternary)' }}
                    >
                      {i + 1}
                    </td>
                    <td className="px-2 py-0.5 whitespace-pre" style={{ color }}>
                      {prefix}{line.value}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
