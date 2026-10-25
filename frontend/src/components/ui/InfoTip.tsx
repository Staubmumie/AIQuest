import { HelpCircle } from 'lucide-react'

/** Small "?" icon that reveals an explanation on hover or keyboard focus. */
export function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex align-middle">
      <button type="button" className="text-ink-400 hover:text-gold-400 focus-visible:text-gold-400" aria-label={text}>
        <HelpCircle className="size-3.5" aria-hidden />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-60 -translate-x-1/2 rounded-md border border-ink-600 bg-ink-950 px-3 py-2 text-xs font-normal leading-relaxed text-parchment opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  )
}
