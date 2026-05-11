import { Box, Text } from 'ink'
import { useState, useEffect } from 'react'
import type { LocalJSXCommandCall } from '../../types/command.js'
import { GuiServer } from '../../server/guiServer.js'
import { GuiBridge } from '../../bridge/guiBridge.js'
import { logForDebugging } from '../../utils/debug.js'
import { execSync } from 'child_process'
import { platform } from 'os'

let guiServerInstance: GuiServer | null = null
let guiBridgeInstance: GuiBridge | null = null

export function getGuiServer(): GuiServer | null {
  return guiServerInstance
}

export function getGuiBridge(): GuiBridge | null {
  return guiBridgeInstance
}

function openBrowser(url: string) {
  try {
    const os = platform()
    if (os === 'darwin') {
      execSync(`open "${url}"`)
    } else if (os === 'win32') {
      execSync(`start "" "${url}"`, { shell: 'cmd.exe' })
    } else {
      execSync(`xdg-open "${url}"`)
    }
    logForDebugging(`[GUI] Opened browser: ${url}`)
  } catch (err) {
    logForDebugging(`[GUI] Failed to open browser: ${err}`)
  }
}

type GuiCommandProps = {
  onDone: (result?: string) => void
  args: string
  context: Parameters<LocalJSXCommandCall>[1]
}

function GuiCommand({ onDone, args, context }: GuiCommandProps) {
  const [status, setStatus] = useState<'starting' | 'running' | 'stopped' | 'error'>('starting')
  const [url, setUrl] = useState('')
  const [port, setPort] = useState(0)

  const trimmedArgs = args.trim().toLowerCase()

  useEffect(() => {
    if (trimmedArgs === 'off' || trimmedArgs === 'stop') {
      if (guiServerInstance) {
        guiServerInstance.stop()
        guiServerInstance = null
        guiBridgeInstance = null
        setStatus('stopped')
        onDone('GUI server stopped.')
      } else {
        onDone('No GUI server is running.')
      }
      return
    }

    if (guiServerInstance) {
      const existingUrl = guiServerInstance.getUrl()
      openBrowser(existingUrl!)
      onDone(`GUI server is already running at ${existingUrl}`)
      return
    }

    const requestedPort = parseInt(trimmedArgs, 10) || 9720

    const server = new GuiServer({}, { port: requestedPort })
    server
      .start()
      .then((result) => {
        guiServerInstance = server
        setUrl(result.url)
        setPort(result.port)
        setStatus('running')
        logForDebugging(`[GUI] Server started at ${result.url}`)

        // Initialize bridge
        try {
          guiBridgeInstance = new GuiBridge(server, context)
          server.updateCallbacks({
            onUserInput: (content, attachments) => guiBridgeInstance?.handleUserInput(content, attachments),
            onPermissionResponse: (requestId, behavior) => guiBridgeInstance?.handlePermissionResponse(requestId, behavior),
            onInterrupt: () => guiBridgeInstance?.handleInterrupt(),
            onDesignSystemRequest: (brand, action, query) => guiBridgeInstance?.handleDesignSystemRequest(brand, action, query),
            onClientConnect: () => guiBridgeInstance?.handleClientConnect(),
            onClientDisconnect: () => guiBridgeInstance?.handleClientDisconnect(),
            onSessionSwitch: (sessionId) => guiBridgeInstance?.handleSessionSwitch(sessionId),
            onSessionDelete: (sessionId) => guiBridgeInstance?.handleSessionDelete(sessionId),
            onSessionRename: (sessionId, name) => guiBridgeInstance?.handleSessionRename(sessionId, name),
          })
          // Race-condition safety: if a client already connected before
          // callbacks were registered, manually trigger the sync now.
          if (server.getClientCount() > 0) {
            guiBridgeInstance?.handleClientConnect()
          }
          logForDebugging('[GUI] Bridge initialized')
        } catch (err) {
          logForDebugging(`[GUI] Bridge init error: ${err}`)
        }

        openBrowser(result.url)
      })
      .catch((err) => {
        setStatus('error')
        logForDebugging(`[GUI] Failed to start: ${err}`)
        onDone(`Failed to start GUI server: ${err instanceof Error ? err.message : String(err)}`)
      })
  }, [trimmedArgs, onDone, context])

  if (status === 'stopped' || status === 'error') return null

  if (status === 'starting') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="yellow">Starting GUI server...</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="green">
        ✓ Latte GUI is running
      </Text>
      <Box marginTop={1}>
        <Text>
          <Text bold>URL:</Text>{' '}
          <Text color="cyan" underline>
            {url}
          </Text>
        </Text>
      </Box>
      <Box>
        <Text>
          <Text bold>Port:</Text> {port}
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>
          Opening browser automatically...
        </Text>
      </Box>
      <Box>
        <Text dimColor>
          Use <Text color="cyan">/gui off</Text> to stop the server.
        </Text>
      </Box>
    </Box>
  )
}

export const call: LocalJSXCommandCall = async (onDone, context, args) => {
  return <GuiCommand onDone={onDone} args={args} context={context} />
}
