import type { ClientMessage } from '../shared/protocol.ts'

let wsRef: WebSocket | null = null

export function setWsRef(ws: WebSocket | null) {
  wsRef = ws
}

export function sendWsMessage(msg: ClientMessage) {
  if (wsRef?.readyState === WebSocket.OPEN) {
    wsRef.send(JSON.stringify(msg))
  }
}
