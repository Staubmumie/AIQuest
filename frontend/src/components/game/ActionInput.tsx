import { Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '../ui/Button'

/** Must match MAX_INPUT_LENGTH in backend/guardrails.py. */
const MAX_ACTION_LENGTH = 4000

interface ActionInputProps {
  /** Resolves to `true` when the action was accepted; the input is kept otherwise. */
  onSubmit: (action: string) => Promise<boolean>
  disabled: boolean
}

export function ActionInput({ onSubmit, disabled }: ActionInputProps) {
  const [action, setAction] = useState('')

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (disabled || !action.trim()) return
    if (await onSubmit(action)) setAction('')
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex gap-2">
      <input
        value={action}
        onChange={(e) => setAction(e.target.value)}
        maxLength={MAX_ACTION_LENGTH}
        disabled={disabled}
        placeholder="What do you do? e.g. “I ask the merchant about their wares”"
        aria-label="Describe your action"
        className="min-w-0 flex-1 rounded-lg border border-ink-600 bg-ink-900/90 px-4 py-2.5 text-sm text-parchment placeholder:text-ink-400 focus:border-gold-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      />
      <Button type="submit" variant="primary" icon={Send} disabled={disabled || !action.trim()}>
        <span className="hidden sm:inline">Send</span>
      </Button>
    </form>
  )
}
