import { useState, useRef, useEffect, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  content: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

export default function Tooltip({ children, content, side = 'top', delay = 400 }: Props) {
  const [show, setShow] = useState(false)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current)
    }
  }, [])

  if (!content) return <>{children}</>

  const handleEnter = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current)
      leaveTimerRef.current = null
    }
    timerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return
      setShow(true)
      requestAnimationFrame(() => {
        if (isMountedRef.current) setVisible(true)
      })
    }, delay)
  }

  const handleLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setVisible(false)
    leaveTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) setShow(false)
      leaveTimerRef.current = null
    }, 150)
  }

  const positionStyles: Record<string, React.CSSProperties> = {
    top: { bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' },
    bottom: { top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' },
    left: { right: 'calc(100% + 6px)', top: '50%', transform: 'translateY(-50%)' },
    right: { left: 'calc(100% + 6px)', top: '50%', transform: 'translateY(-50%)' },
  }

  const enterTransforms: Record<string, string> = {
    top: 'translateX(-50%) translateY(2px)',
    bottom: 'translateX(-50%) translateY(-2px)',
    left: 'translateY(-50%) translateX(2px)',
    right: 'translateY(-50%) translateX(-2px)',
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
            background: 'var(--glass-bg-strong)',
            backdropFilter: 'var(--glass-backdrop)',
            WebkitBackdropFilter: 'var(--glass-backdrop)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-secondary)',
            boxShadow: 'var(--shadow-md)',
            opacity: visible ? 1 : 0,
            transform: visible
              ? positionStyles[side].transform
              : enterTransforms[side],
            transition: 'opacity 0.15s ease, transform 0.15s ease',
            ...positionStyles[side],
          }}
        >
          {content}
        </div>
      )}
    </div>
  )
}
