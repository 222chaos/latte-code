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
import type { GuiMessageStream, GuiToolCall, GuiPermissionRequest, GuiDiffPreview, GuiDesignSystem, GuiSessionList, GuiStateSync, GuiError } from '../gui/shared/protocol.js'

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

  constructor(guiServer: GuiServer, context: LocalJSXCommandContext) {
    this.guiServer = guiServer
    this.context = context
  }

  async init() {
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
  }

  async handleUserInput(content: string) {
    if (!this.engine) {
      await this.init()
    }
    if (this.isRunning) {
      this.broadcast({ type: 'gui_error', payload: { message: 'A query is already in progress' } })
      return
    }

    this.isRunning = true
    this.broadcast({
      type: 'gui_message_stream',
      payload: {
        messageId: `user-${Date.now()}`,
        role: 'user',
        content,
        done: true,
        timestamp: Date.now(),
      },
    } as GuiMessageStream)

    try {
      const generator = this.engine!.submitMessage(content)
      let assistantMessageId = `assistant-${Date.now()}`
      let currentContent = ''
      let currentThinking = ''

      for await (const msg of generator) {
        this.handleSDKMessage(msg as SDKMessage, assistantMessageId, currentContent, currentThinking)
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
      deferred.resolve({ behavior: 'allow' })
      // TODO: update permission rules to always allow this tool
    } else {
      deferred.resolve({ behavior: 'deny', message: 'Denied by user via GUI' })
    }

    this.pendingPermissions.delete(requestId)
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

      // Need to ask user via GUI
      this.permissionCounter++
      const requestId = `perm-${this.permissionCounter}`
      const deferred = createDeferred<PermissionDecision>()
      this.pendingPermissions.set(requestId, deferred)

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

  private handleSDKMessage(msg: SDKMessage, assistantMessageId: string, currentContent: string, currentThinking: string) {
    switch (msg.type) {
      case 'assistant': {
        const content = msg.message?.content
        let text = ''
        let thinking = ''
        if (Array.isArray(content)) {
          for (const block of content) {
            if (typeof block === 'object' && block) {
              if (block.type === 'text') text += block.text || ''
              if (block.type === 'thinking') thinking += block.thinking || ''
              if (block.type === 'tool_use') {
                this.broadcast({
                  type: 'gui_tool_call',
                  payload: {
                    toolName: block.name || 'unknown',
                    input: block.input || {},
                    status: 'running',
                  },
                } as GuiToolCall)
              }
            }
          }
        }
        this.broadcast({
          type: 'gui_message_stream',
          payload: {
            messageId: assistantMessageId,
            role: 'assistant',
            content: text,
            thinking: thinking || undefined,
            done: true,
            timestamp: Date.now(),
          },
        } as GuiMessageStream)
        break
      }

      case 'assistant_partial': {
        const delta = (msg as any).delta || ''
        if (delta) {
          this.broadcast({
            type: 'gui_message_stream',
            payload: {
              messageId: assistantMessageId,
              role: 'assistant',
              content: delta,
              done: false,
              timestamp: Date.now(),
            },
          } as GuiMessageStream)
        }
        break
      }

      case 'tool_progress': {
        const data = (msg as any).data || {}
        this.broadcast({
          type: 'gui_tool_call',
          payload: {
            toolName: data.tool_name || 'unknown',
            input: {},
            status: 'running',
            output: data.output,
            durationMs: data.elapsed_time_seconds ? data.elapsed_time_seconds * 1000 : undefined,
          },
        } as GuiToolCall)
        break
      }

      case 'result': {
        const result = msg as any
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
        const content = msg.message?.content
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
              this.broadcast({
                type: 'gui_tool_call',
                payload: {
                  toolName: 'result',
                  input: { tool_use_id: block.tool_use_id },
                  status: block.is_error ? 'error' : 'success',
                  output: output.slice(0, 5000),
                },
              } as GuiToolCall)
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

  private syncState() {
    const messages = this.engine?.getMessages() ?? []
    this.broadcast({
      type: 'gui_state_sync',
      payload: {
        messages: messages.map((m: any, i: number) => ({
          id: `msg-${i}`,
          role: m.role,
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
          timestamp: Date.now(),
        })),
        sessionId: this.engine?.getSessionId() || '',
        sessionName: 'GUI Session',
        model: this.context.options.mainLoopModel,
        cost: 0,
        permissionMode: this.context.getAppState().toolPermissionContext?.mode || 'default',
      },
    } as GuiStateSync)
  }

  private broadcast(msg: unknown) {
    this.guiServer.broadcast(msg)
  }
}
