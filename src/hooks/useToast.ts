'use client'

import { useState, useCallback } from 'react'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration: number
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 3000
    }

    setToasts(prev => [...prev, newToast])

    // Auto remove toast after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, newToast.duration)
    }

    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const clearToasts = useCallback(() => {
    setToasts([])
  }, [])

  const success = useCallback((message: string, duration?: number) => {
    return addToast({ message, type: 'success', duration: duration ?? 3000 })
  }, [addToast])

  const error = useCallback((message: string, duration?: number) => {
    return addToast({ message, type: 'error', duration: duration ?? 3000 })
  }, [addToast])

  const info = useCallback((message: string, duration?: number) => {
    return addToast({ message, type: 'info', duration: duration ?? 3000 })
  }, [addToast])

  const warning = useCallback((message: string, duration?: number) => {
    return addToast({ message, type: 'warning', duration: duration ?? 3000 })
  }, [addToast])

  return {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    success,
    error,
    info,
    warning
  }
}