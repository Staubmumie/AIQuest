import { RotateCcw, Settings as SettingsIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Settings } from '../../settings/settings'
import { Button } from '../ui/Button'
import { InfoTip } from '../ui/InfoTip'
import { Modal } from '../ui/Modal'
import { Toggle } from '../ui/Toggle'

interface SettingsDialogProps {
  settings: Settings
  onChange: (settings: Settings) => void
  onReset: () => void
  onClose: () => void
}

function SettingRow({ label, tip, children }: { label: string; tip?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-center gap-1.5 text-sm text-parchment">
        {label}
        {tip && <InfoTip text={tip} />}
      </span>
      {children}
    </div>
  )
}

export function SettingsDialog({ settings, onChange, onReset, onClose }: SettingsDialogProps) {
  return (
    <Modal
      title="Settings"
      icon={SettingsIcon}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" icon={RotateCcw} onClick={onReset}>
            Reset to defaults
          </Button>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <p className="mb-4 text-xs text-ink-400">Settings are stored in this browser and apply to all adventures.</p>

      <section className="mb-4">
        <h3 className="mb-1 font-display text-sm font-bold uppercase tracking-widest text-gold-400">General</h3>
        <div className="divide-y divide-ink-700">
          <SettingRow
            label="Developer view"
            tip="Shows a side panel with the Game Master's node timeline, state changes per node, LLM token costs and logs."
          >
            <Toggle
              label="Developer view"
              checked={settings.developerView}
              onChange={(developerView) => onChange({ ...settings, developerView })}
            />
          </SettingRow>
          <SettingRow
            label="Enable Semantic Guardrail"
            tip="Adds one LLM call per turn that checks whether your input fits the adventure. Basic input checks and prompt-injection detection always run."
          >
            <Toggle
              label="Enable Semantic Guardrail"
              checked={settings.semanticGuardrail}
              onChange={(semanticGuardrail) => onChange({ ...settings, semanticGuardrail })}
            />
          </SettingRow>
        </div>
      </section>
    </Modal>
  )
}
