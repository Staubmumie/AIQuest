import { useCallback, useRef, useState } from 'react'

export type ToastKind = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  kind: ToastKind
  message: string
}

const TOAST_DURATION_MS = 3500

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (kind: ToastKind, message: string) => {
      const id = ++nextId.current
      setToasts((prev) => [...prev, { id, kind, message }])
      setTimeout(() => dismissToast(id), TOAST_DURATION_MS)
    },
    [dismissToast],
  )

  return { toasts, showToast, dismissToast }
}
