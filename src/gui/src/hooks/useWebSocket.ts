import { useEffect, useCallback } from 'react'
import { useGuiStore } from '../store/guiStore.ts'
import { useToastStore } from '../store/toastStore.ts'
import type { ServerMessage, ClientMessage, GuiMessageItem } from '../shared/protocol.ts'

const WS_URL = `ws://${window.location.host}/ws`

// ── Module-level singleton connection ──
let singletonWs: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
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
        store.updateMessage(p.messageId, {
          content: p.content ?? existing.content,
          thinking: p.thinking ?? existing.thinking,
        })
      } else {
        const item: GuiMessageItem = {
          id: p.messageId,
          role: p.role,
          content: p.content ?? '',
          thinking: p.thinking,
          timestamp: p.timestamp,
        }
        store.addMessage(item)
      }
      break
    }

    case 'gui_tool_call': {
      const p = msg.payload
      const matcher = p.toolUseId
        ? { toolUseId: p.toolUseId, toolName: p.toolName }
        : { toolName: p.toolName, input: p.input }
      const existing = store.toolCalls.find((tc) => {
        if (p.toolUseId && tc.toolUseId === p.toolUseId) return true
        return tc.toolName === p.toolName && tc.status === 'running'
      })
      if (existing && p.status !== 'running') {
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

    case 'gui_error':
      useToastStore.getState().addToast({ type: 'error', message: msg.payload.message })
      break
  }
}

function connect() {
  if (singletonWs?.readyState === WebSocket.OPEN) return

  const ws = new WebSocket(WS_URL)
  singletonWs = ws

  ws.onopen = () => {
    getState().setConnected(true)
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  ws.onclose = () => {
    getState().setConnected(false)
    if (singletonWs === ws) singletonWs = null
    reconnectTimer = setTimeout(connect, 2000)
  }

  ws.onmessage = (event) => {
    try {
      const msg: ServerMessage = JSON.parse(event.data)
      handleServerMessage(msg)
    } catch {
      // ignore malformed messages
    }
  }

  ws.onerror = () => {
    ws.close()
  }
}

function disconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  singletonWs?.close()
  singletonWs = null
}

export function sendWsMessage(msg: ClientMessage) {
  if (singletonWs?.readyState === WebSocket.OPEN) {
    singletonWs.send(JSON.stringify(msg))
  }
}

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
