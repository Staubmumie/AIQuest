import { API_BASE_URL } from '../config'
import type { TurnTrace } from '../types/devtools'
import type { GameState } from '../types/game'

function describeErrorBody(body: unknown, status: number): string {
  const detail = (body as { detail?: unknown } | null)?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    // FastAPI validation errors: [{ loc, msg, ... }]
    const messages = detail.map((d) => (d as { msg?: string }).msg).filter(Boolean)
    if (messages.length > 0) return `Invalid data: ${messages.join('; ')}`
  }
  return `Request failed with status ${status}.`
}

/** Sends the request and throws an Error with a readable message for network failures and error statuses. */
async function send(path: string, init: RequestInit = {}): Promise<Response> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers },
    })
  } catch {
    throw new Error('Cannot reach the game server. Is the backend running?')
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null)
    throw new Error(describeErrorBody(body, response.status))
  }
  return response
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return (await (await send(path, init)).json()) as T
}

type TurnEvent =
  | { node: string }
  | { result: { state: GameState; trace: TurnTrace } }
  | { error: string }

export const gamesApi = {
  create: () => request<GameState>('/api/games', { method: 'POST' }),

  /** Removes the server-side data of a game (its long-term memories). */
  deleteGame: async (gameId: string) => {
    await send(`/api/games/${encodeURIComponent(gameId)}`, { method: 'DELETE' })
  },

  /**
   * Runs one round of the LangGraph Game Master and returns the new state plus its debug trace.
   * The backend streams one JSON line per event; `onNode` is called whenever a graph node starts.
   */
  playTurn: async (state: GameState, userInput: string, semanticGuardrail: boolean, onNode: (node: string) => void) => {
    const response = await send('/api/turn', {
      method: 'POST',
      body: JSON.stringify({ state, user_input: userInput, semantic_guardrail: semanticGuardrail }),
    })
    const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader()
    let buffer = ''
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += value
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? '' // last piece may be an incomplete line
      for (const line of lines.filter(Boolean)) {
        const event = JSON.parse(line) as TurnEvent
        if ('node' in event) onNode(event.node)
        else if ('error' in event) throw new Error(event.error)
        else return event.result
      }
    }
    throw new Error('The Game Master stopped responding.')
  },
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Something went wrong.'
}
