import { memo, useState, useEffect } from 'react'
import { Wrench, ChevronDown, ChevronUp, CheckCircle2, XCircle, Loader2, Terminal, Search, Globe, Eye, Edit3, FileText, Layers, MessageSquare, BarChart3 } from 'lucide-react'
import { stripAnsi } from '../../utils/ansi.ts'

interface Props {
  toolName: string
  input: Record<string, unknown>
  status: 'running' | 'success' | 'error'
  output?: string
  durationMs?: number
  defaultExpanded?: boolean
}

const TOOL_ICONS: Record<string, typeof Wrench> = {
  Bash: Terminal, BashTool: Terminal, PowerShellTool: Terminal,
  Grep: Search, GrepTool: Search,
  WebSearch: Globe, WebSearchTool: Globe,
  WebFetch: Globe, WebFetchTool: Globe,
  Read: Eye, FileReadTool: Eye,
  Edit: Edit3, FileEditTool: Edit3,
  Write: FileText, FileWriteTool: FileText,
  Glob: Layers, GlobTool: Layers,
  Agent: MessageSquare, AgentTool: MessageSquare,
  Skill: BarChart3, SkillTool: BarChart3,
}

function summarizeInput(toolName: string, input: Record<string, unknown>): string {
  if (!input || Object.keys(input).length === 0) return ''
  if (toolName === 'Bash' || toolName === 'BashTool' || toolName === 'PowerShellTool') {
    const cmd = (input.command as string) || ''
    return cmd.length > 80 ? cmd.slice(0, 77) + '...' : cmd
  }
  if (toolName === 'Grep' || toolName === 'GrepTool') {
    const pat = (input.pattern as string) || ''
    const path = (input.path as string) || ''
    return `${pat}${path ? ` in ${path}` : ''}`
  }
  if (toolName === 'Read' || toolName === 'FileReadTool') {
    return (input.file_path as string) || ''
  }
  if (toolName === 'Edit' || toolName === 'FileEditTool') {
    return (input.file_path as string) || ''
  }
  if (toolName === 'Write' || toolName === 'FileWriteTool') {
    return (input.file_path as string) || ''
  }
  if (toolName === 'Glob' || toolName === 'GlobTool') {
    return (input.pattern as string) || ''
  }
  if (toolName === 'Agent' || toolName === 'AgentTool') {
    return (input.description as string) || (input.query as string)?.slice(0, 60) || ''
  }
  if (toolName === 'WebSearch' || toolName === 'WebSearchTool') {
    return (input.query as string) || ''
  }
  if (toolName === 'WebFetch' || toolName === 'WebFetchTool') {
    return (input.url as string) || ''
  }
  const first = Object.values(input)[0]
  if (typeof first === 'string') return first.length > 60 ? first.slice(0, 57) + '...' : first
  return ''
}

function ToolCallCard({ toolName, input, status, output, durationMs, defaultExpanded }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false)

  // Auto-expand when a running tool completes
  useEffect(() => {
    if (status === 'success' || status === 'error') {
      setExpanded(true)
    }
  }, [status])

  const statusConfig = {
    running: { icon: Loader2, color: 'var(--apple-orange)', bg: 'rgba(255, 149, 10, 0.12)', animate: 'animate-spin' },
    success: { icon: CheckCircle2, color: 'var(--apple-green)', bg: 'rgba(48, 209, 88, 0.12)', animate: '' },
    error: { icon: XCircle, color: 'var(--apple-red)', bg: 'rgba(255, 69, 58, 0.12)', animate: '' },
  }

  const cfg = statusConfig[status]
  const StatusIcon = cfg.icon
  const ToolIcon = TOOL_ICONS[toolName]
  const summary = summarizeInput(toolName, input)

  return (
    <div
      className="rounded-xl overflow-hidden text-sm transition-all"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--card-bg-hover)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
        }}
      >
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-md shrink-0 ${cfg.animate}`}
          style={{ background: cfg.bg, color: cfg.color }}
        >
          <StatusIcon size={13} strokeWidth={1.5} />
        </div>
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {ToolIcon && <ToolIcon size={13} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />}
          <span className="font-semibold text-[12px] md:text-[13px] truncate" style={{ color: 'var(--text-primary)' }}>
            {toolName}
          </span>
          {summary && (
            <span className="text-[11px] truncate hidden sm:inline" style={{ color: 'var(--text-quaternary)' }}>
              — {summary}
            </span>
          )}
        </div>
        {durationMs !== undefined && status !== 'running' && (
          <span className="text-[10px] font-mono tabular-nums shrink-0" style={{ color: 'var(--text-quaternary)' }}>
            {(durationMs / 1000).toFixed(2)}s
          </span>
        )}
        {expanded ? (
          <ChevronUp size={13} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
        ) : (
          <ChevronDown size={13} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 animate-fade-in">
          <div
            className="rounded-lg px-3 py-2 text-[11px] font-mono overflow-x-auto max-h-40 overflow-y-auto"
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color-subtle)',
            }}
          >
            {JSON.stringify(input, null, 2)}
          </div>
          {output && (
            <div
              className="rounded-lg px-3 py-2 text-[11px] font-mono overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-all"
              style={{
                background: status === 'error' ? 'rgba(255, 69, 58, 0.06)' : 'rgba(0, 0, 0, 0.3)',
                color: status === 'error' ? 'var(--apple-red)' : 'var(--text-secondary)',
                border: '1px solid var(--border-color-subtle)',
              }}
            >
              {stripAnsi(output)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default memo(ToolCallCard)
