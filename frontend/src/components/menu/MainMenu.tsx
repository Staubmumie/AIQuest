import { ScrollText, Settings, Swords } from 'lucide-react'
import { MenuButton } from '../ui/MenuButton'

const MENU_BACKGROUND = '/assets/scenes/tavern.png'

// Deterministic ember positions so the layout is stable between renders.
const EMBERS = Array.from({ length: 18 }, (_, i) => ({
  left: `${(i * 53) % 100}%`,
  delay: `${(i * 1.7) % 9}s`,
  duration: `${8 + (i % 5) * 1.5}s`,
  size: i % 3 === 0 ? 'size-1.5' : 'size-1',
}))

interface MainMenuProps {
  onNewAdventure: () => void
  onLoadGame: () => void
  onSettings: () => void
  isCreating: boolean
}

export function MainMenu({ onNewAdventure, onLoadGame, onSettings, isCreating }: MainMenuProps) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-6 py-12">
      {/* Backdrop: the opening scene until real key art exists. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-bottom opacity-70"
        style={{ backgroundImage: `url('${MENU_BACKGROUND}')` }}
      />
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,var(--color-ink-950)_85%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {EMBERS.map((ember, i) => (
          <span
            key={i}
            className={`absolute -bottom-2 rounded-full bg-ember-400 shadow-[0_0_8px_var(--color-ember-400)] animate-ember ${ember.size}`}
            style={{ left: ember.left, animationDelay: ember.delay, animationDuration: ember.duration }}
          />
        ))}
      </div>

      <main className="relative z-10 flex w-full max-w-sm flex-col items-center">
        <div className="mb-10 text-center animate-rise">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.4em] text-gold-500">An Endless Tale</p>
          <h1 className="font-display text-5xl font-black tracking-wider text-gold-300 animate-glow sm:text-6xl">
            AIQuest
          </h1>
          <div className="mx-auto mt-4 flex items-center justify-center gap-3 text-gold-600" aria-hidden>
            <span className="h-px w-12 bg-linear-to-r from-transparent to-gold-600" />
            <span className="text-sm">✦</span>
            <span className="h-px w-12 bg-linear-to-l from-transparent to-gold-600" />
          </div>
        </div>

        <nav className="flex w-full flex-col gap-3 animate-rise [animation-delay:150ms]" aria-label="Main menu">
          <MenuButton
            icon={Swords}
            label="New Adventure"
            hint="Begin a fresh tale"
            onClick={onNewAdventure}
            loading={isCreating}
            autoFocus
          />
          <MenuButton icon={ScrollText} label="Load Game" hint="Continue a saved journey" onClick={onLoadGame} />
          <MenuButton icon={Settings} label="Settings" hint="Developer view" onClick={onSettings} />
        </nav>

        <p className="mt-10 text-center text-xs text-ink-400 animate-fade-in [animation-delay:400ms]">
          Prototype v0.1 · The Game Master narrates in English
        </p>
      </main>
    </div>
  )
}
