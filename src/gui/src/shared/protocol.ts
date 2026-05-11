// ─── Server → Client ───

export type ServerMessage =
  | GuiStateSync
  | GuiMetadataSync
  | GuiMessageStream
  | GuiToolCall
  | GuiPermissionRequest
  | GuiDiffPreview
  | GuiDesignSystem
  | GuiSessionList
  | GuiConnected
  | GuiDisconnected
  | GuiError
  | Pong
  | GuiModelsSync
  | GuiSourcesSync
  | GuiPlanSync
  | GuiCommandsSync

export type ClientMessage =
  | UserInput
  | UserPermissionResponse
  | UserDesignSystemRequest
  | UserInterrupt
  | UserSessionSwitch
  | UserSessionDelete
  | UserSessionRename
  | Ping

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
    isHistoryView?: boolean
  }
}

export interface GuiMetadataSync {
  type: 'gui_metadata_sync'
  payload: {
    sessionId?: string
    sessionName?: string
    model?: string
    branch?: string
    cost?: number
    permissionMode?: string
  }
}

export interface GuiMessageStream {
  type: 'gui_message_stream'
  payload: {
    messageId: string
    role: 'user' | 'assistant' | 'system'
    content?: string
    thinking?: string
    toolUses?: GuiToolUseBlock[]
    toolResults?: GuiToolResultBlock[]
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
    diff?: string
    toolName?: string
    accepted?: boolean
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

export interface UserSessionSwitch {
  type: 'user_session_switch'
  payload: {
    sessionId: string
  }
}

export interface UserSessionDelete {
  type: 'user_session_delete'
  payload: {
    sessionId: string
  }
}

export interface UserSessionRename {
  type: 'user_session_rename'
  payload: {
    sessionId: string
    name: string
  }
}

export interface Ping {
  type: 'ping'
}

export interface Pong {
  type: 'pong'
}

export interface GuiModelsSync {
  type: 'gui_models_sync'
  payload: {
    models: Array<{ id: string; name: string; description?: string }>
  }
}

export interface GuiSourcesSync {
  type: 'gui_sources_sync'
  payload: {
    sources: Array<{ name: string; path: string; type: 'file' | 'dir' }>
  }
}

export interface GuiPlanSync {
  type: 'gui_plan_sync'
  payload: {
    planItems: Array<{ id: string; text: string; status: 'pending' | 'in_progress' | 'done' }>
  }
}

export interface GuiCommandsSync {
  type: 'gui_commands_sync'
  payload: {
    commands: Array<{ name: string; description: string; descriptionZh?: string; aliases?: string[]; argumentHint?: string }>
  }
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
