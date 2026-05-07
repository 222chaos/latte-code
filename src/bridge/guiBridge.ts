import { QueryEngine } from '../QueryEngine.js'
import { createFileStateCacheWithSizeLimit } from '../utils/fileStateCache.js'
import { getAllBaseTools } from '../tools.js'
import { logForDebugging } from '../utils/debug.js'
import type { GuiServer } from '../server/guiServer.js'
import type { LocalJSXCommandContext } from '../types/command.js'
import type { SDKMessage, SDKControlPermissionRequest } from '../entrypoints/sdk/controlTypes.js'
import type { PermissionDecision } from '../types/permissions.js'
import { designMdSkill } from '../skills/design-md-skill.js'
import { generateCapability } from '../skills/bundled/design-md/capabilities/generate.js'
import type { GuiMessageStream, GuiToolCall, GuiPermissionRequest, GuiDiffPreview, GuiDesignSystem, GuiSessionList, GuiStateSync, GuiError, GuiToast } from '../gui/shared/protocol.js'
import { listSessionsImpl } from '../utils/listSessionsImpl.js'
import { saveCustomTitle, getTranscriptPathForSession, loadTranscriptFile } from '../utils/sessionStorage.js'
import { getSessionId, switchSession as bootstrapSwitchSession } from '../bootstrap/state.js'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

export class GuiBridge {
  private guiServer: GuiServer
  private context: LocalJSXCommandContext
  private engine: QueryEngine | null = null
  private pendingPermissions = new Map<string, Deferred<PermissionDecision>>()
  private permissionCounter = 0
  private isRunning = false
  private toolNameMap = new Map<string, string>()
  private toolInputMap = new Map<string, Record<string, unknown>>()
  private initPromise: Promise<void> | null = null
  private totalCost = 0

  constructor(guiServer: GuiServer, context: LocalJSXCommandContext) {
    this.guiServer = guiServer
    this.context = context
  }

  async init() {
    if (this.initPromise) return this.initPromise
    this.initPromise = (async () => {
      const tools = getAllBaseTools()
      const fileCache = createFileStateCacheWithSizeLimit(100)

      this.engine = new QueryEngine({
        cwd: process.cwd(),
        tools,
        commands: this.context.options.commands,
        mcpClients: this.context.options.mcpClients,
        agents: this.context.options.agentDefinitions?.definitions ?? [],
        canUseTool: this.wrapCanUseTool(),
        getAppState: () => this.context.getAppState(),
        setAppState: (updater) => this.context.setAppState(updater),
        readFileCache: fileCache,
        userSpecifiedModel: this.context.options.mainLoopModel,
        verbose: this.context.options.verbose,
        thinkingConfig: this.context.options.thinkingConfig,
        includePartialMessages: true,
      })

      logForDebugging('[GuiBridge] QueryEngine initialized')
    })()

    this.broadcastCommandList()
    this.loadSessions()

    return this.initPromise
  }

  broadcastCommandList() {
    try {
      const commands = this.context.options.commands ?? []
      const visible = commands
        .filter((cmd: any) => !cmd.isHidden && (cmd.userInvocable !== false))
        .map((cmd: any) => ({
          name: cmd.name,
          description: cmd.description || '',
          descriptionZh: cmd.descriptionZh,
          aliases: cmd.aliases,
          argumentHint: cmd.argumentHint,
        }))
      this.broadcast({
        type: 'gui_command_list',
        payload: { commands: visible },
      } as any)
    } catch (err) {
      logForDebugging(`[GuiBridge] Failed to broadcast command list: ${err}`)
    }
  }

  async loadSessions() {
    try {
      const sessions = await listSessionsImpl({ limit: 50 })
      const formatted = sessions.map((s) => ({
        id: s.sessionId,
        name: s.customTitle || s.firstPrompt || s.summary || '(untitled)',
        timestamp: s.lastModified || Date.now(),
        messageCount: 0,
      }))
      this.broadcast({
        type: 'gui_session_list',
        payload: { sessions: formatted },
      } as GuiSessionList)
    } catch (err) {
      logForDebugging(`[GuiBridge] Failed to load sessions: ${err}`)
    }
  }

