import { useEffect, useCallback } from 'react'
import { useGuiStore } from '../store/guiStore.ts'
import { useToastStore } from '../store/toastStore.ts'
import type { ServerMessage, ClientMessage, GuiMessageItem } from '../shared/protocol.ts'
import { setWsRef, sendWsMessage } from './wsSender.ts'

// In Vite dev mode (port 5173/3000), the backend WS is still on 9720.
const DEV_WS_PORT = 9720
const isDevServer = ['5173', '3000', '8080'].includes(window.location.port)
const WS_URL = isDevServer
  ? `ws://127.0.0.1:${DEV_WS_PORT}/ws`
  : `ws://${window.location.host}/ws`

// ── Module-level singleton connection ──
let singletonWs: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let connectTimeout: ReturnType<typeof setTimeout> | null = null
let refCount = 0

const getState = useGuiStore.getState

function handleServerMessage(msg: ServerMessage) {
  const store = getState()

  switch (msg.type) {
    case 'gui_connected':
      store.setConnected(true)
      break

    case 'gui_disconnected':
      store.setConnected(false)
      break

    case 'gui_state_sync': {
      const p = msg.payload
      store.setSessionInfo({
        sessionId: p.sessionId,
        sessionName: p.sessionName,
        model: p.model,
        branch: p.branch,
        cost: p.cost,
        permissionMode: p.permissionMode,
      })
      store.setMessages(p.messages)
      store.clearTransient()
      break
    }

    case 'gui_message_stream': {
      const p = msg.payload
      const existing = store.messages.find((m) => m.id === p.messageId)
      if (existing) {
        // Backend sends accumulated content for partials, so we replace directly
        store.updateMessage(p.messageId, {
          content: p.content ?? existing.content,
          thinking: p.thinking ?? existing.thinking,
          done: p.done ?? existing.done,
        })
      } else {
        const item: GuiMessageItem = {
          id: p.messageId,
          role: p.role,
          content: p.content ?? '',
          thinking: p.thinking,
          done: p.done,
          timestamp: p.timestamp ?? Date.now(),
        }
        store.addMessage(item)
      }
      break
    }

    case 'gui_tool_call': {
      const p = msg.payload
      const existing = store.toolCalls.find((tc) => {
        // If toolUseId is available, match exclusively by it to avoid
        // incorrectly updating a different tool with the same name.
        if (p.toolUseId) return tc.toolUseId === p.toolUseId
        return tc.toolName === p.toolName && tc.status === 'running'
      })
      if (existing) {
        const matcher = p.toolUseId
          ? { toolUseId: p.toolUseId, toolName: p.toolName }
          : { toolName: p.toolName, input: p.input }
        store.updateToolCall(matcher, {
          status: p.status,
          output: p.output,
          durationMs: p.durationMs,
        })
      } else {
        store.addToolCall(p)
      }
      break
    }

    case 'gui_permission_request':
      store.addPermission(msg.payload)
      break

    case 'gui_diff_preview':
      store.addDiff(msg.payload)
      break

    case 'gui_design_system':
      store.setDesignSystem(msg.payload)
      break

    case 'gui_session_list':
      store.setSessions(msg.payload.sessions)
      break

    case 'gui_command_list':
      store.setCommands(msg.payload.commands)
      break

    case 'gui_error':
      useToastStore.getState().addToast({ type: 'error', message: msg.payload.message })
      break

    case 'gui_toast':
      useToastStore.getState().addToast({ type: msg.payload.type, message: msg.payload.message })
      break
  }
}

function connect() {
  if (singletonWs?.readyState === WebSocket.OPEN) {
    return
  }
  if (singletonWs?.readyState === WebSocket.CONNECTING) {
    // If stuck in CONNECTING for too long, force reconnect
    if (!connectTimeout) {
      connectTimeout = setTimeout(() => {
        connectTimeout = null
        if (singletonWs?.readyState === WebSocket.CONNECTING) {
          console.warn('[GUI] WebSocket stuck in CONNECTING, forcing reconnect')
          try { singletonWs.close() } catch { /* ignore */ }
          singletonWs = null
          connect()
        }
      }, 8000)
    }
    return
  }

  console.log('[GUI] Connecting to', WS_URL)
  const ws = new WebSocket(WS_URL)
  singletonWs = ws
  setWsRef(ws)

  ws.onopen = () => {
    console.log('[GUI] WebSocket connected')
    getState().setConnected(true)
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (connectTimeout) {
      clearTimeout(connectTimeout)
      connectTimeout = null
    }
  }

  ws.onclose = (ev) => {
    console.log(`[GUI] WebSocket closed: code=${ev.code}, reason=${ev.reason}`)
    getState().setConnected(false)
    setWsRef(null)
    if (singletonWs === ws) singletonWs = null
    if (!reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null
        connect()
      }, 2000)
    }
  }

  ws.onmessage = (event) => {
    try {
      const msg: ServerMessage = JSON.parse(event.data)
      handleServerMessage(msg)
    } catch (err) {
      console.warn('[GUI] Malformed WebSocket message:', err)
    }
  }

  ws.onerror = (err) => {
    console.warn('[GUI] WebSocket error:', err)
  }
}

function disconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (connectTimeout) {
    clearTimeout(connectTimeout)
    connectTimeout = null
  }
  setWsRef(null)
  singletonWs?.close()
  singletonWs = null
}

export { sendWsMessage } from './wsSender.ts'

export function useWebSocket() {
  useEffect(() => {
    refCount++
    if (refCount === 1) connect()
    return () => {
      refCount--
      if (refCount === 0) disconnect()
    }
  }, [])

  const send = useCallback((msg: ClientMessage) => sendWsMessage(msg), [])

  return { send }
}
