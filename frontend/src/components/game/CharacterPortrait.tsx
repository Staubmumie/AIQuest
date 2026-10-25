import { characterPortraitUrl, humanizeId } from '../../game/assets'
import { AssetImage, PLACEHOLDERS } from '../ui/AssetImage'

export function CharacterPortrait({ characterId, speaking = false }: { characterId: string; speaking?: boolean }) {
  const name = humanizeId(characterId)

  return (
    <figure className="flex flex-col items-center gap-1.5">
      <div
        className={`relative size-24 overflow-hidden rounded-xl border-2 bg-ink-900 shadow-xl sm:size-32 lg:size-40 ${
          speaking ? 'border-arcane-400 ring-2 ring-arcane-400/50' : 'border-gold-400'
        }`}
      >
        <AssetImage
          src={characterPortraitUrl(characterId)}
          fallbackSrc={PLACEHOLDERS.portrait}
          alt={`Portrait of ${name}`}
          className="size-full object-cover"
        />
      </div>
      <figcaption className="max-w-32 truncate rounded bg-ink-950/70 px-2 py-0.5 text-xs text-parchment/90">
        {name}
      </figcaption>
    </figure>
  )
}
