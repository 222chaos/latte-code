// ─── Server → Client ───

export type ServerMessage =
  | GuiStateSync
  | GuiMessageStream
  | GuiToolCall
  | GuiPermissionRequest
  | GuiDiffPreview
  | GuiDesignSystem
  | GuiSessionList
  | GuiConnected
  | GuiDisconnected
  | GuiError

export type ClientMessage =
  | UserInput
  | UserPermissionResponse
  | UserDesignSystemRequest
  | UserInterrupt

export interface GuiStateSync {
  type: 'gui_state_sync'
  payload: {
    messages: GuiMessageItem[]
    sessionId: string
    sessionName: string
    model: string
    branch?: string
    cost: number
    permissionMode: string
  }
}

export interface GuiMessageStream {
  type: 'gui_message_stream'
  payload: {
    messageId: string
    role: 'user' | 'assistant' | 'system'
    content?: string
    thinking?: string
    toolUse?: GuiToolUseBlock
    toolResult?: GuiToolResultBlock
    done?: boolean
    timestamp: number
  }
}

export interface GuiToolCall {
  type: 'gui_tool_call'
  payload: {
    toolUseId?: string
    toolName: string
    input: Record<string, unknown>
    status: 'running' | 'success' | 'error'
    output?: string
    durationMs?: number
  }
}

export interface GuiPermissionRequest {
  type: 'gui_permission_request'
  payload: {
    requestId: string
    toolName: string
    input: Record<string, unknown>
    description: string
  }
}

export interface GuiDiffPreview {
  type: 'gui_diff_preview'
  payload: {
    filePath: string
    oldContent: string
    newContent: string
    diff: string
  }
}

export interface GuiDesignSystem {
  type: 'gui_design_system'
  payload: {
    brand: string
    colors: Record<string, string>
    typography: {
      fontFamily?: string
      lineHeight?: string
      sizes?: Record<string, string>
    }
    layout?: {
      spacing?: string
      maxWidth?: string
    }
    tailwindConfig?: string
    cssVariables?: string
  }
}

export interface GuiSessionList {
  type: 'gui_session_list'
  payload: {
    sessions: Array<{
      id: string
      name: string
      status: 'active' | 'idle' | 'completed'
      updatedAt: number
    }>
  }
}

export interface GuiConnected {
  type: 'gui_connected'
}

export interface GuiDisconnected {
  type: 'gui_disconnected'
}

export interface GuiError {
  type: 'gui_error'
  payload: {
    message: string
  }
}

// ─── Client → Server ───

export interface UserInput {
  type: 'user_input'
  payload: {
    content: string
    attachments?: string[]
  }
}

export interface UserPermissionResponse {
  type: 'user_permission_response'
  payload: {
    requestId: string
    behavior: 'allow' | 'deny' | 'always_allow'
    updatedInput?: Record<string, unknown>
  }
}

export interface UserDesignSystemRequest {
  type: 'user_design_system_request'
  payload: {
    brand: string
    action: 'get' | 'search' | 'list' | 'compare'
    query?: string
  }
}

export interface UserInterrupt {
  type: 'user_interrupt'
}

// ─── Shared Data Types ───

export interface GuiMessageItem {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  thinking?: string
  toolUses?: GuiToolUseBlock[]
  toolResults?: GuiToolResultBlock[]
  timestamp: number
}

export interface GuiToolUseBlock {
  id: string
  name: string
  input: Record<string, unknown>
}

export interface GuiToolResultBlock {
  toolUseId: string
  content: string
  isError?: boolean
}
