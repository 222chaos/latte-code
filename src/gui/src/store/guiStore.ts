import { create } from 'zustand'
import type { GuiMessageItem, GuiToolCall, GuiPermissionRequest, GuiDiffPreview, GuiDesignSystem } from '../shared/protocol.ts'

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'dir'
  children?: FileNode[]
}

export interface PlanItem {
  id: string
  text: string
  status: 'pending' | 'in_progress' | 'done'
  children?: PlanItem[]
}

interface Session {
  id: string
  name: string
  status: 'active' | 'idle' | 'completed'
  updatedAt: number
}

type InspectorTab = 'sources' | 'plan' | 'diff' | 'design' | 'settings'

interface GuiState {
  connected: boolean
  sessionId: string
  sessionName: string
  model: string
  branch?: string
  cost: number
  permissionMode: string
  messages: GuiMessageItem[]
  sessions: Session[]
  toolCalls: GuiToolCall['payload'][]
  pendingPermissions: GuiPermissionRequest['payload'][]
  diffs: GuiDiffPreview['payload'][]
  currentDesignSystem: GuiDesignSystem['payload'] | null
  theme: 'dark' | 'light'
  sidebarCollapsed: boolean
  inspectorCollapsed: boolean
  activeInspectorTab: InspectorTab
  sources: FileNode[]
  planItems: PlanItem[]
  isGenerating: boolean
  availableModels: Array<{ id: string; name: string; description?: string }>
  isHistoryView: boolean
  commands: Array<{ name: string; description: string; descriptionZh?: string; aliases?: string[]; argumentHint?: string }>

  setConnected: (v: boolean) => void
  setSessionInfo: (info: Partial<Pick<GuiState, 'sessionId' | 'sessionName' | 'model' | 'branch' | 'cost' | 'permissionMode' | 'isHistoryView'>>) => void
  setMessages: (messages: GuiMessageItem[]) => void
  addMessage: (msg: GuiMessageItem) => void
  updateMessage: (id: string, partial: Partial<GuiMessageItem>) => void
  setSessions: (sessions: Session[]) => void
  addToolCall: (tc: GuiToolCall['payload']) => void
  updateToolCall: (matcher: { toolUseId?: string; toolName: string; input?: Record<string, unknown> }, partial: Partial<GuiToolCall['payload']>) => void
  addPermission: (p: GuiPermissionRequest['payload']) => void
  removePermission: (requestId: string) => void
  addDiff: (d: GuiDiffPreview['payload']) => void
  setDesignSystem: (d: GuiDesignSystem['payload'] | null) => void
  setTheme: (t: 'dark' | 'light') => void
  toggleSidebar: () => void
  toggleInspector: () => void
  setActiveInspectorTab: (t: InspectorTab) => void
  setSources: (sources: FileNode[]) => void
  setPlanItems: (planItems: PlanItem[]) => void
  clearTransient: () => void
  deleteSession: (id: string) => void
  renameSession: (id: string, name: string) => void
  togglePlanItem: (id: string) => void
  setGenerating: (v: boolean) => void
  setAvailableModels: (models: Array<{ id: string; name: string; description?: string }>) => void
}

const savedTheme = (() => {
  try {
    const t = localStorage.getItem('latte-gui-theme')
    if (t === 'dark' || t === 'light') return t
  } catch { /* ignore */ }
  return 'dark'
})()

// Apply saved theme on module load
if (typeof document !== 'undefined') {
  document.documentElement.classList.remove('dark', 'light')
  document.documentElement.classList.add(savedTheme)
}

