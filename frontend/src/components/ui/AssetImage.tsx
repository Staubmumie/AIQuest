import { useState } from 'react'

interface AssetImageProps {
  src: string
  fallbackSrc: string
  alt: string
  className?: string
}

/** Image that falls back to a placeholder when the asset is missing or fails to load. */
export function AssetImage({ src, fallbackSrc, alt, className }: AssetImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const effectiveSrc = failedSrc === src ? fallbackSrc : src

  return (
    <img
      src={effectiveSrc}
      alt={alt}
      className={className}
      draggable={false}
      onError={() => setFailedSrc(src)}
    />
  )
}

export const PLACEHOLDERS = {
  background: '/assets/placeholders/background.svg',
  portrait: '/assets/placeholders/portrait.svg',
}
