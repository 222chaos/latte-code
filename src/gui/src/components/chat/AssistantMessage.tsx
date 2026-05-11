import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'
import { ChevronRight } from 'lucide-react'

marked.setOptions({
  breaks: true,
  gfm: true,
})

function enhanceCodeBlocks(container: HTMLElement) {
  const blocks = container.querySelectorAll('pre code')
  blocks.forEach((block) => {
    try { hljs.highlightElement(block as HTMLElement) } catch { /* skip */ }
  })

  container.querySelectorAll('a').forEach((a) => {
    if (!a.target && !a.href.startsWith('#')) {
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
    }
  })

  container.querySelectorAll('img').forEach((img) => {
    img.style.maxWidth = '100%'
    img.style.borderRadius = 'var(--radius-md)'
    img.style.height = 'auto'
  })

  const pres = container.querySelectorAll('pre')
  pres.forEach((pre) => {
    if (pre.querySelector('.code-header')) return

    const code = pre.querySelector('code')
    const lang = code?.className?.replace('language-', '') || 'text'
    const displayLang = lang === 'text' ? '' : lang

    const header = document.createElement('div')
    header.className = 'code-header'
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 14px;
      border-bottom: 1px solid var(--card-border);
      background: rgba(0, 0, 0, 0.2);
    `

    if (displayLang) {
      const label = document.createElement('span')
      label.textContent = displayLang
      label.style.cssText = `
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text-quaternary);
        font-family: "SF Mono", SFMono-Regular, ui-monospace, monospace;
      `
      header.appendChild(label)
    } else {
      header.appendChild(document.createElement('span'))
    }

    const btn = document.createElement('button')
    btn.className = 'code-copy-btn'
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`
    btn.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 5px;
      border-radius: 6px;
      background: transparent;
      color: var(--text-quaternary);
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
    `
    btn.title = 'Copy code'
    btn.setAttribute('tabindex', '0')
    btn.setAttribute('aria-label', 'Copy code to clipboard')
    header.appendChild(btn)

    pre.style.position = 'relative'
    pre.style.padding = '0'
    pre.insertBefore(header, pre.firstChild)

    if (code) {
      code.style.padding = '14px'
      code.style.display = 'block'
    }

    // Add line numbers
    if (code) {
      if (code.querySelector('.code-line-numbers')) {
        // Already enhanced — skip to prevent duplicate line numbers
      } else {
        const lines = code.textContent?.split('\n') || []
        if (lines.length > 2) {
          const lineNums = document.createElement('div')
          lineNums.className = 'code-line-numbers'
        lineNums.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          padding-top: 14px;
          padding-left: 8px;
          text-align: right;
          user-select: none;
          pointer-events: none;
          color: var(--text-quaternary);
          opacity: 0.5;
          font-size: 11px;
          line-height: 1.5;
          font-family: "SF Mono", SFMono-Regular, ui-monospace, monospace;
          width: 36px;
        `
          lineNums.textContent = lines.map((_, i) => String(i + 1)).join('\n')
          code.insertBefore(lineNums, code.firstChild)
          code.style.paddingLeft = '46px'
        }
      }
    }

    const MAX_HEIGHT = 300
    if (
      pre.scrollHeight > MAX_HEIGHT &&
      !pre.querySelector('.code-expand-btn') &&
      pre.dataset.expanded !== 'true'
    ) {
      pre.style.maxHeight = `${MAX_HEIGHT}px`
      pre.style.overflow = 'hidden'
      const expandBtn = document.createElement('button')
      expandBtn.className = 'code-expand-btn'
      expandBtn.textContent = 'Show more'
      expandBtn.setAttribute('tabindex', '0')
      expandBtn.setAttribute('aria-label', 'Expand code block')
      expandBtn.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 32px 14px 10px;
        border: none;
        background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.6) 40%);
        color: var(--accent);
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        text-align: center;
        border-bottom-left-radius: 12px;
        border-bottom-right-radius: 12px;
      `
      pre.appendChild(expandBtn)
    }
  })
}

interface Props {
  content: string
  thinking?: string
  streaming?: boolean
}

export default function AssistantMessage({ content, thinking, streaming }: Props) {
  const [showThinking, setShowThinking] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const processedRef = useRef<string>('')
  const timersRef = useRef(new Map<HTMLButtonElement, ReturnType<typeof setTimeout>>())

  const html = useMemo(() => {
    if (!content) return ''
    const raw = marked.parse(content) as string
    return DOMPurify.sanitize(raw, { ALLOWED_TAGS: ['h1','h2','h3','h4','h5','h6','p','br','strong','em','b','i','u','s','a','ul','ol','li','code','pre','table','thead','tbody','tr','th','td','blockquote','hr','img','span','div','del','input','details','summary','dl','dt','dd','sup','sub','kbd','mark','abbr','small','q','cite'], ALLOWED_ATTR: ['href','src','alt','title','class','id','target','rel','type','checked','disabled','open','start','colspan','rowspan','width','height','style'] })
  }, [content])

  // Event delegation: register once, works for dynamically added elements
  useEffect(() => {
    const container = contentRef.current
    if (!container) return

    const handleClick = (e: MouseEvent | KeyboardEvent) => {
      const target = e.target as HTMLElement
      const expandBtn = target.closest('.code-expand-btn') as HTMLButtonElement | null
      if (expandBtn && (e.type === 'click' || (e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ')) {
        e.preventDefault()
        const pre = expandBtn.closest('pre') as HTMLPreElement
        pre.style.maxHeight = 'none'
        pre.style.overflow = 'visible'
        pre.dataset.expanded = 'true'
        expandBtn.remove()
        return
      }

      const btn = (e.target as HTMLElement).closest('.code-copy-btn') as HTMLButtonElement | null
      if (!btn) return
      const pre = btn.closest('pre')
      const code = pre?.querySelector('code')
      const codeText = code?.textContent || ''
      navigator.clipboard.writeText(codeText).then(() => {
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
        btn.style.color = 'var(--apple-green)'
        const prevTimer = timersRef.current.get(btn)
        if (prevTimer) clearTimeout(prevTimer)
        timersRef.current.set(
          btn,
          setTimeout(() => {
            btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`
            btn.style.color = 'var(--text-quaternary)'
            timersRef.current.delete(btn)
          }, 2000)
        )
      }).catch(() => { /* clipboard write failed, ignore */ })
    }

    const handleMouseEnter = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest('.code-copy-btn') as HTMLButtonElement | null
      if (!btn) return
      if (!btn.style.color.includes('apple-green')) {
        btn.style.color = 'var(--text-secondary)'
      }
    }

    const handleMouseLeave = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest('.code-copy-btn') as HTMLButtonElement | null
      if (!btn) return
      if (!btn.style.color.includes('apple-green')) {
        btn.style.color = 'var(--text-quaternary)'
      }
    }

    container.addEventListener('click', handleClick)
    container.addEventListener('keydown', handleClick)
    container.addEventListener('mouseenter', handleMouseEnter, true)
    container.addEventListener('mouseleave', handleMouseLeave, true)

    return () => {
      container.removeEventListener('click', handleClick)
      container.removeEventListener('keydown', handleClick)
      container.removeEventListener('mouseenter', handleMouseEnter, true)
      container.removeEventListener('mouseleave', handleMouseLeave, true)
      for (const timer of timersRef.current.values()) clearTimeout(timer)
      timersRef.current.clear()
    }
  }, [])

  // Single unified DOM write effect:
  // 1. Write HTML to DOM (always, both streaming and final)
  // 2. When streaming ends, enhance code blocks on next frame
  useEffect(() => {
    const el = contentRef.current
    if (!el || !html) return
    el.innerHTML = html
    if (!streaming) {
      if (processedRef.current !== html) {
        processedRef.current = html
        enhanceCodeBlocks(el)
      }
    } else {
      processedRef.current = ''
    }
  }, [html, streaming])

  return (
    <div className="flex flex-col gap-2.5">
      {/* ── Thinking Toggle ── */}
      {thinking && (
        <button
          onClick={() => setShowThinking(!showThinking)}
          className="self-start flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all group/thinking"
          style={{
            background: 'transparent',
            color: 'var(--text-quaternary)',
            border: '1px solid var(--border-color-subtle)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--card-bg)'
            e.currentTarget.style.borderColor = 'var(--card-border)'
            e.currentTarget.style.color = 'var(--text-tertiary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.borderColor = 'var(--border-color-subtle)'
            e.currentTarget.style.color = 'var(--text-quaternary)'
          }}
        >
          <ChevronRight
            size={11}
            strokeWidth={2}
            className={`transition-transform duration-200 ${showThinking ? 'rotate-90' : ''}`}
          />
          <span>Thinking</span>
          <span className="text-[10px] font-mono opacity-50">
            · {thinking.length.toLocaleString()}
          </span>
        </button>
      )}

      {/* ── Thinking Content ── */}
      {showThinking && thinking && (
        <div
          className="rounded-[14px] px-4 py-3 text-[12px] italic leading-relaxed animate-fade-in"
          style={{
            background: 'var(--card-bg)',
            color: 'var(--text-tertiary)',
            border: '1px solid var(--card-border)',
          }}
        >
          {thinking}
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="inline">
        <div
          ref={contentRef}
          className="prose prose-invert prose-sm max-w-none inline"
        />
        {streaming && html && (
          <span
            className="inline-block w-[2px] h-[1.1em] align-text-bottom"
            style={{
              background: 'var(--accent)',
              borderRadius: 9999,
              marginLeft: 2,
              animation: 'cursor-pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
        )}
      </div>
    </div>
  )
}
