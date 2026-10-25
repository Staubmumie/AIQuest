/**
 * Player settings, persisted in localStorage (separate from game saves).
 * Model and temperature are fixed in backend/gamestate.py, the language in backend/prompts/.
 */

export interface Settings {
  developerView: boolean
  /** Extra LLM call per turn that checks whether the input fits the RPG (backend/guardrails.py). */
  semanticGuardrail: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  developerView: false,
  semanticGuardrail: false,
}

/** Coerces arbitrary (possibly stale or hand-edited) data into valid settings. */
export function normalizeSettings(raw: unknown): Settings {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Partial<Settings>
  return {
    developerView: typeof input.developerView === 'boolean' ? input.developerView : DEFAULT_SETTINGS.developerView,
    semanticGuardrail:
      typeof input.semanticGuardrail === 'boolean' ? input.semanticGuardrail : DEFAULT_SETTINGS.semanticGuardrail,
  }
}

const STORAGE_KEY = 'aiquest.settings.v1'

export function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? normalizeSettings(JSON.parse(stored)) : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function storeSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage unavailable (private mode, quota); settings stay in memory for this session.
  }
}
