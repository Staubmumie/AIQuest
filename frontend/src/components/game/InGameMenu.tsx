import { Home, Play, Save, Settings, Swords } from 'lucide-react'
import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { MenuButton } from '../ui/MenuButton'

interface InGameMenuProps {
  onResume: () => void
  onSave: () => Promise<void>
  onSettings: () => void
  onMainMenu: () => Promise<void>
}

export function InGameMenu({ onResume, onSave, onSettings, onMainMenu }: InGameMenuProps) {
  const [pending, setPending] = useState<'save' | 'exit' | null>(null)

  const run = async (kind: 'save' | 'exit', action: () => Promise<void>) => {
    setPending(kind)
    try {
      await action()
    } finally {
      setPending(null)
    }
  }

  return (
    <Modal title="Paused" icon={Swords} onClose={onResume} size="sm">
      <nav className="flex flex-col gap-2.5 pl-6" aria-label="Game menu">
        <MenuButton icon={Play} label="Resume" onClick={onResume} autoFocus />
        <MenuButton
          icon={Save}
          label="Save Game"
          onClick={() => void run('save', onSave)}
          loading={pending === 'save'}
          disabled={pending !== null}
        />
        <MenuButton icon={Settings} label="Settings" onClick={onSettings} disabled={pending !== null} />
        <MenuButton
          icon={Home}
          label="Main Menu"
          hint="Your progress is saved first"
          onClick={() => void run('exit', onMainMenu)}
          loading={pending === 'exit'}
          disabled={pending !== null}
        />
      </nav>
    </Modal>
  )
}
