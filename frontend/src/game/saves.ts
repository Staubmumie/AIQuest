/**
 * Save games, persisted in localStorage. The backend is stateless, so the
 * browser owns the game state and sends it along with every turn.
 */
import type { GameState, SavedGame } from '../types/game'

const STORAGE_KEY = 'aiquest.saves.v1'

function isSavedGame(value: unknown): value is SavedGame {
  const save = value as SavedGame | null
  const state = save?.state as GameState | undefined
  return (
    typeof save?.game_id === 'string' &&
    typeof save.updated_at === 'string' &&
    typeof save.turn === 'number' &&
    typeof state?.scene === 'string' &&
    typeof state.story_history === 'string' &&
    Array.isArray(state.characters) &&
    typeof state.player?.hp === 'number' &&
    typeof state.player.gold === 'number' &&
    Array.isArray(state.player.inventory)
  )
}

function readAll(): Record<string, SavedGame> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    if (!parsed || typeof parsed !== 'object') return {}
    return Object.fromEntries(Object.entries(parsed).filter(([, save]) => isSavedGame(save)))
  } catch {
    return {}
  }
}

/** Saves, newest first. Unreadable entries are skipped. */
export function listSaves(): SavedGame[] {
  return Object.values(readAll()).sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

export function getSave(gameId: string): SavedGame {
  const save = readAll()[gameId]
  if (!save) throw new Error('This save no longer exists.')
  return save
}

/** Removes one save; all other saves stay untouched. Throws if storage is unavailable. */
export function deleteSave(gameId: string): void {
  const { [gameId]: _removed, ...rest } = readAll()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rest))
}

/** Stores the save with a fresh `updated_at`. Throws if storage is unavailable or full. */
export function writeSave(save: SavedGame): SavedGame {
  const next = { ...save, updated_at: new Date().toISOString() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readAll(), [save.game_id]: next }))
  return next
}
