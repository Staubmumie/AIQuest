import { Backpack, ChevronDown, PackageOpen } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

/** Groups duplicate item names: ["Bread", "Bread"] → [["Bread", 2]]. */
function groupItems(items: string[]): [string, number][] {
  const counts = new Map<string, number>()
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1)
  return [...counts]
}

export function Inventory({ items }: { items: string[] }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const grouped = useMemo(() => groupItems(items), [items])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-lg border border-ink-600 bg-ink-800 px-3 py-1.5 text-sm text-parchment transition-colors hover:border-gold-600"
      >
        <Backpack className="size-4 text-gold-400" aria-hidden />
        <span className="hidden sm:inline">Inventory</span>
        <span className="rounded bg-ink-900 px-1.5 text-xs text-gold-300">{items.length}</span>
        <ChevronDown className={`size-3.5 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open && (
        <div className="rpg-frame absolute right-0 top-full z-30 mt-2 w-72 p-3 animate-fade-in">
          <h3 className="mb-2 font-display text-sm font-bold uppercase tracking-widest text-gold-400">Inventory</h3>
          {items.length === 0 ? (
            <p className="flex items-center gap-2 py-4 text-sm text-ink-400">
              <PackageOpen className="size-4" aria-hidden /> Your pack is empty.
            </p>
          ) : (
            <ul className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
              {grouped.map(([name, quantity]) => (
                <li key={name} className="flex items-center justify-between gap-2 rounded-md border border-ink-700 bg-ink-900/70 px-3 py-2">
                  <span className="text-sm font-semibold text-parchment">{name}</span>
                  {quantity > 1 && <span className="text-xs text-gold-300">×{quantity}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
