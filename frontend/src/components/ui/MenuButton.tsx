import { ChevronRight, Loader2, type LucideIcon } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'

interface MenuButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon
  label: string
  hint?: string
  loading?: boolean
}

/** Classic RPG menu entry with a selection cursor that appears on hover/focus. */
export function MenuButton({ icon: Icon, label, hint, loading = false, disabled, className = '', ...rest }: MenuButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`group relative flex w-full items-center gap-4 rounded-lg border border-ink-600 bg-ink-800/80 px-5 py-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-gold-500 hover:bg-ink-700/90 hover:shadow-[0_0_24px_rgb(201_154_59/0.18)] focus-visible:border-gold-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 ${className}`}
      {...rest}
    >
      <ChevronRight
        aria-hidden
        className="absolute -left-7 size-5 text-gold-400 opacity-0 transition-all duration-200 group-hover:-left-6 group-hover:opacity-100 group-focus-visible:-left-6 group-focus-visible:opacity-100"
      />
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-gold-600/40 bg-ink-900 text-gold-400 transition-colors group-hover:border-gold-500 group-hover:text-gold-300">
        {loading ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Icon className="size-5" aria-hidden />}
      </span>
      <span className="flex flex-col">
        <span className="font-display text-base font-bold tracking-wide text-parchment group-hover:text-gold-300">
          {label}
        </span>
        {hint && <span className="text-xs text-ink-400">{hint}</span>}
      </span>
    </button>
  )
}
