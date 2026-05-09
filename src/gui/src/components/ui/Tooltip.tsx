import { useState, useRef, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  content: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

function getHiddenTransform(baseTransform: string | undefined, side: string): string {
  if (!baseTransform) return 'translateY(2px)'
  const offset = (side === 'top' || side === 'bottom') ? 'translateY(2px)' : 'translateX(2px)'
  // If transform is a simple single translate, combine with offset
  if (baseTransform.startsWith('translateX(') || baseTransform.startsWith('translateY(')) {
    return `${baseTransform} ${offset}`
  }
  return baseTransform
}

export default function Tooltip({ children, content, side = 'top', delay = 400 }: Props) {
  const [show, setShow] = useState(false)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  if (!content) return <>{children}</>

  const handleEnter = () => {
    timerRef.current = setTimeout(() => {
      setShow(true)
      requestAnimationFrame(() => setVisible(true))
    }, delay)
  }

  const handleLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setVisible(false)
    setTimeout(() => setShow(false), 150)
  }

  const positionStyles: Record<string, React.CSSProperties> = {
    top: { bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' },
    bottom: { top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' },
    left: { right: 'calc(100% + 6px)', top: '50%', transform: 'translateY(-50%)' },
    right: { left: 'calc(100% + 6px)', top: '50%', transform: 'translateY(-50%)' },
  }

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
    >
      {children}
      {show && (
        <div
          className="absolute z-[100] px-2 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap pointer-events-none"
          style={{
            ...positionStyles[side],
            background: 'var(--glass-bg-strong)',
            backdropFilter: 'var(--glass-backdrop)',
            WebkitBackdropFilter: 'var(--glass-backdrop)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-secondary)',
            boxShadow: 'var(--shadow-md)',
            opacity: visible ? 1 : 0,
            transform: visible
              ? positionStyles[side].transform
              : getHiddenTransform(positionStyles[side].transform, side),
            transition: 'opacity 0.15s ease, transform 0.15s ease',
          }}
        >
          {content}
        </div>
      )}
    </div>
  )
}