  async handleCreateSession(name?: string) {
    try {
      const { regenerateSessionId } = await import('../bootstrap/state.js')
      regenerateSessionId({ setCurrentAsParent: true })

      if (name) {
        const sessionId = getSessionId()
        await saveCustomTitle(sessionId, name)
      }

      this.engine = null
      this.totalCost = 0
      this.toolNameMap.clear()
      this.toolInputMap.clear()
      await this.init()
      this.syncState()
    } catch (err) {
      logForDebugging(`[GuiBridge] Failed to create session: ${err}`)
      this.broadcast({
        type: 'gui_error',
        payload: { message: `Failed to create session: ${err instanceof Error ? err.message : String(err)}` },
      } as GuiError)
    }
  }

  async handleSwitchSession(sessionId: string) {
    try {
      bootstrapSwitchSession(sessionId as any)

      this.engine = null
      this.totalCost = 0
      this.toolNameMap.clear()
      this.toolInputMap.clear()
      this.pendingPermissions.clear()
      await this.init()

      const transcriptPath = getTranscriptPathForSession(sessionId)
      if (existsSync(transcriptPath)) {
        try {
          const transcript = await loadTranscriptFile(transcriptPath)
          const messages = Array.from(transcript.messages.values())
            .sort((a: any, b: any) => (a.timestamp || 0) - (b.timestamp || 0))
            .map((m: any, i: number) => ({
              id: m.uuid || `msg-${i}`,
              role: m.role,
              content: typeof m.message?.content === 'string'
                ? m.message.content
                : Array.isArray(m.message?.content)
                  ? m.message.content.map((b: any) => b.text || b.thinking || '').join('\n')
                  : '',
              timestamp: m.timestamp || Date.now(),
            }))

          this.broadcast({
            type: 'gui_state_sync',
            payload: {
              messages,
              sessionId,
              sessionName: 'Resumed Session',
              model: this.context.options.mainLoopModel,
              cost: 0,
              permissionMode: this.context.getAppState().toolPermissionContext?.mode || 'default',
            },
          } as GuiStateSync)
        } catch (err) {
          logForDebugging(`[GuiBridge] Failed to load transcript for session ${sessionId}: ${err}`)
          this.syncState()
        }
      } else {
        this.syncState()
      }
    } catch (err) {
      logForDebugging(`[GuiBridge] Failed to switch session: ${err}`)
      this.broadcast({
        type: 'gui_error',
        payload: { message: `Failed to switch session: ${err instanceof Error ? err.message : String(err)}` },
      } as GuiError)
    }
  }

  async handleRenameSession(sessionId: string, name: string) {
    try {
      await saveCustomTitle(sessionId as any, name)
      this.loadSessions()
    } catch (err) {
      logForDebugging(`[GuiBridge] Failed to rename session: ${err}`)
      this.broadcast({
        type: 'gui_error',
        payload: { message: `Failed to rename session: ${err instanceof Error ? err.message : String(err)}` },
      } as GuiError)
    }
  }

  async handleDeleteSession(sessionId: string) {
    try {
      const transcriptPath = getTranscriptPathForSession(sessionId)
      if (existsSync(transcriptPath)) {
        await unlink(transcriptPath)
      }
      this.loadSessions()
    } catch (err) {
      logForDebugging(`[GuiBridge] Failed to delete session: ${err}`)
      this.broadcast({
        type: 'gui_error',
        payload: { message: `Failed to delete session: ${err instanceof Error ? err.message : String(err)}` },
      } as GuiError)
    }
  }

  handleCreateShare() {
    const sessionId = this.engine?.getSessionId() || getSessionId()
    const shareUrl = `latte://session/${sessionId}`

    try {
      const { execSync } = require('child_process')
      if (process.platform === 'win32') {
        execSync(`powershell -command "Set-Clipboard -Value '${shareUrl}'"`, { stdio: 'ignore' })
      } else if (process.platform === 'darwin') {
        execSync(`echo '${shareUrl}' | pbcopy`, { stdio: 'ignore' })
      } else {
        execSync(`echo '${shareUrl}' | xclip -selection clipboard`, { stdio: 'ignore' })
      }
    } catch { /* clipboard not available */ }

    this.broadcast({
      type: 'gui_toast',
      payload: { type: 'success', message: `Share link copied: ${shareUrl}` },
    } as GuiToast)
  }

