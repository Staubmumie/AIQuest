import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_SETTINGS, loadSettings, normalizeSettings, storeSettings, type Settings } from '../settings/settings'

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(loadSettings)

  useEffect(() => storeSettings(settings), [settings])

  const updateSettings = useCallback((next: Settings) => setSettings(normalizeSettings(next)), [])
  const resetSettings = useCallback(() => setSettings(DEFAULT_SETTINGS), [])

  return { settings, updateSettings, resetSettings }
}
