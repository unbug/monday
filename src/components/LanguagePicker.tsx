import { LOCALE_META, type Locale } from '../lib/i18n'

interface Props {
  locale: Locale
  onChange: (locale: Locale) => void
}

export function LanguagePicker({ locale, onChange }: Props) {
  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <span className="settings-section-title">Language</span>
      </div>
      <div className="language-picker">
        {(Object.entries(LOCALE_META) as [Locale, typeof LOCALE_META[Locale]][]).map(
          ([key, meta]) => (
            <button
              key={key}
              className={`language-picker-btn${locale === key ? ' language-picker-btn--active' : ''}`}
              onClick={() => onChange(key)}
              title={meta.name}
              type="button"
            >
              <span className="language-picker-native">{meta.nativeName}</span>
              <span className="language-picker-english">{meta.name}</span>
            </button>
          ),
        )}
      </div>
    </div>
  )
}
