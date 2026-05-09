import { useMemo } from 'react'
import BashOutputCard from '../shell/BashOutputCard.tsx'

interface Props {
  toolResult: {
    toolUseId: string
    content: string
    isError?: boolean
  }
}

export default function ToolResultBlock({ toolResult }: Props) {
  const parsed = useMemo(() => {
    if (!toolResult.content) {
      return { command: '', output: '', exitCode: toolResult.isError ? 1 : 0 }
    }
    try {
      const data = JSON.parse(toolResult.content)
      if (data.command || data.stdout !== undefined) {
        return {
          command: data.command || '',
          output: data.stdout || data.output || toolResult.content,
          exitCode: data.exit_code,
        }
      }
    } catch {
      // not JSON: fall through to generic display
    }
    return {
      command: '',
      output: toolResult.content,
      exitCode: toolResult.isError ? 1 : 0,
    }
  }, [toolResult])

  return (
    <div className="mt-3 md:mt-4">
      <BashOutputCard
        command={parsed.command}
        output={parsed.output}
        exitCode={parsed.exitCode}
      />
    </div>
  )
}
