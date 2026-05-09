import { useState } from 'react'
import { Terminal, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  command: string
  output: string
  exitCode?: number
}

export default function BashOutputCard({ command, output, exitCode }: Props) {
  const [expanded, setExpanded] = useState(true)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(output ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const lines = (output ?? '').split('\n')
  const isLong = lines.length > 20
  const displayOutput = isLong && !expanded ? lines.slice(0, 20).join('\n') + '\n...' : output

  const isError = exitCode !== undefined && exitCode !== 0

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
        <Terminal size={13} strokeWidth={1.5} style={{ color: 'var(--text-quaternary)' }} />
        <code
          className="text-[11px] font-mono flex-1 truncate"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span style={{ color: 'var(--text-quaternary)' }}>$</span> {command}
        </code>

        {/* Copy */}
        <button
          onClick={copy}
          className="flex items-center justify-center h-6 w-6 rounded-md transition-colors"
          style={{ color: copied ? 'var(--apple-green)' : 'var(--text-quaternary)' }}
          onMouseEnter={(e) => {
            if (!copied) e.currentTarget.style.background = 'var(--bg-hover)'
          }}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          title="Copy output"
        >
          {copied ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} strokeWidth={1.5} />}
        </button>

        {/* Expand/Collapse */}
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-center h-6 w-6 rounded-md transition-colors"
            style={{ color: 'var(--text-quaternary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {expanded ? (
              <ChevronUp size={12} strokeWidth={1.5} />
            ) : (
              <ChevronDown size={12} strokeWidth={1.5} />
            )}
          </button>
        )}
      </div>

      {/* ── Output ── */}
      <pre
        className="px-3.5 py-2.5 text-[11px] font-mono overflow-x-auto max-h-96 overflow-y-auto leading-relaxed"
        style={{ color: isError ? 'var(--apple-red)' : 'var(--text-secondary)' }}
      >
        {displayOutput || (
          <span className="italic" style={{ color: 'var(--text-quaternary)' }}>
            No output
          </span>
        )}
      </pre>

      {/* ── Exit Code ── */}
      {exitCode !== undefined && (
        <div
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-[10px] font-mono font-medium"
          style={{
            borderTop: '1px solid var(--card-border)',
            color: exitCode === 0 ? 'var(--apple-green)' : 'var(--apple-red)',
            background: exitCode === 0 ? 'rgba(48, 209, 88, 0.06)' : 'rgba(255, 69, 58, 0.06)',
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: exitCode === 0 ? 'var(--apple-green)' : 'var(--apple-red)' }}
          />
          Exit code: {exitCode}
        </div>
      )}
    </div>
  )
}
