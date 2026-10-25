import { useCallback, useState } from 'react'
import { getErrorMessage } from './api/gamesApi'
import { GameScreen } from './components/game/GameScreen'
import { LoadGameDialog } from './components/menu/LoadGameDialog'
import { MainMenu } from './components/menu/MainMenu'
import { SettingsDialog } from './components/settings/SettingsDialog'
import { Toasts } from './components/ui/Toasts'
import { useGameSession } from './hooks/useGameSession'
import { useSettings } from './hooks/useSettings'
import { useToasts } from './hooks/useToasts'

type Dialog = 'load' | 'settings' | null

export default function App() {
  const { settings, updateSettings, resetSettings } = useSettings()
  const session = useGameSession()
  const { toasts, showToast, dismissToast } = useToasts()
  const [dialog, setDialog] = useState<Dialog>(null)
  const [isCreating, setIsCreating] = useState(false)

  const closeDialog = useCallback(() => setDialog(null), [])

  const handleNewAdventure = async () => {
    setIsCreating(true)
    try {
      await session.newGame()
    } catch (error) {
      showToast('error', `Could not create a new adventure. ${getErrorMessage(error)}`)
    } finally {
      setIsCreating(false)
    }
  }

  const handleLoad = async (gameId: string) => {
    await session.loadGame(gameId) // errors are shown inside the dialog
    setDialog(null)
    showToast('info', 'Adventure restored.')
  }

  const handleAction = async (action: string) => {
    try {
      await session.submitAction(action, settings.semanticGuardrail)
      return true
    } catch (error) {
      showToast('error', getErrorMessage(error))
      return false
    }
  }

  const handleSave = async () => {
    try {
      await session.saveGame()
      showToast('success', 'Game saved.')
    } catch (error) {
      showToast('error', `Saving failed. ${getErrorMessage(error)}`)
    }
  }

  const handleExitToMenu = async () => {
    try {
      await session.saveGame()
      session.closeGame()
    } catch (error) {
      showToast('error', `Could not save before leaving, so you stay in the game. ${getErrorMessage(error)}`)
    }
  }

  return (
    <>
      {session.game ? (
        <GameScreen
          game={session.game}
          session={session}
          settings={settings}
          onAction={handleAction}
          onSave={handleSave}
          onOpenSettings={() => setDialog('settings')}
          onExitToMenu={handleExitToMenu}
        />
      ) : (
        <MainMenu
          onNewAdventure={() => void handleNewAdventure()}
          onLoadGame={() => setDialog('load')}
          onSettings={() => setDialog('settings')}
          isCreating={isCreating}
        />
      )}

      {dialog === 'load' && <LoadGameDialog onLoad={handleLoad} onClose={closeDialog} />}
      {dialog === 'settings' && (
        <SettingsDialog settings={settings} onChange={updateSettings} onReset={resetSettings} onClose={closeDialog} />
      )}

      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </>
  )
}
