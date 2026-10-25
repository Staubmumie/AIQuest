export type LogLevel = 'info' | 'warn' | 'error'

export interface DebugLogEntry {
  id: number
  timestamp: string
  level: LogLevel
  message: string
}

/**
 * Turn trace from `backend/devtools.py` (`run_traced`). Mirrors the JSON one-to-one.
 */

/** A GameState field that a node changed, e.g. `player.hp: 60 → 85`. */
export interface FieldChange {
  path: string
  before: unknown
  after: unknown
}

/** One LLM call as reported by OpenRouter. `cost` is in USD, null if not reported. */
export interface LlmCall {
  node: string | null
  model: string | null
  input_tokens: number
  output_tokens: number
  total_tokens: number
  cost: number | null
}

/** One executed LangGraph node. Long strings in `input`/`output`/`diff` are shortened. */
export interface NodeRun {
  node: string
  ms: number
  input: Record<string, unknown>
  output: Record<string, unknown>
  diff: FieldChange[]
  llm: LlmCall[]
}

export interface TurnTrace {
  turn_ms: number
  nodes: NodeRun[]
  usage: {
    llm_calls: number
    input_tokens: number
    output_tokens: number
    total_tokens: number
    cost: number | null
  }
  /** Link to the trace in Langfuse, null when Langfuse is not configured. */
  langfuse_url: string | null
}

/** A traced turn of the current session (kept in memory only, not in saves). */
export interface TurnRecord {
  turn: number
  userInput: string
  trace: TurnTrace
}
