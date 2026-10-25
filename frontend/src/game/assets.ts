/**
 * Scene and character ids come from SCENES / CHARACTERS in backend/story_progression.py.
 * Each id has a matching image in `public/assets/`.
 */

/** `dark_forest` → `Dark Forest` */
export function humanizeId(id: string): string {
  return id
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export const sceneBackgroundUrl = (scene: string) => `/assets/scenes/${scene}.png`
export const characterPortraitUrl = (character: string) => `/assets/characters/${character}.png`
