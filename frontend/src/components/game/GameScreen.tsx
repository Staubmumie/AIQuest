import { Terminal } from 'lucide-react'
import { useState } from 'react'
import type { GameSession } from '../../hooks/useGameSession'
import type { Settings } from '../../settings/settings'
import type { SavedGame } from '../../types/game'
import { DeveloperPanel } from '../dev/DeveloperPanel'
import { GameHUD } from './GameHUD'
import { GameScene } from './GameScene'
import { InGameMenu } from './InGameMenu'

interface GameScreenProps {
  game: SavedGame
  session: GameSession
  settings: Settings
  onAction: (action: string) => Promise<boolean>
  onSave: () => Promise<void>
  onOpenSettings: () => void
  onExitToMenu: () => Promise<void>
}

export function GameScreen({ game, session, settings, onAction, onSave, onOpenSettings, onExitToMenu }: GameScreenProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [devDrawerOpen, setDevDrawerOpen] = useState(false)

  return (
    <div className="flex h-dvh overflow-hidden bg-ink-950">
      <main className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-3 sm:p-4">
        <GameHUD game={game} saveStatus={session.saveStatus} onOpenMenu={() => setMenuOpen(true)} />
        <GameScene state={game.state} isResolving={session.isResolving} phase={session.phase} onAction={onAction} />
      </main>

      {settings.developerView && (
        <>
          {/* Wide screens: docked side panel. */}
          <aside className="hidden w-80 shrink-0 border-l border-ink-600 lg:block xl:w-96">
            <DeveloperPanel game={game} lastTurnMs={session.lastTurnMs} logs={session.logs} traces={session.traces} />
          </aside>

          {/* Small screens: edge tab + slide-over drawer. */}
          <button
            type="button"
            onClick={() => setDevDrawerOpen(true)}
            className="fixed right-0 top-1/2 z-30 flex -translate-y-1/2 items-center gap-1 rounded-l-lg border border-r-0 border-arcane-500/50 bg-ink-800 px-1.5 py-3 text-arcane-400 [writing-mode:vertical-rl] lg:hidden"
            aria-label="Open developer view"
          >
            <Terminal className="size-4 rotate-90" aria-hidden />
            <span className="text-xs font-semibold">Dev</span>
          </button>
          {devDrawerOpen && (
            <div className="fixed inset-0 z-40 lg:hidden">
              <div className="absolute inset-0 bg-ink-950/70" onClick={() => setDevDrawerOpen(false)} aria-hidden />
              <aside className="absolute inset-y-0 right-0 w-[min(22rem,90vw)] border-l border-ink-600 shadow-2xl animate-fade-in">
                <DeveloperPanel
                  game={game}
                  lastTurnMs={session.lastTurnMs}
                  logs={session.logs}
                  traces={session.traces}
                  onClose={() => setDevDrawerOpen(false)}
                />
              </aside>
            </div>
          )}
        </>
      )}

      {menuOpen && (
        <InGameMenu
          onResume={() => setMenuOpen(false)}
          onSave={onSave}
          onSettings={() => {
            setMenuOpen(false)
            onOpenSettings()
          }}
          onMainMenu={onExitToMenu}
        />
      )}
    </div>
  )
}
