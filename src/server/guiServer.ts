import { Server, type ServerWebSocket } from 'bun'
import { join, extname, resolve, isAbsolute } from 'path'
import { existsSync } from 'fs'
import { logForDebugging } from '../utils/debug.js'
import { EMBEDDED_ASSETS } from './embeddedAssets.js'

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.cjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
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
  onSessionSwitch?: (sessionId: string) => void
  onClientConnect?: () => void
  onClientDisconnect?: () => void
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
    const candidates = [
      // Source execution: src/server/ -> src/ -> project root -> dist/gui
      resolve(import.meta.dir, '..', '..', 'dist', 'gui'),
      // Compiled binary next to dist/gui (e.g. binary at project root)
      resolve(import.meta.dir, 'dist', 'gui'),
      // Fallback to cwd
      resolve(process.cwd(), 'dist', 'gui'),
    ]
    for (const p of candidates) {
      if (existsSync(join(p, 'index.html'))) return p
    }
    return candidates[0]
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
        const url = new URL(req.url)

        if (url.pathname === '/health') {
          return new Response(JSON.stringify({ status: 'ok', clients: self.clients.size }), {
            headers: { 'Content-Type': 'application/json' },
          })
        }

        if (url.pathname === '/ws') {
          const upgraded = server.upgrade(req, { data: { id: crypto.randomUUID() } })
          if (upgraded) return undefined
          return new Response('WebSocket upgrade failed', { status: 500 })
        }

        return self.serveStatic(url.pathname)
      },

      websocket: {
        open(ws) {
          self.clients.set(ws.data.id, ws)
          logForDebugging(`[GuiServer] Client connected: ${ws.data.id}`)
          ws.send(JSON.stringify({ type: 'gui_connected' }))
          self.callbacks.onClientConnect?.()
        },

        message(ws, message) {
          try {
            const msg = JSON.parse(typeof message === 'string' ? message : message.toString())
            self.handleClientMessage(msg, ws)
          } catch (err) {
            logForDebugging(`[GuiServer] Bad message from ${ws.data.id}: ${err}`)
          }
        },

        close(ws) {
          self.clients.delete(ws.data.id)
          logForDebugging(`[GuiServer] Client disconnected: ${ws.data.id}`)
          if (self.clients.size === 0) {
            self.callbacks.onClientDisconnect?.()
          }
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
    const json = JSON.stringify(data)
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

  private handleClientMessage(msg: { type: string; payload?: Record<string, unknown> }, ws: ServerWebSocket<WsData>) {
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
      case 'user_session_switch':
        cb.onSessionSwitch?.(msg.payload?.sessionId as string)
        break
      case 'ping':
        // Application-level heartbeat
        try {
          ws.send(JSON.stringify({ type: 'pong' }))
        } catch { /* client may have disconnected */ }
        break
      default:
        logForDebugging(`[GuiServer] Unknown message type: ${msg.type}`)
    }
  }

  private async serveStatic(pathname: string): Promise<Response> {
    const filePath = pathname === '/' ? '/index.html' : pathname

    // 1. Try embedded assets first (compiled binary)
    const embedded = EMBEDDED_ASSETS[filePath]
    if (embedded) {
      const ext = extname(filePath)
      const contentType = MIME_TYPES[ext] ?? 'application/octet-stream'
      const body = embedded.isBase64
        ? Buffer.from(embedded.content, 'base64')
        : embedded.content
      return new Response(body, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': this.devMode ? 'no-cache' : 'public, max-age=3600',
        },
      })
    }

    // 2. Fallback to filesystem
    const fullPath = resolve(this.distDir, `.${filePath}`)

    if (!isAbsolute(fullPath) || !fullPath.startsWith(this.distDir)) {
      return new Response('Forbidden', { status: 403 })
    }

    if (!existsSync(fullPath)) {
      const indexPath = join(this.distDir, 'index.html')
      if (existsSync(indexPath)) {
        return new Response(Bun.file(indexPath).stream(), {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
      }
      return new Response('Not Found', { status: 404 })
    }

    const ext = extname(fullPath)
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream'

    return new Response(Bun.file(fullPath).stream(), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': this.devMode ? 'no-cache' : 'public, max-age=3600',
      },
    })
  }
}