export const useGuiStore = create<GuiState>((set) => ({
  connected: false,
  sessionId: '',
  sessionName: 'New Thread',
  model: 'claude-opus-4',
  branch: 'main',
  cost: 0,
  permissionMode: 'default',
  messages: [],
  sessions: [],
  toolCalls: [],
  pendingPermissions: [],
  diffs: [],
  currentDesignSystem: null,
  theme: savedTheme,
  sidebarCollapsed: false,
  inspectorCollapsed: true,
  activeInspectorTab: 'sources',
  sources: [],
  planItems: [],
  isGenerating: false,
  availableModels: [],
  isHistoryView: false,
  commands: [],

  setConnected: (v) => set({ connected: v }),
  setSessionInfo: (info) =>
    set((s) => ({
      sessionId: info.sessionId ?? s.sessionId,
      sessionName: info.sessionName ?? s.sessionName,
      model: info.model ?? s.model,
      branch: info.branch ?? s.branch,
      cost: info.cost ?? s.cost,
      permissionMode: info.permissionMode ?? s.permissionMode,
      isHistoryView: info.isHistoryView ?? s.isHistoryView,
    })),
  setMessages: (messages) => set({ messages }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  updateMessage: (id, partial) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...partial } : m)),
    })),
  setSessions: (sessions) => set({ sessions }),
  addToolCall: (tc) => set((s) => ({ toolCalls: [...s.toolCalls, tc] })),
  updateToolCall: (matcher, partial) =>
    set((s) => ({
      toolCalls: s.toolCalls.map((tc) => {
        const idMatch = matcher.toolUseId && tc.toolUseId === matcher.toolUseId
        // Fallback: if matcher lacks toolUseId but we know the running tool by name,
        // match it so progress/result updates don't get dropped.
        const fallbackMatch = !matcher.toolUseId && tc.toolUseId && tc.toolName === matcher.toolName && tc.status === 'running'
        const nameMatch = tc.toolName === matcher.toolName && (!matcher.input || stableStringify(tc.input) === stableStringify(matcher.input))
        return idMatch || fallbackMatch || nameMatch ? { ...tc, ...partial } : tc
      }),
    })),
  addPermission: (p) => set((s) => ({ pendingPermissions: [...s.pendingPermissions, p] })),
  removePermission: (requestId) =>
    set((s) => ({
      pendingPermissions: s.pendingPermissions.filter((p) => p.requestId !== requestId),
    })),
  addDiff: (d) => set((s) => ({ diffs: [...s.diffs, d] })),
  setDesignSystem: (d) => set({ currentDesignSystem: d }),
  setTheme: (t) => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('dark', 'light')
      document.documentElement.classList.add(t)
    }
    try { localStorage.setItem('latte-gui-theme', t) } catch { /* ignore */ }
    set({ theme: t })
  },
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  toggleInspector: () => set((s) => ({ inspectorCollapsed: !s.inspectorCollapsed })),
  setActiveInspectorTab: (t) => set({ activeInspectorTab: t }),
  setSources: (sources: FileNode[]) => set({ sources }),
  setPlanItems: (planItems: PlanItem[]) => set({ planItems }),
  clearTransient: () => set({ toolCalls: [], pendingPermissions: [], diffs: [], sources: [], planItems: [] }),
  setGenerating: (v: boolean) => set({ isGenerating: v }),
  deleteSession: (id: string) =>
    set((s) => ({ sessions: s.sessions.filter((sess) => sess.id !== id) })),
  renameSession: (id: string, name: string) =>
    set((s) => ({
      sessions: s.sessions.map((sess) => (sess.id === id ? { ...sess, name } : sess)),
    })),
  togglePlanItem: (id: string) =>
    set((s) => ({
      planItems: s.planItems.map((item) => togglePlanItemRecursive(item, id)),
    })),
  setAvailableModels: (models) => set({ availableModels: models }),
}))

function nextPlanStatus(status: PlanItem['status']): PlanItem['status'] {
  if (status === 'pending') return 'in_progress'
  if (status === 'in_progress') return 'done'
  return 'pending'
}

function togglePlanItemRecursive(item: PlanItem, id: string): PlanItem {
  if (item.id === id) {
    return { ...item, status: nextPlanStatus(item.status) }
  }
  if (item.children) {
    return { ...item, children: item.children.map((c) => togglePlanItemRecursive(c, id)) }
  }
  return item
}

function stableStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj)
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(',')}]`
  const sorted = Object.keys(obj as Record<string, unknown>)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify((obj as Record<string, unknown>)[key])}`)
    .join(',')
  return `{${sorted}}`
}