  async handleUserInput(content: string, attachments?: string[]) {
    if (!this.engine) {
      await this.init()
    }
    if (this.isRunning) {
      this.broadcast({ type: 'gui_error', payload: { message: 'A query is already in progress' } })
      return
    }

    this.isRunning = true

    let promptContent: string = content
    if (attachments && attachments.length > 0) {
      const attachmentInfo = attachments.map((a) => `[Attachment: ${a}]`).join('\n')
      promptContent = `${attachmentInfo}\n\n${content}`
    }

    this.broadcast({
      type: 'gui_message_stream',
      payload: {
        messageId: `user-${Date.now()}`,
        role: 'user',
        content: promptContent,
        done: true,
        timestamp: Date.now(),
      },
    } as GuiMessageStream)

    try {
      const generator = this.engine!.submitMessage(promptContent)
      const state = {
        assistantMessageId: `assistant-${Date.now()}`,
        currentContent: '',
        currentThinking: '',
      }

      for await (const msg of generator) {
        this.handleSDKMessage(msg as SDKMessage, state)
      }
    } catch (err) {
      logForDebugging(`[GuiBridge] Query error: ${err}`)
      this.broadcast({
        type: 'gui_error',
        payload: { message: err instanceof Error ? err.message : String(err) },
      } as GuiError)
    } finally {
      this.isRunning = false
      this.syncState()
    }
  }

  handlePermissionResponse(requestId: string, behavior: 'allow' | 'deny' | 'always_allow') {
    const deferred = this.pendingPermissions.get(requestId)
    if (!deferred) {
      logForDebugging(`[GuiBridge] No pending permission for ${requestId}`)
      return
    }

    if (behavior === 'allow') {
      deferred.resolve({ behavior: 'allow' })
    } else if (behavior === 'always_allow') {
      const toolName = this.pendingPermissionToolNames.get(requestId)
      if (toolName) {
        this.addAlwaysAllowRule(toolName)
      }
      deferred.resolve({ behavior: 'allow' })
    } else {
      deferred.resolve({ behavior: 'deny', message: 'Denied by user via GUI' })
    }

    this.pendingPermissions.delete(requestId)
    this.pendingPermissionToolNames.delete(requestId)
  }

  private pendingPermissionToolNames = new Map<string, string>()

  private addAlwaysAllowRule(toolName: string) {
    try {
      const appState = this.context.getAppState()
      const currentRules = appState.toolPermissionContext?.alwaysAllowRules ?? {}
      const sessionRules = currentRules.session ?? []
      const existingRule = sessionRules.find((r: any) => r.tool === toolName)
      if (!existingRule) {
        const newRules = {
          ...currentRules,
          session: [...sessionRules, { tool: toolName }],
        }
        this.context.setAppState((prev: any) => ({
          ...prev,
          toolPermissionContext: {
            ...prev.toolPermissionContext,
            alwaysAllowRules: newRules,
          },
        }))
      }
    } catch (err) {
      logForDebugging(`[GuiBridge] Failed to add always-allow rule: ${err}`)
    }
  }

  async handleDesignSystemRequest(brand: string, action: string, query?: string) {
    try {
      const result = await designMdSkill.handler({ action: action as any, brand, query, format: 'json', theme: 'dark' })
      if (result.success && result.data) {
        const generated = await generateCapability.generate({
          brand,
          outputType: 'tailwind',
          options: {},
        })

        const payload: GuiDesignSystem['payload'] = {
          brand,
          colors: result.data.colors ?? {},
          typography: result.data.typography ?? {},
          layout: result.data.layout ?? {},
          tailwindConfig: generated.success ? generated.code : undefined,
          cssVariables: undefined,
        }

        this.broadcast({ type: 'gui_design_system', payload })
      } else {
        this.broadcast({
          type: 'gui_error',
          payload: { message: result.error || 'Failed to fetch design system' },
        } as GuiError)
      }
    } catch (err) {
      logForDebugging(`[GuiBridge] Design system error: ${err}`)
      this.broadcast({
        type: 'gui_error',
        payload: { message: err instanceof Error ? err.message : String(err) },
      } as GuiError)
    }
  }

  handleInterrupt() {
    this.engine?.interrupt()
  }

