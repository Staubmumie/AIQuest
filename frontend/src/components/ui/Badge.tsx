import type { ReactNode } from 'react'

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-ember-500/50 bg-ember-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ember-400">
      {children}
    </span>
  )
}
