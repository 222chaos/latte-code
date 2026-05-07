import { useMemo, useState, useRef, useEffect } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'
import { ChevronRight, Copy, Check } from 'lucide-react'

marked.setOptions({
  breaks: true,
  gfm: true,
})

interface Props {
  content: string
  thinking?: string
  streaming?: boolean
}

export default function AssistantMessage({ content, thinking, streaming }: Props) {
  const [showThinking, setShowThinking] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const html = useMemo(() => {
    const safeContent = content ?? ''
    try {
      const raw = marked.parse(safeContent) as string
      return DOMPurify.sanitize(raw, {
        ALLOWED_TAGS: [
          'p', 'br', 'hr', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'u', 's', 'strike',
          'a', 'img', 'code', 'pre', 'blockquote', 'table', 'thead', 'tbody',
          'tr', 'td', 'th', 'sup', 'sub', 'dl', 'dt', 'dd', 'details', 'summary',
        ],
        ALLOWED_ATTR: [
          'href', 'title', 'src', 'alt', 'class', 'style', 'target', 'rel',
          'width', 'height',
        ],
      })
    } catch (err) {
      console.warn('[AssistantMessage] Markdown parse error:', err)
      // Fallback: render as escaped plain text
      const escaped = safeContent
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      return DOMPurify.sanitize(`<p>${escaped}</p>`, {
        ALLOWED_TAGS: ['p'],
        ALLOWED_ATTR: [],
      })
    }
  }, [content])

  useEffect(() => {
    if (!contentRef.current) return
    const blocks = contentRef.current.querySelectorAll('pre code')
    blocks.forEach((block) => {
      hljs.highlightElement(block as HTMLElement)
    })

    const abortControllers: AbortController[] = []

    // Enhanced code blocks with language label and copy button
    const pres = contentRef.current.querySelectorAll('pre')
    pres.forEach((pre) => {
      if (pre.querySelector('.code-header')) return

      const code = pre.querySelector('code')
      const lang = code?.className?.replace('language-', '') || 'text'
      const displayLang = lang === 'text' ? '' : lang

      // Create header
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

      // Language label
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
        const spacer = document.createElement('span')
        header.appendChild(spacer)
      }

      // Copy button
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
      header.appendChild(btn)

      pre.style.position = 'relative'
      pre.style.padding = '0'
      pre.insertBefore(header, pre.firstChild)

      // Adjust code padding
      if (code) {
        code.style.padding = '14px'
        code.style.display = 'block'
      }

      const ac = new AbortController()
      abortControllers.push(ac)
      const { signal } = ac

      // Copy handler
      btn.addEventListener('click', () => {
        const codeText = code?.textContent || ''
        navigator.clipboard.writeText(codeText)
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
        btn.style.color = 'var(--apple-green)'
        setTimeout(() => {
          btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`
          btn.style.color = 'var(--text-quaternary)'
        }, 2000)
      }, { signal })

      // Hover effect on pre
      pre.addEventListener('mouseenter', () => {
        btn.style.color = 'var(--text-secondary)'
      }, { signal })
      pre.addEventListener('mouseleave', () => {
        if (!btn.style.color.includes('apple-green')) {
          btn.style.color = 'var(--text-quaternary)'
        }
      }, { signal })
    })

    return () => {
      abortControllers.forEach((ac) => ac.abort())
    }
  }, [html])

  return (
    <div className="flex flex-col gap-2.5">
      {/* ── Thinking Toggle ── */}
      {thinking && (
        <button
          onClick={() => setShowThinking(!showThinking)}
          className="self-start flex items-center gap-2 px-3 py-1.5 rounded-[10px] text-[12px] font-medium transition-all group"
          style={{
            background: 'var(--card-bg)',
            color: 'var(--text-tertiary)',
            border: '1px solid var(--card-border)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--card-bg-hover)'
            e.currentTarget.style.borderColor = 'var(--card-border-hover)'
            e.currentTarget.style.color = 'var(--text-secondary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--card-bg)'
            e.currentTarget.style.borderColor = 'var(--card-border)'
            e.currentTarget.style.color = 'var(--text-tertiary)'
          }}
        >
          <ChevronRight
            size={12}
            strokeWidth={2}
            className={`transition-transform duration-200 ${showThinking ? 'rotate-90' : ''}`}
          />
          <span>Thinking</span>
          <span className="text-[10px] font-mono opacity-60">
            ({thinking.length.toLocaleString()} chars)
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
      <div
        ref={contentRef}
        className="prose prose-invert prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* ── Streaming Cursor ── */}
      {streaming && (
        <span
          className="inline-block h-4 w-[2px] animate-pulse rounded-full"
          style={{ background: 'var(--accent)' }}
        />
      )}
    </div>
  )
}
