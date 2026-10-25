import { ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '../ui/Button'

interface DialogueBoxProps {
  speaker: string
  text: string
  lastAction: string | null
  isResolving: boolean
  /** Progress text while resolving, e.g. "Generating the story…". */
  phase?: string | null
  /** Shown as a Continue button while more segments follow. */
  onContinue?: () => void
}

export function DialogueBox({ speaker, text, lastAction, isResolving, phase, onContinue }: DialogueBoxProps) {
  return (
    <div className="rpg-frame relative px-5 pb-4 pt-6" aria-live="polite">
      <div className="absolute -top-3.5 left-5 rounded-md border border-arcane-500/60 bg-ink-800 px-3 py-0.5 font-display text-sm font-bold tracking-wide text-arcane-400">
        {isResolving ? 'Game Master' : speaker}
      </div>

      {lastAction && (
        <p className="mb-2 truncate text-xs text-ink-400">
          <span className="font-semibold text-gold-600">You:</span> “{lastAction}”
        </p>
      )}

      {isResolving ? (
        <p className="flex items-center gap-2 text-ink-400">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {phase ?? 'The tale unfolds…'}
        </p>
      ) : (
        <>
          <p className="max-h-60 overflow-y-auto whitespace-pre-line text-base leading-relaxed text-parchment sm:text-lg">
            {text}
          </p>
          {onContinue && (
            <div className="mt-3 flex justify-end">
              <Button variant="primary" icon={ChevronRight} onClick={onContinue} autoFocus>
                Continue
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
