import { t } from '../lib/i18n'

interface Props {
  highContrast: boolean
  onChange: (highContrast: boolean) => void
}

export function HighContrastToggle({ highContrast, onChange }: Props) {
  return (
    <button
      className={`high-contrast-toggle ${highContrast ? 'high-contrast-toggle-active' : ''}`}
      onClick={() => onChange(!highContrast)}
      aria-pressed={highContrast}
      title={highContrast ? t('settings.highContrastOff') : t('settings.highContrastOn')}
      type="button"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="4" fill="currentColor" />
        <line x1="21.17" y1="8" x2="12" y2="8" />
        <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
        <line x1="10.88" y1="21.94" x2="15.46" y2="14" />
      </svg>
      <span className="high-contrast-toggle-label">
        {highContrast ? t('settings.highContrastOn') : t('settings.highContrastOff')}
      </span>
    </button>
  )
}
