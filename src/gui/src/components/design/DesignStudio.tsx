import { useState, useEffect, useRef } from 'react'
import { useGuiStore } from '../../store/guiStore.ts'
import { sendWsMessage } from '../../hooks/wsSender.ts'
import { useToastStore } from '../../store/toastStore.ts'
import { Search, Palette, Copy, Check, Sparkles, RefreshCw } from 'lucide-react'
import Tooltip from '../ui/Tooltip.tsx'

export default function DesignStudio() {
  const current = useGuiStore((s) => s.currentDesignSystem)
  const addToast = useToastStore((s) => s.addToast)
  const [brand, setBrand] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const pendingBrand = useRef<string | null>(null)

  useEffect(() => {
    if (!loading) return
    if (current && pendingBrand.current && current.brand.toLowerCase() === pendingBrand.current.toLowerCase()) {
      setLoading(false)
      pendingBrand.current = null
      return
    }
    // Safety timeout: reset loading after 15s if no response
    const timeout = setTimeout(() => {
      setLoading(false)
      pendingBrand.current = null
    }, 15000)
    return () => clearTimeout(timeout)
  }, [current, loading])

  // Timeout guard: reset loading if server never responds
  useEffect(() => {
    if (!loading) return
    const timer = setTimeout(() => {
      setLoading(false)
      pendingBrand.current = null
    }, 15000)
    return () => clearTimeout(timer)
  }, [loading])

  const handleSearch = () => {
    if (!brand.trim()) return
    setLoading(true)
    pendingBrand.current = brand.trim()
    sendWsMessage({
      type: 'user_design_system_request',
      payload: { brand: brand.trim(), action: 'get' },
    })
  }

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const applyTheme = () => {
    if (!current) return
    const root = document.documentElement
    if (current.colors) {
      Object.entries(current.colors).forEach(([name, value]) => {
        root.style.setProperty(`--ds-color-${name}`, value as string)
      })
      const primary = Object.values(current.colors)[0] as string | undefined
      if (primary) {
        root.style.setProperty('--accent', primary)
      }
    }
    if (current.typography?.fontFamily) {
      root.style.setProperty('--ds-font-family', current.typography.fontFamily)
      root.style.setProperty('--font-sans', current.typography.fontFamily)
    }
    if (current.layout?.maxWidth) {
      root.style.setProperty('--content-max-width', current.layout.maxWidth)
    }
    if ((current.layout as any)?.gridColumns) {
      root.style.setProperty('--grid-columns', String((current.layout as any).gridColumns))
    }
    if (current.layout?.spacing) {
      const spacing = parseInt(current.layout.spacing)
      if (!isNaN(spacing)) {
        root.style.setProperty('--spacing-unit', `${spacing}px`)
      }
    }
    addToast({ type: 'success', message: `Applied ${current.brand} theme` })
  }

  return (
    <div className="space-y-4">
      {/* ── Search ── */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search
            size={14}
            strokeWidth={1.5}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-quaternary)' }}
          />
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search brand (apple, stripe, linear...)"
            className="w-full rounded-xl pl-9 pr-3 py-2.5 text-[13px] outline-none transition-all"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              color: 'var(--text-primary)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.boxShadow = 'var(--shadow-accent)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--card-border)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
        </div>
        <Tooltip content={loading ? 'Searching...' : 'Search'} side="bottom">
          <button
            onClick={handleSearch}
            disabled={loading || !brand.trim()}
            className="flex items-center justify-center h-10 w-10 rounded-xl text-sm font-medium transition-all"
            style={{
              background: loading || !brand.trim() ? 'var(--card-bg)' : 'var(--accent)',
              color: '#fff',
              border: loading || !brand.trim() ? '1px solid var(--card-border)' : 'none',
              opacity: loading || !brand.trim() ? 0.5 : 1,
            }}
          >
            {loading ? (
              <RefreshCw size={16} strokeWidth={1.5} className="animate-spin" />
            ) : (
              <Sparkles size={16} strokeWidth={1.5} />
            )}
          </button>
        </Tooltip>
      </div>

      {current ? (
        <div className="space-y-4">
          {/* ── Brand Header ── */}
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              {current.brand}
            </span>
            <button
              onClick={applyTheme}
              className="px-3 py-1.5 rounded-[10px] text-[11px] font-semibold transition-all"
              style={{ background: 'var(--accent)', color: '#fff' }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              Apply Theme
            </button>
          </div>

          {/* ── Colors ── */}
          {current.colors && (
            <div>
              <div
                className="text-[11px] font-semibold uppercase tracking-wider mb-2.5"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Colors
              </div>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(current.colors).slice(0, 10).map(([name, value]) => (
                  <Tooltip key={name} content={name} side="bottom" delay={300}>
                    <div className="group cursor-pointer">
                      <div
                        className="h-10 rounded-[10px] transition-transform"
                        style={{ background: value as string }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                      />
                      <div
                        className="mt-1 text-[9px] truncate text-center font-medium"
                        style={{ color: 'var(--text-quaternary)' }}
                      >
                        {name}
                      </div>
                    </div>
                  </Tooltip>
                ))}
              </div>
            </div>
          )}

          {/* ── Typography ── */}
          {current.typography && (
            <div>
              <div
                className="text-[11px] font-semibold uppercase tracking-wider mb-2.5"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Typography
              </div>
              <div
                className="rounded-[12px] px-3.5 py-3 space-y-2"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
              >
                {current.typography.fontFamily && (
                  <div className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                    Font: <span style={{ color: 'var(--text-primary)' }}>{current.typography.fontFamily}</span>
                  </div>
                )}
                {current.typography.lineHeight && (
                  <div className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                    Line height: <span style={{ color: 'var(--text-primary)' }}>{current.typography.lineHeight}</span>
                  </div>
                )}
                {current.typography.sizes && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {Object.entries(current.typography.sizes).map(([name, value]) => (
                      <span
                        key={name}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium"
                        style={{
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-tertiary)',
                          border: '1px solid var(--border-color-subtle)',
                        }}
                      >
                        {name}: {value}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Export ── */}
          {(current.tailwindConfig || current.cssVariables) && (
            <div>
              <div
                className="text-[11px] font-semibold uppercase tracking-wider mb-2.5"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Export
              </div>
              <div className="flex gap-2">
                {current.cssVariables && (
                  <button
                    onClick={() => copy(current.cssVariables!, 'css')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[11px] font-medium transition-all"
                    style={{
                      background: 'var(--card-bg)',
                      color: copied === 'css' ? 'var(--apple-green)' : 'var(--text-secondary)',
                      border: '1px solid var(--card-border)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--card-bg-hover)'
                      e.currentTarget.style.borderColor = 'var(--card-border-hover)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--card-bg)'
                      e.currentTarget.style.borderColor = 'var(--card-border)'
                    }}
                  >
                    {copied === 'css' ? <Check size={12} strokeWidth={2} /> : <Copy size={12} strokeWidth={1.5} />}
                    CSS Variables
                  </button>
                )}
                {current.tailwindConfig && (
                  <button
                    onClick={() => copy(current.tailwindConfig!, 'tw')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[11px] font-medium transition-all"
                    style={{
                      background: 'var(--card-bg)',
                      color: copied === 'tw' ? 'var(--apple-green)' : 'var(--text-secondary)',
                      border: '1px solid var(--card-border)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--card-bg-hover)'
                      e.currentTarget.style.borderColor = 'var(--card-border-hover)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--card-bg)'
                      e.currentTarget.style.borderColor = 'var(--card-border)'
                    }}
                  >
                    {copied === 'tw' ? <Check size={12} strokeWidth={2} /> : <Copy size={12} strokeWidth={1.5} />}
                    Tailwind Config
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div
            className="h-10 w-10 rounded-[10px] flex items-center justify-center"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
          >
            <Palette size={18} strokeWidth={1.5} style={{ color: 'var(--text-quaternary)' }} />
          </div>
          <p className="text-[13px] font-medium" style={{ color: 'var(--text-quaternary)' }}>
            Search a brand to load its design system
          </p>
        </div>
      )}
    </div>
  )
}
