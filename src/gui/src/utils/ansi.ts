const ANSI_RE = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g

export function stripAnsi(input: string): string {
  return input.replace(ANSI_RE, '')
}
