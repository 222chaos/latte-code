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

  setConnected: (v: boolean) => void
  setSessionInfo: (info: Partial<Pick<GuiState, 'sessionId' | 'sessionName' | 'model' | 'branch' | 'cost' | 'permissionMode'>>) => void
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
  theme: 'dark',
  sidebarCollapsed: false,
  inspectorCollapsed: true,
  activeInspectorTab: 'sources',
  sources: [],
  planItems: [],

  setConnected: (v) => set({ connected: v }),
  setSessionInfo: (info) => set(info),
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
        const nameMatch = tc.toolName === matcher.toolName && (!matcher.input || stableStringify(tc.input) === stableStringify(matcher.input))
        return idMatch || nameMatch ? { ...tc, ...partial } : tc
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
    document.documentElement.classList.remove('dark', 'light')
    document.documentElement.classList.add(t)
    set({ theme: t })
  },
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  toggleInspector: () => set((s) => ({ inspectorCollapsed: !s.inspectorCollapsed })),
  setActiveInspectorTab: (t) => set({ activeInspectorTab: t }),
  setSources: (sources: FileNode[]) => set({ sources }),
  setPlanItems: (planItems: PlanItem[]) => set({ planItems }),
  clearTransient: () => set({ toolCalls: [], pendingPermissions: [], diffs: [] }),
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
}))

function togglePlanItemRecursive(item: PlanItem, id: string): PlanItem {
  if (item.id === id) {
    return { ...item, status: item.status === 'done' ? 'pending' : 'done' }
  }
  if (item.children) {
    return { ...item, children: item.children.map((c) => togglePlanItemRecursive(c, id)) }
  }
  return item
}

function stableStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj)
  const sorted = Object.keys(obj as Record<string, unknown>)
    .sort()
    .reduce(
      (acc, key) => {
        acc[key] = (obj as Record<string, unknown>)[key]
        return acc
      },
      {} as Record<string, unknown>,
    )
  return JSON.stringify(sorted)
}
