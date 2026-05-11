import { useState } from 'react'
import { Copy, Check, RotateCcw, Pencil, ThumbsUp, ThumbsDown } from 'lucide-react'
import Tooltip from '../ui/Tooltip.tsx'

interface Props {
  content: string
  role: 'user' | 'assistant'
  thinking?: string
  onRegenerate?: () => void
  onEdit?: () => void
}

export default function MessageActions({ content, role, thinking, onRegenerate, onEdit }: Props) {
  const [copied, setCopied] = useState(false)
  const [liked, setLiked] = useState(false)
  const [disliked, setDisliked] = useState(false)

  const copy = async () => {
    let text = content ?? ''
    if (thinking) {
      text = `<thinking>\n${thinking}\n</thinking>\n\n${text}`
    }
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLike = () => {
    setLiked(!liked)
    setDisliked(false)
  }

  const handleDislike = () => {
    setDisliked(!disliked)
    setLiked(false)
  }

  return (
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <Tooltip content={copied ? 'Copied!' : 'Copy'} side="bottom" delay={300}>
        <button
          onClick={copy}
          className="flex items-center justify-center h-7 w-7 rounded-lg transition-colors"
          style={{
            color: copied ? 'var(--apple-green)' : 'var(--text-quaternary)',
          }}
          onMouseEnter={(e) => {
            if (!copied) e.currentTarget.style.background = 'var(--bg-hover)'
          }}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          {copied ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={1.5} />}
        </button>
      </Tooltip>

      {role === 'assistant' && (
        <>
          <Tooltip content="Regenerate" side="bottom" delay={300}>
            <button
              onClick={() => onRegenerate?.()}
              className="flex items-center justify-center h-7 w-7 rounded-lg transition-colors"
              style={{ color: 'var(--text-quaternary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <RotateCcw size={14} strokeWidth={1.5} />
            </button>
          </Tooltip>

          <Tooltip content={liked ? 'Liked' : 'Good response'} side="bottom" delay={300}>
            <button
              onClick={handleLike}
              className="flex items-center justify-center h-7 w-7 rounded-lg transition-colors"
              style={{ color: liked ? 'var(--apple-green)' : 'var(--text-quaternary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <ThumbsUp size={14} strokeWidth={liked ? 2 : 1.5} />
            </button>
          </Tooltip>

          <Tooltip content={disliked ? 'Disliked' : 'Bad response'} side="bottom" delay={300}>
            <button
              onClick={handleDislike}
              className="flex items-center justify-center h-7 w-7 rounded-lg transition-colors"
              style={{ color: disliked ? 'var(--apple-red)' : 'var(--text-quaternary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <ThumbsDown size={14} strokeWidth={disliked ? 2 : 1.5} />
            </button>
          </Tooltip>
        </>
      )}

      {role === 'user' && onEdit && (
        <Tooltip content="Edit" side="bottom" delay={300}>
          <button
            onClick={() => onEdit?.()}
            className="flex items-center justify-center h-7 w-7 rounded-lg transition-colors"
            style={{ color: 'var(--text-quaternary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Pencil size={14} strokeWidth={1.5} />
          </button>
        </Tooltip>
      )}
    </div>
  )
}
