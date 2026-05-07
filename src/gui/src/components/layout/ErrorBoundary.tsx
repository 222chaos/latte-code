import { Component, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[GUI ErrorBoundary]', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex h-full w-full items-center justify-center"
          style={{ background: 'var(--content-bg)' }}
        >
          <div className="text-center space-y-5 max-w-sm px-6 animate-fade-in-scale">
            {/* Icon */}
            <div
              className="h-14 w-14 rounded-[16px] flex items-center justify-center mx-auto"
              style={{
                background: 'rgba(255, 69, 58, 0.12)',
                border: '1px solid rgba(255, 69, 58, 0.2)',
              }}
            >
              <AlertTriangle size={26} strokeWidth={1.5} style={{ color: 'var(--apple-red)' }} />
            </div>

            {/* Text */}
            <div className="space-y-1.5">
              <p className="text-[17px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                Something went wrong
              </p>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
            </div>

            {/* Action */}
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[12px] text-[13px] font-semibold transition-all"
              style={{ background: 'var(--accent)', color: '#fff' }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              <RotateCcw size={14} strokeWidth={2} />
              Reload GUI
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
