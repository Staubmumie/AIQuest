import { BookOpen, Clock, Coins, Heart, Loader2, MapPin, ScrollText, Trash2, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { gamesApi, getErrorMessage } from '../../api/gamesApi'
import { humanizeId } from '../../game/assets'
import { deleteSave, listSaves } from '../../game/saves'
import { MAX_HP } from '../../types/game'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

interface LoadGameDialogProps {
  onLoad: (gameId: string) => Promise<void>
  onClose: () => void
}

export function LoadGameDialog({ onLoad, onClose }: LoadGameDialogProps) {
  const [saves, setSaves] = useState(listSaves)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  /** Deletes the server-side memories first, then the browser save, so nothing is left orphaned on failure. */
  const handleDelete = async (gameId: string) => {
    setDeletingId(gameId)
    setLoadError(null)
    try {
      await gamesApi.deleteGame(gameId)
      deleteSave(gameId)
      setSaves(listSaves())
    } catch (error) {
      setLoadError(`Could not delete this adventure. ${getErrorMessage(error)}`)
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  const handleLoad = async (gameId: string) => {
    setLoadingId(gameId)
    setLoadError(null)
    try {
      await onLoad(gameId)
    } catch (error) {
      setLoadError(getErrorMessage(error))
      setLoadingId(null)
    }
  }

  return (
    <Modal title="Load Game" icon={ScrollText} onClose={onClose} size="lg">
      {loadError && (
        <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-ember-500/50 bg-ember-500/10 px-3 py-2 text-sm text-ember-400">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {loadError}
        </div>
      )}

      {saves.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <BookOpen className="size-10 text-ink-600" aria-hidden />
          <p className="font-display text-lg text-parchment">No saved adventures yet</p>
          <p className="text-sm text-ink-400">
            Start a New Adventure from the main menu. It is saved automatically in this browser.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {saves.map(({ game_id, turn, updated_at, state }) => (
            <li key={game_id} className="flex items-stretch gap-2">
              <button
                type="button"
                disabled={loadingId !== null || deletingId !== null}
                onClick={() => void handleLoad(game_id)}
                className="group flex min-w-0 flex-1 items-center gap-4 rounded-lg border border-ink-600 bg-ink-800/70 px-4 py-3 text-left transition-all hover:border-gold-500 hover:bg-ink-700 disabled:cursor-not-allowed disabled:hover:border-ink-600 disabled:hover:bg-ink-800/70"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-display font-bold text-parchment group-hover:text-gold-300">
                      {turn === 0 ? 'Prologue' : `Turn ${turn}`}
                    </span>
                    {state.player.hp <= 0 && <Badge>Fallen</Badge>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-400">
                    <span className="flex items-center gap-1"><MapPin className="size-3" aria-hidden />{humanizeId(state.scene)}</span>
                    <span className="flex items-center gap-1"><Heart className="size-3" aria-hidden />{state.player.hp}/{MAX_HP}</span>
                    <span className="flex items-center gap-1"><Coins className="size-3" aria-hidden />{state.player.gold}</span>
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-xs text-ink-400">
                    <Clock className="size-3" aria-hidden />
                    Last played {dateFormat.format(new Date(updated_at))}
                  </p>
                </div>
                {loadingId === game_id && <Loader2 className="size-5 shrink-0 animate-spin text-gold-400" aria-label="Loading" />}
              </button>
              {confirmDeleteId === game_id ? (
                <div className="flex flex-col justify-center gap-1.5">
                  <Button
                    variant="primary"
                    icon={Trash2}
                    loading={deletingId === game_id}
                    onClick={() => void handleDelete(game_id)}
                    className="px-3 py-1.5"
                  >
                    Delete
                  </Button>
                  <Button variant="ghost" disabled={deletingId !== null} onClick={() => setConfirmDeleteId(null)} className="px-3 py-1.5">
                    Cancel
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={loadingId !== null || deletingId !== null}
                  onClick={() => setConfirmDeleteId(game_id)}
                  className="rounded-lg border border-ink-600 bg-ink-800/70 px-3 text-ink-400 transition-colors hover:border-ember-500 hover:text-ember-400 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Delete this adventure"
                  title="Delete this adventure"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
