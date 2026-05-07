import { GuiServer } from '../src/server/guiServer.js'

async function main() {
  console.log('[Test] Starting GuiServer...')
  const server = new GuiServer({}, { port: 9721, devMode: true })
  const result = await server.start()
  console.log(`[Test] Server running at ${result.url}`)

  // Test callbacks
  server.updateCallbacks({
    onUserInput: (content) => console.log(`[Test] Received input: ${content}`),
    onPermissionResponse: (id, behavior) => console.log(`[Test] Permission ${id}: ${behavior}`),
    onInterrupt: () => console.log('[Test] Interrupt received'),
    onDesignSystemRequest: (brand, action) => console.log(`[Test] Design request: ${brand} (${action})`),
  })

  // Broadcast a test message to any connected clients
  setInterval(() => {
    server.broadcast({
      type: 'gui_message_stream',
      payload: {
        messageId: `test-${Date.now()}`,
        role: 'assistant',
        content: 'Test message from server',
        done: true,
        timestamp: Date.now(),
      },
    })
  }, 10000)

  console.log('[Test] Server is running. Press Ctrl+C to stop.')
}

main().catch((err) => {
  console.error('[Test] Failed:', err)
  process.exit(1)
})
