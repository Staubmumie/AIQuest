import { X, type LucideIcon } from 'lucide-react'
import { useEffect, useId, type ReactNode } from 'react'

interface ModalProps {
  title: string
  icon?: LucideIcon
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }

export function Modal({ title, icon: Icon, onClose, children, footer, size = 'md' }: ModalProps) {
  const titleId = useId()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-ink-950/75 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`rpg-frame relative flex max-h-[90dvh] w-full flex-col animate-rise ${SIZES[size]}`}
      >
        <header className="flex items-center gap-3 border-b border-ink-600 px-5 py-4">
          {Icon && <Icon className="size-5 text-gold-400" aria-hidden />}
          <h2 id={titleId} className="flex-1 font-display text-lg font-bold tracking-wide text-gold-300">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-ink-700 hover:text-parchment"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="border-t border-ink-600 px-5 py-3">{footer}</footer>}
      </div>
    </div>
  )
}
