'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { TeamCrest } from '@/components/matches/team-crest'
import { resolveTeamPage, teamPageIndex, teamPath } from '@/lib/data/team-slug'
import type { StandingRow, StandingTable } from '@/lib/data/types'

function record(wins: number | null, losses: number | null): string {
  return wins === null || losses === null ? '—' : `${wins}-${losses}`
}

function difference(value: number | null): string {
  if (value === null) return '—'
  return value > 0 ? `+${value}` : String(value)
}

function TeamName({
  row,
  locale,
  target,
}: {
  row: StandingRow
  locale: 'en' | 'ar'
  /** The built team page this row opens, or null. */
  target: string | null
}) {
  const content = (
    <span className="standing-team" dir="ltr">
      <TeamCrest team={row.team} size={34} />
      <span className="standing-team__name">{row.team.name}</span>
    </span>
  )

  return target ? (
    <Link
      href={teamPath(locale, target)}
      aria-label={row.team.name}
    >
      {content}
    </Link>
  ) : content
}

export function StandingsTable({
  table,
  locale,
  compact = false,
  limit,
  showStage = true,
  teamPageSlugs = [],
}: {
  table: StandingTable
  locale: 'en' | 'ar'
  compact?: boolean
  limit?: number
  showStage?: boolean
  teamPageSlugs?: string[]
}) {
  const t = useTranslations('standings')
  const rows = limit ? table.rows.slice(0, limit) : table.rows
  const pageIndex = useMemo(() => teamPageIndex(teamPageSlugs), [teamPageSlugs])

  return (
    <div className={`standings-table-wrap ${compact ? 'is-compact' : 'panel'}`}>
      {showStage && (
        <div className="standings-stage">
          <span>{table.leagueName}</span>
          <strong>{table.stageName}</strong>
        </div>
      )}

      <table
        className="standings-table"
        aria-label={t('tableLabel', {
          league: table.leagueName,
          stage: table.stageName,
        })}
      >
        <thead>
          <tr>
            <th scope="col">{t('position')}</th>
            <th scope="col">{t('team')}</th>
            <th scope="col">{t('match')}</th>
            {!compact && <th className="standing-col-game" scope="col">{t('game')}</th>}
            {!compact && <th className="standing-col-diff" scope="col">{t('diff')}</th>}
            <th scope="col">{t('points')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${row.team.pageSlug || row.team.name}-${index}`}
              data-standing-zone={row.zone}
            >
              <td className="standing-position tabular-nums">
                <span className="standing-zone-dot" title={t(row.zone)} />
                {row.position}
              </td>
              <td>
                <TeamName
                  row={row}
                  locale={locale}
                  target={resolveTeamPage(pageIndex, row.team.pageSlug, row.team.name)}
                />
              </td>
              <td className="standing-record tabular-nums">
                {record(row.matchWins, row.matchLosses)}
              </td>
              {!compact && (
                <td className="standing-col-game standing-record tabular-nums">
                  {record(row.gameWins, row.gameLosses)}
                </td>
              )}
              {!compact && (
                <td className="standing-col-diff standing-record tabular-nums">
                  {difference(row.gameDiff)}
                </td>
              )}
              <td className="standing-points tabular-nums">
                {row.points ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {!compact && (
        <div className="standings-legend">
          {(['advance', 'playoff', 'eliminated'] as const).map((zone) => (
            <span key={zone} data-standing-legend={zone}>
              <i className="standing-zone-dot" aria-hidden />
              {t(zone)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
