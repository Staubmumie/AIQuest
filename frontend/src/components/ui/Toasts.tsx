import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import type { Toast, ToastKind } from '../../hooks/useToasts'

const STYLES: Record<ToastKind, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: 'border-emerald-500/50 text-emerald-300' },
  error: { icon: TriangleAlert, className: 'border-ember-500/60 text-ember-400' },
  info: { icon: Info, className: 'border-arcane-500/50 text-arcane-400' },
}

interface ToastsProps {
  toasts: Toast[]
  onDismiss: (id: number) => void
}

export function Toasts({ toasts, onDismiss }: ToastsProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {toasts.map((toast) => {
        const { icon: Icon, className } = STYLES[toast.kind]
        return (
          <div
            key={toast.id}
            role={toast.kind === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg border bg-ink-900/95 px-4 py-3 shadow-xl animate-rise ${className}`}
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            <p className="flex-1 text-sm text-parchment">{toast.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="text-ink-400 hover:text-parchment"
              aria-label="Dismiss notification"
            >
              <X className="size-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
