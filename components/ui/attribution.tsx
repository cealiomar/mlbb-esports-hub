import { useTranslations } from 'next-intl'
import { AUTHOR } from '@/lib/content/author'

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      aria-hidden
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      aria-hidden
    >
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
      <path d="m3.5 6.5 8.5 6 8.5-6" />
    </svg>
  )
}

function CoffeeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 8h12v5.5A4.5 4.5 0 0 1 12.5 18h-3A4.5 4.5 0 0 1 5 13.5V8Z" />
      <path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17M4 21h15M8 3v2M12 3v2M16 3v2" />
    </svg>
  )
}

export function Attribution() {
  const t = useTranslations('data')
  const tf = useTranslations('footer')

  return (
    <footer className="mt-auto border-t border-[var(--line)] px-6 py-10">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[var(--step--1)]">
          <span className="text-[var(--ink-muted)]">{tf('developedBy')}</span>
          <a
            href={AUTHOR.instagram}
            target="_blank"
            rel="noreferrer noopener"
            className="font-bold tracking-wide text-[var(--brand)] underline decoration-[color-mix(in_srgb,var(--brand)_45%,transparent)] underline-offset-4 transition-colors hover:text-[var(--brand-hot)]"
          >
            @{AUTHOR.handle}
          </a>
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href={AUTHOR.paypal}
            target="_blank"
            rel="noreferrer noopener"
            className="coffee-link flex min-h-[44px] items-center gap-2 rounded-full px-5 text-[var(--step--1)] font-extrabold"
          >
            <CoffeeIcon />
            {tf('buyMeCoffee')}
          </a>
          <a
            href={AUTHOR.instagram}
            target="_blank"
            rel="noreferrer noopener"
            className="chip flex min-h-[44px] items-center gap-2 rounded-full px-4 text-[var(--step--1)] font-semibold"
          >
            <InstagramIcon />
            {tf('instagram')}
          </a>
          <a
            href={`mailto:${AUTHOR.email}`}
            className="chip flex min-h-[44px] items-center gap-2 rounded-full px-4 text-[var(--step--1)] font-semibold"
          >
            <MailIcon />
            {AUTHOR.email}
          </a>
        </div>

        <a
          href="https://liquipedia.net/mobilelegends"
          target="_blank"
          rel="noreferrer noopener"
          className="text-[var(--step--1)] text-[var(--ink-muted)] underline underline-offset-4 transition-colors hover:text-[var(--ink)]"
        >
          {t('attribution')}
        </a>
      </div>
    </footer>
  )
}
