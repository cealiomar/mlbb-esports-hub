import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { withBasePath } from '@/lib/assets'
import { teamPath } from '@/lib/data/team-slug'
import { Tabs } from '@/components/ui/tabs'

export interface RosterPlayer {
  handle: string
  role: string | null
  country: string | null
  photoUrl: string | null
}

export interface RosterTeam {
  pageSlug: string
  name: string
  logoUrl: string | null
  wins: number | null
  losses: number | null
  /** False when no team page was built; the team is then shown unlinked. */
  hasPage: boolean
  players: RosterPlayer[]
}

const KNOWN_ROLES = new Set([
  'exp',
  'jungle',
  'jgl',
  'mid',
  'gold',
  'roam',
  'flex',
  'coach',
])

/** Roster codes are mostly ISO; Liquipedia writes Britain as `uk`. */
function flag(country: string | null): string | null {
  if (!country) return null
  const code = (country === 'uk' ? 'gb' : country).toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return null
  return String.fromCodePoint(
    ...[...code].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65),
  )
}

function PlayerCard({ player }: { player: RosterPlayer }) {
  const t = useTranslations('academy')
  const role = player.role?.toLowerCase() ?? null
  const countryFlag = flag(player.country)

  return (
    <li className="ac-player" data-testid="academy-player">
      <div className="ac-player__frame">
        {player.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={withBasePath(player.photoUrl)}
            alt={player.handle}
            width={360}
            height={450}
            loading="lazy"
            className="ac-player__photo"
          />
        ) : (
          <span className="ac-player__monogram" aria-hidden dir="ltr">
            {player.handle.slice(0, 2)}
          </span>
        )}
        {countryFlag && (
          <span className="ac-player__flag" aria-hidden>
            {countryFlag}
          </span>
        )}
      </div>
      <div className="ac-player__meta">
        <strong dir="ltr">{player.handle}</strong>
        {role && KNOWN_ROLES.has(role) && <span>{t(`roles.${role}`)}</span>}
      </div>
    </li>
  )
}

function TeamPanel({ team, locale }: { team: RosterTeam; locale: string }) {
  const t = useTranslations('academy')

  return (
    <div className="ac-team">
      <header className="ac-team__head">
        {team.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={withBasePath(team.logoUrl)}
            alt=""
            width={56}
            height={56}
            loading="lazy"
            className="ac-team__crest"
          />
        )}
        <div className="ac-team__name">
          <h3 dir="ltr">{team.name}</h3>
          {team.wins !== null && team.losses !== null && (
            <p>{t('record', { wins: team.wins, losses: team.losses })}</p>
          )}
        </div>
        {team.hasPage && (
          <Link
            href={teamPath(locale, team.pageSlug)}
            className="live-pill ac-button-ghost ac-team__link"
          >
            {t('teamPage')}
            <span aria-hidden className="ac-arrow">
              ↗
            </span>
          </Link>
        )}
      </header>

      <ul className="ac-players">
        {team.players.map((player) => (
          <PlayerCard key={player.handle} player={player} />
        ))}
      </ul>
    </div>
  )
}

export function RosterBoard({
  teams,
  locale,
}: {
  teams: RosterTeam[]
  locale: string
}) {
  return (
    <Tabs
      items={teams.map((team) => ({
        id: team.pageSlug,
        label: team.name,
        content: <TeamPanel team={team} locale={locale} />,
      }))}
    />
  )
}
