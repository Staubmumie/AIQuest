import { MapPin, Skull } from 'lucide-react'
import { useState } from 'react'
import { humanizeId, sceneBackgroundUrl } from '../../game/assets'
import type { GameState, StorySegment } from '../../types/game'
import { AssetImage, PLACEHOLDERS } from '../ui/AssetImage'
import { ActionInput } from './ActionInput'
import { CharacterPortrait } from './CharacterPortrait'
import { DialogueBox } from './DialogueBox'

interface GameSceneProps {
  state: GameState
  isResolving: boolean
  /** Player-facing progress text while a turn is processed. */
  phase: string | null
  onAction: (action: string) => Promise<boolean>
}

/** Renders the scene, characters and narration the Game Master returned. */
export function GameScene({ state, isResolving, phase, onAction }: GameSceneProps) {
  const location = humanizeId(state.scene)
  const isDead = state.player.hp <= 0

  // Before the first turn (or in older saves) there are no segments; show the whole text as narration.
  const segments: StorySegment[] = state.segments?.length
    ? state.segments
    : [{ speaker: 'narrator', text: state.narration || state.story_history }]
  // Restart at the first segment whenever a new state arrives.
  const [progress, setProgress] = useState({ state, index: 0 })
  const index = progress.state === state ? progress.index : 0
  const segment = segments[index]
  const hasMore = index < segments.length - 1

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <section className="relative min-h-56 flex-1 overflow-hidden rounded-xl border-2 border-ink-600 bg-ink-900">
        <AssetImage
          src={sceneBackgroundUrl(state.scene)}
          fallbackSrc={PLACEHOLDERS.background}
          alt={location}
          className="absolute inset-0 size-full object-cover"
        />
        <div aria-hidden className="absolute inset-0 bg-linear-to-t from-ink-950/80 via-transparent to-ink-950/40" />

        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-md border border-gold-600/50 bg-ink-950/75 px-2.5 py-1 text-xs font-semibold text-gold-300">
          <MapPin className="size-3.5" aria-hidden />
          {location}
        </div>

        {state.characters.length > 0 && (
          <div className="absolute inset-x-0 bottom-4 flex items-end justify-center gap-4 px-4 sm:gap-8">
            {state.characters.map((character) => (
              <CharacterPortrait
                key={character}
                characterId={character}
                speaking={!isResolving && segment.speaker === character}
              />
            ))}
          </div>
        )}
      </section>

      <DialogueBox
        speaker={segment.speaker === 'narrator' ? 'Game Master' : humanizeId(segment.speaker)}
        text={segment.text}
        lastAction={state.user_input ?? null}
        isResolving={isResolving}
        phase={phase}
        onContinue={hasMore ? () => setProgress({ state, index: index + 1 }) : undefined}
      />

      {isDead ? (
        <p className="rpg-frame flex items-center justify-center gap-2 px-4 py-3 font-display font-bold text-ember-400">
          <Skull className="size-5" aria-hidden />
          Your hero has fallen. Game over.
        </p>
      ) : (
        <ActionInput onSubmit={onAction} disabled={isResolving || hasMore} />
      )}
    </div>
  )
}
