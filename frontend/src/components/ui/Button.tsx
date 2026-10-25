import { Loader2, type LucideIcon } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

const VARIANTS: Record<Variant, string> = {
  primary:
    'border-gold-500 bg-linear-to-b from-gold-400 to-gold-600 text-ink-950 hover:from-gold-300 hover:to-gold-500 shadow-[0_4px_16px_rgb(201_154_59/0.25)]',
  secondary: 'border-ink-600 bg-ink-800 text-parchment hover:border-gold-600 hover:bg-ink-700',
  ghost: 'border-transparent bg-transparent text-ink-400 hover:bg-ink-800 hover:text-parchment',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  icon?: LucideIcon
  loading?: boolean
}

export function Button({
  variant = 'secondary',
  icon: Icon,
  loading = false,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : Icon && <Icon className="size-4" aria-hidden />}
      {children}
    </button>
  )
}
