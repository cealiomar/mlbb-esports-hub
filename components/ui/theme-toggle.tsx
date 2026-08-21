'use client'

import { useTranslations } from 'next-intl'

type Theme = 'light' | 'dark'

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  localStorage.setItem('mlbb-theme', theme)
}

export function ThemeToggle() {
  const t = useTranslations('theme')

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={t('toggle')}
      title={t('toggle')}
      onClick={() => {
        const theme: Theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
        const next: Theme = theme === 'dark' ? 'light' : 'dark'
        applyTheme(next)
      }}
    >
      <span className="theme-toggle__track" aria-hidden>
        <span className="theme-toggle__thumb">
          <svg className="theme-icon theme-icon--moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M20.2 15.1A8.5 8.5 0 0 1 8.9 3.8 8.5 8.5 0 1 0 20.2 15Z" />
          </svg>
          <svg className="theme-icon theme-icon--sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="3.7" />
            <path d="M12 2v2.2M12 19.8V22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2 12h2.2M19.8 12H22M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
          </svg>
        </span>
      </span>
    </button>
  )
}
