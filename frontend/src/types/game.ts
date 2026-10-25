/**
 * Game types. These mirror `GameState` in `backend/gamestate.py` one-to-one (snake_case),
 * so API payloads can be used directly without mapping.
 */

/** Upper bound of `player.hp` (STATE_RULES in backend/gamestate.py). */
export const MAX_HP = 100

export interface Player {
  hp: number
  gold: number
  inventory: string[]
}

export interface StateChange {
  operation: 'increment' | 'decrement' | 'set' | 'add' | 'remove'
  path: string
  value: number | string
}

/** What the action interpreter made of the player's input. */
export interface Action {
  action_type: string
  description: string
  changes: StateChange[]
}

/** One click-through piece of the narration. `speaker` is `narrator` or a character id. */
export interface StorySegment {
  speaker: string
  text: string
}

/** Result of the `input_guardrails` node (backend/guardrails.py). */
export interface GuardrailResult {
  status: 'allowed' | 'flagged' | 'rejected'
  semantic_enabled: boolean
  checks: {
    check: 'validation' | 'injection' | 'semantic'
    result: 'pass' | 'flag' | 'fail' | 'error' | 'skipped'
    detail: string
  }[]
}

export interface GameState {
  // Persistent across the whole game
  game_id: string
  player: Player
  /** Scene id, e.g. `tavern` → `/assets/scenes/tavern.png`. */
  scene: string
  /** Character class ids, e.g. `travelling_merchant` → `/assets/characters/travelling_merchant.png`. */
  characters: string[]
  story_history: string

  // Per round (missing before the first turn)
  user_input?: string
  action?: Action | null
  approved_changes?: StateChange[]
  result?: string
  narration?: string
  segments?: StorySegment[]
  memory_saved?: boolean
  /** What `save_long_term_memory` stored in LanceDB and whether it worked. */
  memory_entry?: { text: string; saved: boolean; error: string | null }
  /** Long-term memories `progress_story` looked up; only `used` ones (distance ≤ max_distance) went into the prompt. */
  recalled_memories?: {
    max_distance: number
    candidates: { text: string; distance: number; used: boolean }[]
    error: string | null
  }
  guardrail?: GuardrailResult
  next_step?: string
}

/** One adventure in the browser's save storage. */
export interface SavedGame {
  game_id: string
  created_at: string
  updated_at: string
  turn: number
  state: GameState
}
