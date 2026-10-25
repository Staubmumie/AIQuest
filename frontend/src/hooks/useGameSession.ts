import { useCallback, useRef, useState } from 'react'
import { gamesApi, getErrorMessage } from '../api/gamesApi'
import { getSave, writeSave } from '../game/saves'
import type { DebugLogEntry, LogLevel, TurnRecord } from '../types/devtools'
import type { SavedGame } from '../types/game'

export type SaveStatus = 'idle' | 'saved' | 'error'

const LOG_LIMIT = 80
const TRACE_LIMIT = 30

/** Player-facing progress text per LangGraph node. Nodes not listed (dungeon_master) keep the previous text. */
const PHASES: Record<string, string> = {
  input_guardrails: 'Checking your action…',
  interpret_action: 'Processing your action…',
  validate_action: 'Updating the game world…',
  update_game_state: 'Updating the game world…',
  progress_story: 'Generating the story…',
  save_long_term_memory: 'Recording your adventure…',
}

/**
 * Owns the active game: creating, loading, advancing and persisting it.
 * Every turn goes through the backend's LangGraph Game Master; saves live in localStorage.
 */
export function useGameSession() {
  const [game, setGame] = useState<SavedGame | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [isResolving, setIsResolving] = useState(false)
  const [phase, setPhase] = useState<string | null>(null)
  const [lastTurnMs, setLastTurnMs] = useState<number | null>(null)
  const [logs, setLogs] = useState<DebugLogEntry[]>([])
  const [traces, setTraces] = useState<TurnRecord[]>([])

  const gameRef = useRef<SavedGame | null>(null)
  const logId = useRef(0)

  const log = useCallback((level: LogLevel, message: string) => {
    const entry = { id: ++logId.current, timestamp: new Date().toISOString(), level, message }
    setLogs((prev) => [...prev, entry].slice(-LOG_LIMIT))
  }, [])

  const commit = useCallback((save: SavedGame | null) => {
    gameRef.current = save
    setGame(save)
  }, [])

  /** Writes the save and commits it. Throws if storage fails. */
  const persist = useCallback(
    (save: SavedGame, reason: 'autosave' | 'manual') => {
      try {
        commit(writeSave(save))
        setSaveStatus('saved')
        log('info', `${reason === 'manual' ? 'Manual save' : 'Autosave'} complete (turn ${save.turn})`)
      } catch (error) {
        commit(save)
        setSaveStatus('error')
        log('error', `${reason === 'manual' ? 'Manual save' : 'Autosave'} failed: ${getErrorMessage(error)}`)
        throw error
      }
    },
    [commit, log],
  )

  const autosave = useCallback(
    (save: SavedGame) => {
      try {
        persist(save, 'autosave')
      } catch {
        // Surfaced through saveStatus; manual save remains available.
      }
    },
    [persist],
  )

  const newGame = useCallback(async () => {
    const state = await gamesApi.create()
    const now = new Date().toISOString()
    autosave({ game_id: state.game_id, created_at: now, updated_at: now, turn: 0, state })
    setLastTurnMs(null)
    setTraces([])
    log('info', `Created game ${state.game_id}`)
  }, [autosave, log])

  const loadGame = useCallback(
    async (gameId: string) => {
      commit(getSave(gameId))
      setSaveStatus('saved')
      setLastTurnMs(null)
      setTraces([])
      log('info', `Loaded game ${gameId}`)
    },
    [commit, log],
  )

  /** Runs one round. Throws if the Game Master fails; the game state stays unchanged then. */
  const submitAction = useCallback(
    async (action: string, semanticGuardrail = false) => {
      const current = gameRef.current
      const text = action.trim()
      if (!current || isResolving || !text) return
      setIsResolving(true)
      setPhase(PHASES.input_guardrails)
      log('info', `Player action: "${text}"`)
      const started = performance.now()
      try {
        const { state, trace } = await gamesApi.playTurn(current.state, text, semanticGuardrail, (node) => {
          if (PHASES[node]) setPhase(PHASES[node])
        })
        // Ignore the result if the game was closed or switched while waiting.
        if (gameRef.current?.game_id !== current.game_id) return
        setLastTurnMs(Math.round(performance.now() - started))
        setTraces((prev) => [...prev, { turn: current.turn + 1, userInput: text, trace }].slice(-TRACE_LIMIT))
        if (state.guardrail?.status === 'rejected') log('warn', `Input rejected by guardrails: ${state.narration}`)
        else log('info', `Turn ${current.turn + 1}: ${state.result || 'no result'}`)
        autosave({ ...current, turn: current.turn + 1, state })
      } catch (error) {
        log('error', `Turn failed: ${getErrorMessage(error)}`)
        throw error
      } finally {
        setIsResolving(false)
        setPhase(null)
      }
    },
    [autosave, isResolving, log],
  )

  const saveGame = useCallback(async () => {
    const current = gameRef.current
    if (!current) throw new Error('No active game to save.')
    persist(current, 'manual')
  }, [persist])

  const closeGame = useCallback(() => {
    commit(null)
    setSaveStatus('idle')
  }, [commit])

  return {
    game,
    saveStatus,
    isResolving,
    phase,
    lastTurnMs,
    logs,
    traces,
    newGame,
    loadGame,
    submitAction,
    saveGame,
    closeGame,
  }
}

export type GameSession = ReturnType<typeof useGameSession>
