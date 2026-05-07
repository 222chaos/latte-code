import { useState } from 'react'
import { Folder, FileText, ChevronRight, ChevronDown } from 'lucide-react'

interface FileNode {
  name: string
  path: string
  type: 'file' | 'dir'
  children?: FileNode[]
}

interface Props {
  files: FileNode[]
  onSelect?: (path: string) => void
  selectedPath?: string
}

function FileTreeNode({ node, depth, onSelect, selectedPath }: {
  node: FileNode
  depth: number
  onSelect?: (path: string) => void
  selectedPath?: string
}) {
  const [expanded, setExpanded] = useState(true)
  const isSelected = selectedPath === node.path

  if (node.type === 'dir') {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-1.5 py-1.5 rounded-lg transition-colors text-left"
          style={{ paddingLeft: `${depth * 14 + 8}px`, color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          {expanded ? (
            <ChevronDown size={12} strokeWidth={1.5} />
          ) : (
            <ChevronRight size={12} strokeWidth={1.5} />
          )}
          <Folder size={14} strokeWidth={1.5} style={{ color: 'var(--apple-orange)' }} />
          <span className="text-[12px] truncate">{node.name}</span>
        </button>
        {expanded && node.children?.map((child) => (
          <FileTreeNode
            key={child.path}
            node={child}
            depth={depth + 1}
            onSelect={onSelect}
            selectedPath={selectedPath}
          />
        ))}
      </div>
    )
  }

  return (
    <button
      onClick={() => onSelect?.(node.path)}
      className="w-full flex items-center gap-1.5 py-1.5 rounded-lg transition-colors text-left"
      style={{
        paddingLeft: `${depth * 14 + 8}px`,
        background: isSelected ? 'var(--accent-muted)' : 'transparent',
        color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)'
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.background = 'transparent'
      }}
    >
      <span className="w-3" />
      <FileText
        size={13}
        strokeWidth={1.5}
        style={{ color: isSelected ? 'var(--accent)' : 'var(--text-quaternary)' }}
      />
      <span className="text-[12px] truncate">{node.name}</span>
    </button>
  )
}

export default function FileTree({ files, onSelect, selectedPath }: Props) {
  return (
    <div className="space-y-0.5">
      {files.map((node) => (
        <FileTreeNode
          key={node.path}
          node={node}
          depth={0}
          onSelect={onSelect}
          selectedPath={selectedPath}
        />
      ))}
    </div>
  )
}
