import { Server, type ServerWebSocket } from 'bun'
import { join, extname, resolve, isAbsolute, dirname } from 'path'
import { existsSync } from 'fs'
import { logForDebugging } from '../utils/debug.js'

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
}

export type GuiServerOptions = {
  port?: number
  maxRetries?: number
  devMode?: boolean
}

export type GuiServerCallbacks = {
  onUserInput?: (content: string, attachments?: string[]) => void
  onPermissionResponse?: (requestId: string, behavior: 'allow' | 'deny' | 'always_allow') => void
  onInterrupt?: () => void
  onDesignSystemRequest?: (brand: string, action: string, query?: string) => void
  onClientConnected?: () => void
  onCreateSession?: (name?: string) => void
  onSwitchSession?: (sessionId: string) => void
  onRenameSession?: (sessionId: string, name: string) => void
  onDeleteSession?: (sessionId: string) => void
  onCreateShare?: () => void
  onLoadSessions?: () => void
}

type WsData = { id: string }

export class GuiServer {
  private server: Server | null = null
  private clients = new Map<string, ServerWebSocket<WsData>>()
  private callbacks: GuiServerCallbacks
  private port: number
  private maxRetries: number
  private devMode: boolean
  private distDir: string

  constructor(callbacks: GuiServerCallbacks = {}, options: GuiServerOptions = {}) {
    this.callbacks = callbacks
    this.port = options.port ?? 9720
    this.maxRetries = options.maxRetries ?? 5
    this.devMode = options.devMode ?? false
    this.distDir = this.resolveDistDir()
  }

  private resolveDistDir(): string {
    // For compiled binaries, import.meta.dir is the binary's directory,
    // so ../../dist/gui may point outside the project. We try multiple
    // candidates and pick the first one that actually contains index.html.
    const binaryDir = process.argv[0] ? dirname(process.argv[0]) : ''
    const candidates = [
      resolve(import.meta.dir, '..', '..', 'dist', 'gui'),
      resolve(process.cwd(), 'dist', 'gui'),
      binaryDir ? resolve(binaryDir, 'dist', 'gui') : '',
      binaryDir ? resolve(binaryDir, '..', 'dist', 'gui') : '',
    ].filter(Boolean)

    for (const p of candidates) {
      if (existsSync(join(p, 'index.html'))) {
        logForDebugging(`[GuiServer] Found GUI dist at: ${p}`)
        return p
      }
    }

    logForDebugging(`[GuiServer] WARNING: No GUI dist found. Checked:\n${candidates.map((c) => '  - ' + c).join('\n')}`)
    // Fallback to cwd-based path so serveStatic can return a helpful error.
    return candidates[1] || candidates[0]
  }

