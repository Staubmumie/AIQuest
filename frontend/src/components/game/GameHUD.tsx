import { Check, CloudOff, Coins, Heart, MapPin, Menu } from 'lucide-react'
import { humanizeId } from '../../game/assets'
import type { SaveStatus } from '../../hooks/useGameSession'
import { MAX_HP, type SavedGame } from '../../types/game'
import { Inventory } from './Inventory'

const SAVE_STATUS = {
  idle: null,
  saved: { icon: Check, label: 'Saved', className: 'text-emerald-400/80' },
  error: { icon: CloudOff, label: 'Autosave failed', className: 'text-ember-400' },
} satisfies Record<SaveStatus, unknown>

interface GameHUDProps {
  game: SavedGame
  saveStatus: SaveStatus
  onOpenMenu: () => void
}

export function GameHUD({ game, saveStatus, onOpenMenu }: GameHUDProps) {
  const { player, scene } = game.state
  const hpPercent = Math.round((player.hp / MAX_HP) * 100)
  const status = SAVE_STATUS[saveStatus]

  return (
    <header className="rpg-frame flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5">
      <div className="mr-auto min-w-0">
        <p className="truncate font-display text-sm font-bold text-gold-300">AIQuest</p>
        <p className="text-[11px] uppercase tracking-widest text-ink-400">
          {game.turn === 0 ? 'Prologue' : `Turn ${game.turn}`}
        </p>
      </div>

      <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <div className="flex items-center gap-1.5" title={`${player.hp} / ${MAX_HP} HP`}>
          <dt><Heart className="size-4 text-ember-500" aria-label="Health" /></dt>
          <dd className="flex items-center gap-2">
            <span className="h-2 w-16 overflow-hidden rounded-full bg-ink-900 sm:w-20" aria-hidden>
              <span
                className={`block h-full rounded-full ${hpPercent > 30 ? 'bg-emerald-500' : 'bg-ember-500'}`}
                style={{ width: `${hpPercent}%` }}
              />
            </span>
            <span className="font-mono text-xs">{player.hp}/{MAX_HP}</span>
          </dd>
        </div>
        <div className="flex items-center gap-1.5">
          <dt><Coins className="size-4 text-gold-400" aria-label="Gold" /></dt>
          <dd className="font-mono text-xs">{player.gold}</dd>
        </div>
        <div className="hidden items-center gap-1.5 md:flex">
          <dt><MapPin className="size-4 text-arcane-400" aria-label="Location" /></dt>
          <dd className="max-w-48 truncate text-xs">{humanizeId(scene)}</dd>
        </div>
      </dl>

      <div className="flex items-center gap-2">
        {status && (
          <span className={`hidden items-center gap-1 text-xs sm:flex ${status.className}`} role="status">
            <status.icon className="size-3.5" aria-hidden />
            {status.label}
          </span>
        )}
        <Inventory items={player.inventory} />
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex items-center gap-1.5 rounded-lg border border-gold-600 bg-ink-800 px-3 py-1.5 text-sm font-semibold text-gold-300 transition-colors hover:bg-ink-700"
          aria-label="Open game menu"
        >
          <Menu className="size-4" aria-hidden />
          <span className="hidden sm:inline">Menu</span>
        </button>
      </div>
    </header>
  )
}