  private wrapCanUseTool() {
    const original = this.context.canUseTool
    return async (tool: any, input: any, toolUseContext: any, assistantMessage: any, toolUseID: string, forceDecision?: any) => {
      if (forceDecision) return forceDecision
      if (!original) return { behavior: 'allow' } as PermissionDecision

      const result = await original(tool, input, toolUseContext, assistantMessage, toolUseID)
      if (result.behavior !== 'ask') return result

      this.permissionCounter++
      const requestId = `perm-${this.permissionCounter}`
      const deferred = createDeferred<PermissionDecision>()
      this.pendingPermissions.set(requestId, deferred)
      this.pendingPermissionToolNames.set(requestId, tool.name || String(tool))

      const timeoutId = setTimeout(() => {
        if (this.pendingPermissions.has(requestId)) {
          this.pendingPermissions.delete(requestId)
          this.pendingPermissionToolNames.delete(requestId)
          deferred.resolve({ behavior: 'deny', message: 'Permission request timed out (5 minutes)' })
          this.broadcast({
            type: 'gui_error',
            payload: { message: `Permission timeout: ${tool.name || String(tool)}` },
          } as GuiError)
        }
      }, 5 * 60 * 1000)

      deferred.promise.then(() => clearTimeout(timeoutId), () => clearTimeout(timeoutId))

      this.broadcast({
        type: 'gui_permission_request',
        payload: {
          requestId,
          toolName: tool.name || String(tool),
          input,
          description: `${tool.name || String(tool)}: ${JSON.stringify(input).slice(0, 200)}`,
        },
      } as GuiPermissionRequest)

      return deferred.promise
    }
  }

  private handleSDKMessage(msg: SDKMessage, state: { assistantMessageId: string; currentContent: string; currentThinking: string }) {
    switch (msg.type) {
      case 'assistant': {
        const content = (msg as any).message?.content
        let text = ''
        let thinking = ''
        if (Array.isArray(content)) {
          for (const block of content) {
            if (typeof block === 'object' && block) {
              if (block.type === 'text') text += block.text || ''
              if (block.type === 'thinking') thinking += block.thinking || ''
              if (block.type === 'tool_use') {
                const toolName = block.name || 'unknown'
                const toolInput = block.input || {}
                this.toolNameMap.set(block.id, toolName)
                this.toolInputMap.set(block.id, toolInput)
                this.broadcast({
                  type: 'gui_tool_call',
                  payload: {
                    toolUseId: block.id,
                    toolName,
                    input: toolInput,
                    status: 'running',
                  },
                } as GuiToolCall)
              }
            }
          }
        }
        state.currentContent = text
        state.currentThinking = thinking
        this.broadcast({
          type: 'gui_message_stream',
          payload: {
            messageId: state.assistantMessageId,
            role: 'assistant',
            content: text,
            thinking: thinking || undefined,
            done: true,
            timestamp: Date.now(),
          },
        } as GuiMessageStream)
        break
      }

      case 'stream_event': {
        const event = (msg as any).event
        if (event) {
          if (event.type === 'content_block_delta') {
            const delta = event.delta
            if (delta?.type === 'text_delta' && delta.text) {
              state.currentContent += delta.text
              this.broadcast({
                type: 'gui_message_stream',
                payload: {
                  messageId: state.assistantMessageId,
                  role: 'assistant',
                  content: state.currentContent,
                  done: false,
                  timestamp: Date.now(),
                },
              } as GuiMessageStream)
            } else if (delta?.type === 'thinking_delta' && delta.thinking) {
              state.currentThinking += delta.thinking
            }
          }
        }
        break
      }

      case 'tool_progress': {
        const data = msg as any
        const toolUseId = data.tool_use_id
        const toolName = this.toolNameMap.get(toolUseId) || data.tool_name || 'unknown'
        const input = this.toolInputMap.get(toolUseId) || {}
        this.broadcast({
          type: 'gui_tool_call',
          payload: {
            toolUseId,
            toolName,
            input,
            status: 'running',
            durationMs: data.elapsed_time_seconds ? data.elapsed_time_seconds * 1000 : undefined,
          },
        } as GuiToolCall)
        break
      }

      case 'result': {
        const result = msg as any
        if (result.total_cost_usd) {
          this.totalCost += result.total_cost_usd
        }
        if (result.permission_denials?.length > 0) {
          for (const denial of result.permission_denials) {
            this.broadcast({
              type: 'gui_error',
              payload: { message: `Permission denied: ${denial.tool_name}` },
            } as GuiError)
          }
        }
        break
      }

      case 'user': {
        const content = (msg as any).message?.content
        if (Array.isArray(content)) {
          for (const block of content) {
            if (typeof block === 'object' && block && block.type === 'tool_result') {
              const toolResult = block.content
              let output = ''
              if (typeof toolResult === 'string') {
                output = toolResult
              } else if (Array.isArray(toolResult)) {
                output = toolResult.map((c: any) => c.text || '').join('')
              }
              const toolUseId = block.tool_use_id
              const toolName = this.toolNameMap.get(toolUseId) || 'unknown'
              const toolInput = this.toolInputMap.get(toolUseId) || { tool_use_id: toolUseId }

              this.broadcast({
                type: 'gui_tool_call',
                payload: {
                  toolUseId,
                  toolName,
                  input: toolInput,
                  status: block.is_error ? 'error' : 'success',
                  output: output.slice(0, 5000),
                },
              } as GuiToolCall)

              this.tryEmitDiffPreview(toolUseId, toolName, toolInput)

              this.toolNameMap.delete(toolUseId)
              this.toolInputMap.delete(toolUseId)
            }
          }
        }
        break
      }

      case 'system': {
        const subtype = (msg as any).subtype
        if (subtype === 'api_error') {
          this.broadcast({
            type: 'gui_error',
            payload: { message: (msg as any).error || 'API error' },
          } as GuiError)
        }
        break
      }
    }
  }

