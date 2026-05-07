import { useState } from 'react'
import { CheckCircle2, Circle, ChevronRight, ChevronDown, ListTodo } from 'lucide-react'

interface PlanItem {
  id: string
  text: string
  status: 'pending' | 'in_progress' | 'done'
  children?: PlanItem[]
}

interface Props {
  items: PlanItem[]
  onToggle?: (id: string) => void
}

function PlanNode({ item, depth, onToggle }: { item: PlanItem; depth: number; onToggle?: (id: string) => void }) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = item.children && item.children.length > 0

  const statusConfig = {
    pending: { icon: Circle, color: 'var(--text-quaternary)', animate: '' },
    in_progress: { icon: Circle, color: 'var(--accent)', animate: 'animate-pulse' },
    done: { icon: CheckCircle2, color: 'var(--apple-green)', animate: '' },
  }

  const cfg = statusConfig[item.status]
  const Icon = cfg.icon

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5 rounded-lg transition-colors"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--bg-hover)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
        }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-center h-5 w-5 rounded transition-colors"
            style={{ color: 'var(--text-quaternary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {expanded ? <ChevronDown size={12} strokeWidth={1.5} /> : <ChevronRight size={12} strokeWidth={1.5} />}
          </button>
        ) : (
          <span className="w-5" />
        )}
        <button
          onClick={() => onToggle?.(item.id)}
          className={`shrink-0 flex items-center justify-center h-5 w-5 rounded transition-colors ${cfg.animate}`}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <Icon size={14} strokeWidth={item.status === 'done' ? 2 : 1.5} style={{ color: cfg.color }} />
        </button>
        <span
          className="text-[12px] md:text-[13px] flex-1 truncate"
          style={{
            color: item.status === 'done' ? 'var(--text-quaternary)' : 'var(--text-secondary)',
            textDecoration: item.status === 'done' ? 'line-through' : 'none',
          }}
        >
          {item.text}
        </span>
      </div>
      {expanded && hasChildren && (
        <div>
          {item.children!.map((child) => (
            <PlanNode key={child.id} item={child} depth={depth + 1} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  )
}

function countDone(items: PlanItem[]): number {
  return items.reduce((n, i) => n + (i.status === 'done' ? 1 : 0) + (i.children ? countDone(i.children) : 0), 0)
}

function countTotal(items: PlanItem[]): number {
  return items.reduce((n, i) => n + 1 + (i.children ? countTotal(i.children) : 0), 0)
}

export default function PlanTree({ items, onToggle }: Props) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <div
          className="h-10 w-10 rounded-[10px] flex items-center justify-center"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
        >
          <ListTodo size={18} strokeWidth={1.5} style={{ color: 'var(--text-quaternary)' }} />
        </div>
        <p className="text-[13px] font-medium" style={{ color: 'var(--text-quaternary)' }}>
          No active plan
        </p>
      </div>
    )
  }

  const doneCount = countDone(items)
  const total = countTotal(items)
  const progress = total > 0 ? (doneCount / total) * 100 : 0

  return (
    <div className="space-y-4">
      {/* ── Progress ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Progress
          </span>
          <span className="text-[11px] font-medium tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
            {doneCount} / {total}
          </span>
        </div>
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${progress}%`,
              background: progress === 100 ? 'var(--apple-green)' : 'var(--accent)',
            }}
          />
        </div>
      </div>

      {/* ── Tree ── */}
      <div className="space-y-0.5">
        {items.map((item) => (
          <PlanNode key={item.id} item={item} depth={0} onToggle={onToggle} />
        ))}
      </div>
    </div>
  )
}
