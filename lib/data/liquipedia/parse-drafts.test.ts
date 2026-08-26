import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseDraftSeries, parseDraftSummary } from './parse-drafts'

const context = {
  regionSlug: 'indonesia',
  leagueName: 'MPL Indonesia',
  leaguePageSlug: 'MPL/Indonesia/Season_18/Regular_Season',
}

describe('parseDraftSeries', () => {
  const wikitext = readFileSync(
    join(__dirname, '__fixtures__', 'draft-id.wikitext'),
    'utf8',
  )
  const series = parseDraftSeries(wikitext, context)

  it('reads the two teams and series MVP from a captured match', () => {
    expect(series).toHaveLength(1)
    expect(series[0]).toMatchObject({
      playedOn: '2026-08-14',
      stageName: 'Regular Season',
      team1: { name: 'EVOS', pageSlug: 'EVOS' },
      team2: { name: 'RRQ Hoshi', pageSlug: 'RRQ_Hoshi' },
      team1Score: 2,
      team2Score: 0,
      winner: 1,
      mvp: 'Alberttt',
    })
  })

  it('keeps the week label from the surrounding match list', () => {
    const grouped = parseDraftSeries(
      `{{Matchlist|title=Week 3|M1=${wikitext}}}`,
      context,
    )
    expect(grouped[0].roundLabel).toBe('Week 3')
  })

  it('reads picks, bans, side, winner, duration and direct VOD per game', () => {
    expect(series[0].games).toHaveLength(2)
    expect(series[0].games[0]).toMatchObject({
      winner: 1,
      durationSeconds: 1011,
      mapName: 'Broken Walls',
      team1Side: 'blue',
      team2Side: 'red',
      vodUrl: 'https://www.youtube.com/watch?v=SuqcHmHNTos',
    })
    expect(series[0].games[0].team1Picks.map((hero) => hero.id)).toEqual([
      'dyrroth',
      'paquito',
      'eudora',
      'melissa',
      'belerick',
    ])
    expect(series[0].games[1].team2Bans.at(-2)?.id).toBe('yi sun-shin')
  })

  it('ignores unplayed map placeholders', () => {
    expect(series[0].games.some((game) => game.number === 3)).toBe(false)
  })

  it('extracts a map after a piped team link in Philippines comments', () => {
    const philippines = parseDraftSeries(
      `{{Match
        |opponent1={{TeamOpponent|Aurora PH}}
        |opponent2={{TeamOpponent|ONIC Philippines}}
        |map1={{Map
          |winner=2 |comment=[[Aurora Gaming PH|'''RORA''']] picked <b>Flying Cloud</b>
          |t1h1=alice |t2h1=barats |t1b1=selena |t2b1=freya
        }}
      }}`,
      { ...context, regionSlug: 'philippines' },
    )

    expect(philippines[0].games[0].mapName).toBe('Flying Cloud')
  })
})

describe('parseDraftSummary', () => {
  it('reads Liquipedia hero pick, ban and presence columns', () => {
    const html = `
      <table>
        <tr class="character-stats-row">
          <td>1</td>
          <td><a href="/mobilelegends/Hirara" title="Hirara"><img src="/commons/images/thumb/8/84/ML_icon_Hirara.png/25px-ML_icon_Hirara.png" srcset="/commons/images/thumb/8/84/ML_icon_Hirara.png/38px-ML_icon_Hirara.png 1.5x, /commons/images/thumb/8/84/ML_icon_Hirara.png/50px-ML_icon_Hirara.png 2x"></a> Hirara</td>
          <td>28</td><td>15</td><td>13</td><td>53.57%</td><td>73.68%</td>
          <td>15</td><td>9</td><td>6</td><td>60.00%</td>
          <td>13</td><td>6</td><td>7</td><td>46.15%</td>
          <td>9</td><td>23.68%</td><td>37</td><td>97.37%</td><td>Show</td>
        </tr>
        <tr><th class="sortbottom" colspan="5">38 games played</th></tr>
      </table>
    `
    const summary = parseDraftSummary(html, context)

    expect(summary.gamesAnalyzed).toBe(38)
    expect(summary.heroStats[0]).toMatchObject({
      hero: { name: 'Hirara', pageSlug: 'Hirara' },
      picks: 28,
      pickWins: 15,
      pickLosses: 13,
      pickRate: 73.68,
      bans: 9,
      banRate: 23.68,
      presence: 37,
      presenceRate: 97.37,
    })
    expect(summary.heroStats[0].imageUrl).toBe(
      'https://liquipedia.net/commons/images/thumb/8/84/ML_icon_Hirara.png/50px-ML_icon_Hirara.png',
    )
  })
})
