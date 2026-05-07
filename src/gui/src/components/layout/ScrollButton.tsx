import { useState, useEffect } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import Tooltip from '../ui/Tooltip.tsx'

interface Props {
  containerRef: React.RefObject<HTMLDivElement | null>
}

export default function ScrollButton({ containerRef }: Props) {
  const [showBottom, setShowBottom] = useState(false)
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el
      setShowBottom(scrollHeight - scrollTop - clientHeight > 200)
      setShowTop(scrollTop > 300)
    }

    el.addEventListener('scroll', onScroll)
    onScroll()
    return () => el.removeEventListener('scroll', onScroll)
  }, [containerRef])

  const scrollTo = (pos: 'top' | 'bottom') => {
    const el = containerRef.current
    if (!el) return
    el.scrollTo({ top: pos === 'top' ? 0 : el.scrollHeight, behavior: 'smooth' })
  }

  return (
    <>
      {showTop && (
        <Tooltip content="Scroll to top" side="left">
          <button
            onClick={() => scrollTo('top')}
            className="absolute top-4 right-4 z-20 flex items-center justify-center h-9 w-9 rounded-full transition-all"
            style={{
              background: 'var(--glass-bg-strong)',
              backdropFilter: 'var(--glass-backdrop)',
              WebkitBackdropFilter: 'var(--glass-backdrop)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-secondary)',
              boxShadow: 'var(--shadow-md)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.08)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
          >
            <ArrowUp size={15} strokeWidth={1.5} />
          </button>
        </Tooltip>
      )}
      {showBottom && (
        <Tooltip content="Scroll to bottom" side="left">
          <button
            onClick={() => scrollTo('bottom')}
            className="absolute bottom-4 right-4 z-20 flex items-center justify-center h-9 w-9 rounded-full transition-all animate-pulse-glow"
            style={{
              background: 'var(--accent)',
              color: '#fff',
              boxShadow: 'var(--shadow-md)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.08)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            <ArrowDown size={15} strokeWidth={1.5} />
          </button>
        </Tooltip>
      )}
    </>
  )
}