  private tryEmitDiffPreview(toolUseId: string, toolName: string, input: Record<string, unknown>) {
    try {
      const filePath = input.file_path as string
      if (!filePath) return

      const oldString = input.old_string as string | undefined
      const newString = input.new_string as string | undefined
      const content = input.content as string | undefined

      if (oldString !== undefined && newString !== undefined) {
        const diff = this.buildSimpleDiff(filePath, oldString, newString)
        this.broadcast({
          type: 'gui_diff_preview',
          payload: {
            filePath,
            oldContent: oldString,
            newContent: newString,
            diff,
          },
        } as GuiDiffPreview)
      } else if (content !== undefined) {
        this.broadcast({
          type: 'gui_diff_preview',
          payload: {
            filePath,
            oldContent: '',
            newContent: content,
            diff: `--- /dev/null\n+++ ${filePath}\n+${content.slice(0, 2000)}`,
          },
        } as GuiDiffPreview)
      }
    } catch (err) {
      logForDebugging(`[GuiBridge] Failed to emit diff preview: ${err}`)
    }
  }

  private buildSimpleDiff(filePath: string, oldStr: string, newStr: string): string {
    const oldLines = oldStr.split('\n')
    const newLines = newStr.split('\n')
    const lines: string[] = []
    for (const line of oldLines) {
      lines.push(`-${line}`)
    }
    for (const line of newLines) {
      lines.push(`+${line}`)
    }
    return `--- a/${filePath}\n+++ b/${filePath}\n@@ -1,${oldLines.length} +1,${newLines.length} @@\n${lines.join('\n')}`
  }

  private syncState() {
    const messages = this.engine?.getMessages() ?? []
    this.broadcast({
      type: 'gui_state_sync',
      payload: {
        messages: messages.map((m: any, i: number) => {
          let content = ''
          if (typeof m.content === 'string') {
            content = m.content
          } else if (Array.isArray(m.content)) {
            content = m.content
              .filter((block: any) => block && (block.type === 'text' || block.type === 'thinking'))
              .map((block: any) => block.text || block.thinking || '')
              .join('\n')
          } else if (m.content != null) {
            content = JSON.stringify(m.content)
          }
          return {
            id: m.id || `msg-${i}`,
            role: m.role,
            content,
            timestamp: m.timestamp || Date.now(),
          }
        }),
        sessionId: this.engine?.getSessionId() || String(getSessionId()),
        sessionName: 'GUI Session',
        model: this.context.options.mainLoopModel,
        cost: this.totalCost,
        permissionMode: this.context.getAppState().toolPermissionContext?.mode || 'default',
      },
    } as GuiStateSync)
  }

  private broadcast(msg: unknown) {
    this.guiServer.broadcast(msg)
  }
}
