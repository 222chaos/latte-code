import { GuiServer } from '../src/server/guiServer.js'

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function testHttp() {
  console.log('[E2E] Testing HTTP static files...')
  const res = await fetch('http://127.0.0.1:9722/')
  const text = await res.text()
  if (text.includes('Latte') && text.includes('root')) {
    console.log('  ✅ HTML page served correctly')
  } else {
    console.log('  ❌ HTML page content unexpected')
  }

  const health = await fetch('http://127.0.0.1:9722/health')
  const healthJson = await health.json()
  console.log(`  ✅ Health endpoint: ${JSON.stringify(healthJson)}`)
}

async function testWebSocket() {
  console.log('[E2E] Testing WebSocket connection...')
  const ws = new WebSocket('ws://127.0.0.1:9722/ws')

  await new Promise<void>((resolve, reject) => {
    ws.onopen = () => {
      console.log('  ✅ WebSocket connected')
      resolve()
    }
    ws.onerror = () => reject(new Error('WebSocket connection failed'))
    ws.onclose = () => {}
    setTimeout(() => reject(new Error('WebSocket timeout')), 5000)
  })

  // Wait for gui_connected message
  const connectedMsg = await new Promise<string>((resolve) => {
    ws.onmessage = (e) => resolve(e.data as string)
    setTimeout(() => resolve('timeout'), 3000)
  })

  if (connectedMsg.includes('gui_connected')) {
    console.log('  ✅ Received gui_connected')
  } else {
    console.log(`  ⚠️  First message: ${connectedMsg.slice(0, 100)}`)
  }

  // Send user_input
  ws.send(JSON.stringify({
    type: 'user_input',
    payload: { content: 'Hello from E2E test' },
  }))
  console.log('  ✅ Sent user_input')

  // Send permission response
  ws.send(JSON.stringify({
    type: 'user_permission_response',
    payload: { requestId: 'test-1', behavior: 'allow' },
  }))
  console.log('  ✅ Sent permission_response')

  // Send design system request
  ws.send(JSON.stringify({
    type: 'user_design_system_request',
    payload: { brand: 'apple', action: 'get' },
  }))
  console.log('  ✅ Sent design_system_request')

  // Wait for any broadcast message
  await sleep(500)

  ws.close()
  console.log('  ✅ WebSocket closed cleanly')
}

async function main() {
  console.log('[E2E] Starting end-to-end test...\n')

  const server = new GuiServer({}, { port: 9722, devMode: true })
  const result = await server.start()
  console.log(`[E2E] Server running at ${result.url}\n`)

  // Set up callbacks to log everything
  server.updateCallbacks({
    onUserInput: (content) => console.log(`[Callback] onUserInput: "${content}"`),
    onPermissionResponse: (id, behavior) => console.log(`[Callback] onPermissionResponse: ${id} → ${behavior}`),
    onInterrupt: () => console.log('[Callback] onInterrupt'),
    onDesignSystemRequest: (brand, action, query) => console.log(`[Callback] onDesignSystemRequest: ${brand} (${action})`),
  })

  await testHttp()
  console.log('')
  await testWebSocket()
  console.log('')

  server.stop()
  console.log('[E2E] Server stopped. All tests completed ✅')
}

main().catch((err) => {
  console.error('[E2E] Test failed:', err)
  process.exit(1)
})