  async start(): Promise<{ port: number; url: string }> {
    let lastError: Error | null = null
    let currentPort = this.port

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = this.startOnPort(currentPort)
        this.port = currentPort
        return result
      } catch (err) {
        if (err instanceof Error && 'code' in err && (err as any).code === 'EADDRINUSE') {
          lastError = err
          logForDebugging(`[GuiServer] Port ${currentPort} in use, trying ${currentPort + 1}`)
          currentPort++
          continue
        }
        throw err
      }
    }

    throw new Error(
      `[GuiServer] Could not find available port after ${this.maxRetries + 1} attempts (ports ${this.port}-${currentPort}). Last error: ${lastError?.message}`,
    )
  }

  private startOnPort(port: number): { port: number; url: string } {
    const self = this

    this.server = Bun.serve<WsData>({
      port,
      hostname: '127.0.0.1',

      fetch(req, server) {
        let url: URL
        try {
          url = new URL(req.url)
        } catch {
          const host = req.headers.get('host') || `127.0.0.1:${self.port}`
          url = new URL(req.url, `http://${host}`)
        }

        if (url.pathname === '/health') {
          return new Response(JSON.stringify({ status: 'ok', clients: self.clients.size }), {
            headers: { 'Content-Type': 'application/json' },
          })
        }

        if (url.pathname === '/ws') {
          logForDebugging(`[GuiServer] WS upgrade request from ${req.headers.get('user-agent')?.slice(0, 50)}`)
          const upgraded = server.upgrade(req, { data: { id: crypto.randomUUID() } })
          if (upgraded) {
            logForDebugging('[GuiServer] WS upgrade succeeded')
            return
          }
          logForDebugging('[GuiServer] WS upgrade failed')
          return new Response('WebSocket upgrade failed', { status: 500 })
        }

        return self.serveStatic(url.pathname)
      },

      websocket: {
        open(ws) {
          self.clients.set(ws.data.id, ws)
          logForDebugging(`[GuiServer] Client connected: ${ws.data.id}, total clients: ${self.clients.size}`)
          try {
            ws.send(JSON.stringify({ type: 'gui_connected' }))
          } catch (err) {
            logForDebugging(`[GuiServer] Failed to send gui_connected: ${err}`)
          }
          try {
            self.callbacks.onClientConnected?.()
          } catch (err) {
            logForDebugging(`[GuiServer] onClientConnected error: ${err}`)
          }
        },

        message(ws, message) {
          try {
            const text = typeof message === 'string' ? message : message.toString()
            logForDebugging(`[GuiServer] Message from ${ws.data.id}: ${text.slice(0, 200)}`)
            const msg = JSON.parse(text)
            self.handleClientMessage(msg)
          } catch (err) {
            logForDebugging(`[GuiServer] Bad message from ${ws.data.id}: ${err}`)
          }
        },

        close(ws, code, reason) {
          self.clients.delete(ws.data.id)
          logForDebugging(`[GuiServer] Client disconnected: ${ws.data.id}, code=${code}, reason=${reason}`)
        },

        error(ws, err) {
          logForDebugging(`[GuiServer] WS error for ${ws.data.id}: ${err}`)
        },
      },
    })

    const url = `http://127.0.0.1:${port}`
    logForDebugging(`[GuiServer] Listening on ${url}`)
    return { port, url }
  }

  stop() {
    this.server?.stop(true)
    this.clients.clear()
    this.server = null
  }

  broadcast(data: unknown) {
    let json: string
    try {
      json = JSON.stringify(data)
    } catch (err) {
      logForDebugging(`[GuiServer] Failed to serialize broadcast: ${err}`)
      return
    }
    for (const ws of this.clients.values()) {
      try {
        ws.send(json)
      } catch { /* client may have disconnected */ }
    }
  }

  updateCallbacks(callbacks: Partial<GuiServerCallbacks>) {
    Object.assign(this.callbacks, callbacks)
  }

  getClientCount(): number {
    return this.clients.size
  }

  getUrl(): string | null {
    if (!this.server) return null
    return `http://127.0.0.1:${this.port}`
  }

  private handleClientMessage(msg: { type: string; payload?: Record<string, unknown> }) {
    const cb = this.callbacks
    switch (msg.type) {
      case 'user_input':
        cb.onUserInput?.(
          msg.payload?.content as string,
          msg.payload?.attachments as string[] | undefined,
        )
        break
      case 'user_permission_response':
        cb.onPermissionResponse?.(
          msg.payload?.requestId as string,
          msg.payload?.behavior as 'allow' | 'deny' | 'always_allow',
        )
        break
      case 'user_interrupt':
        cb.onInterrupt?.()
        break
      case 'user_design_system_request':
        cb.onDesignSystemRequest?.(
          msg.payload?.brand as string,
          msg.payload?.action as string,
          msg.payload?.query as string | undefined,
        )
        break
      case 'gui_create_session':
        cb.onCreateSession?.(msg.payload?.name as string | undefined)
        break
      case 'gui_switch_session':
        cb.onSwitchSession?.(msg.payload?.sessionId as string)
        break
      case 'gui_rename_session':
        cb.onRenameSession?.(
          msg.payload?.sessionId as string,
          msg.payload?.name as string,
        )
        break
      case 'gui_delete_session':
        cb.onDeleteSession?.(msg.payload?.sessionId as string)
        break
      case 'gui_create_share':
        cb.onCreateShare?.()
        break
      case 'gui_load_sessions':
        cb.onLoadSessions?.()
        break
      default:
        logForDebugging(`[GuiServer] Unknown message type: ${msg.type}`)
    }
  }

  private async serveStatic(pathname: string): Promise<Response> {
    const filePath = pathname === '/' ? '/index.html' : pathname
    const fullPath = resolve(this.distDir, `.${filePath}`)

    if (!isAbsolute(fullPath) || !fullPath.startsWith(this.distDir)) {
      return new Response('Forbidden', { status: 403 })
    }

    if (!existsSync(fullPath)) {
      // Only fall back to index.html for SPA routes (paths without file extensions).
      // Known static assets like .ico, .js, .css should return 404 if missing
      // to prevent browsers from trying to parse HTML as the wrong MIME type.
      const ext = extname(filePath)
      const isLikelyStaticAsset = ext.length > 0 && ext !== '.html'

      if (!isLikelyStaticAsset) {
        const indexPath = join(this.distDir, 'index.html')
        if (existsSync(indexPath)) {
          return new Response(Bun.file(indexPath), {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          })
        }
      }

      // If the dist directory itself is missing, return a helpful error page
      // instead of a bare 404 so users know they need to build the GUI.
      if (!existsSync(this.distDir)) {
        return new Response(
          `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>Latte GUI — Not Built</title></head>
<body style="font-family:system-ui,sans-serif;max-width:600px;margin:60px auto;padding:0 20px;color:#333">
  <h1>☕ Latte GUI 未构建</h1>
  <p>GUI 前端文件不存在：<code style="background:#f4f4f5;padding:2px 6px;border-radius:4px">${this.distDir}</code></p>
  <p>请先执行以下命令构建 GUI：</p>
  <pre style="background:#18181b;color:#e4e4e7;padding:16px;border-radius:8px;overflow-x:auto"><code>cd src/gui
bun install
bun run build</code></pre>
  <p>然后再重新启动 CLI 并运行 <code>/gui</code> 命令。</p>
</body>
</html>`,
          { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
        )
      }

      return new Response('Not Found', { status: 404 })
    }

    const ext = extname(fullPath)
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream'

    return new Response(Bun.file(fullPath), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': this.devMode ? 'no-cache' : 'public, max-age=3600',
      },
    })
  }
}
