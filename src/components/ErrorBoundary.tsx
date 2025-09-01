'use client'

import React from 'react'
import InfoWorksLogo from './InfoWorksLogo'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // In production, you might want to log this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Log to error reporting service (e.g., Sentry, LogRocket)
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />
      }

      return <DefaultErrorFallback error={this.state.error} resetError={this.resetError} />
    }

    return this.props.children
  }
}

function DefaultErrorFallback({ error, resetError }: { error?: Error; resetError: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <InfoWorksLogo width={120} height={36} className="mx-auto mb-6" />
        
        <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Something went wrong
        </h2>
        
        <p className="text-gray-600 mb-6 leading-relaxed">
          We apologize for the inconvenience. An unexpected error has occurred. 
          Our team has been notified and is working on a fix.
        </p>

        {process.env.NODE_ENV === 'development' && error && (
          <div className="mb-6 p-4 bg-gray-100 rounded-lg text-left">
            <p className="text-sm font-mono text-red-600 break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={resetError}
            className="w-full btn-primary px-4 py-3 font-medium"
          >
            Try Again
          </button>
          
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="w-full btn-secondary px-4 py-3 font-medium"
          >
            Return to Dashboard
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          If the problem persists, please contact support.
        </p>
      </div>
    </div>
  )
}

export default ErrorBoundary