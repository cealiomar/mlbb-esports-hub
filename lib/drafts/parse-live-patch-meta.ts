import type { DraftLane } from './coach'
import type { PatchHeroMeta, PatchMetaTier } from './current-patch-meta'

export interface LivePatchMetaData {
  source: string
  updatedAt: string
  version: string
  heroes: Record<string, PatchHeroMeta>
}

interface RawLiveHero {
  hero_name?: unknown
  lane?: unknown
  role?: unknown
  speciality?: unknown
  tier?: unknown
  score?: unknown
}

const TIERS = new Set<PatchMetaTier>(['SS', 'S', 'A', 'B', 'C', 'D'])

function normalizedKey(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[’']/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
}

function normalizeLane(value: string): DraftLane | null {
  const lane = value.toLowerCase()
  if (lane.includes('exp')) return 'exp'
  if (lane.includes('jungle')) return 'jungle'
  if (lane.includes('mid')) return 'mid'
  if (lane.includes('gold')) return 'gold'
  if (lane.includes('roam')) return 'roam'
  return null
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function readFlightChunks(html: string): string {
  const chunks: string[] = []
  const scripts = html.matchAll(
    /self\.__next_f\.push\((\[[\s\S]*?\])\)<\/script>/g,
  )
  for (const script of scripts) {
    try {
      const payload = JSON.parse(script[1]) as unknown
      if (
        Array.isArray(payload) &&
        typeof payload[1] === 'string'
      ) {
        chunks.push(payload[1])
      }
    } catch {
      // Ignore unrelated or incomplete Next.js flight chunks.
    }
  }
  return chunks.join('\n')
}

function extractJsonArray(source: string, marker: string): unknown[] {
  const markerIndex = source.indexOf(marker)
  if (markerIndex < 0) throw new Error(`Missing ${marker}`)
  const start = source.indexOf('[', markerIndex + marker.length)
  if (start < 0) throw new Error(`Missing array after ${marker}`)

  let depth = 0
  let quoted = false
  let escaped = false
  for (let index = start; index < source.length; index += 1) {
    const character = source[index]
    if (quoted) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === '"') quoted = false
      continue
    }
    if (character === '"') quoted = true
    else if (character === '[') depth += 1
    else if (character === ']') {
      depth -= 1
      if (depth === 0) {
        const parsed = JSON.parse(source.slice(start, index + 1)) as unknown
        if (!Array.isArray(parsed)) throw new Error('Hero payload is not an array')
        return parsed
      }
    }
  }
  throw new Error('Hero payload is incomplete')
}

export function parseLivePatchMeta(
  html: string,
  source: string,
  fallbackVersion: string,
): LivePatchMetaData {
  const decoded = readFlightChunks(html)
  const rawHeroes = extractJsonArray(decoded, '"initialHeroes":')
  const updatedAt =
    decoded.match(/"initialLastUpdated":"([^"]+)"/)?.[1] ?? ''
  const detectedVersion =
    html.match(/\bPatch\s+([0-9]+\.[0-9]+\.[0-9]+)\b/i)?.[1]
  const heroes: Record<string, PatchHeroMeta> = {}

  for (const rawValue of rawHeroes) {
    if (!rawValue || typeof rawValue !== 'object') continue
    const raw = rawValue as RawLiveHero
    if (typeof raw.hero_name !== 'string') continue
    if (typeof raw.tier !== 'string' || !TIERS.has(raw.tier as PatchMetaTier)) {
      continue
    }
    const lanes = stringList(raw.lane)
      .map(normalizeLane)
      .filter((lane): lane is DraftLane => lane !== null)
    const score = Number(raw.score)
    if (lanes.length === 0 || !Number.isFinite(score)) continue

    heroes[normalizedKey(raw.hero_name)] = {
      lanes: [...new Set(lanes)],
      tier: raw.tier as PatchMetaTier,
      score: Math.max(0, Math.min(1, score / 1000)),
      roles: stringList(raw.role),
      specialties: stringList(raw.speciality),
    }
  }

  if (Object.keys(heroes).length < 120) {
    throw new Error(`Only ${Object.keys(heroes).length} valid heroes were parsed`)
  }
  if (!updatedAt || Number.isNaN(Date.parse(updatedAt))) {
    throw new Error('Live patch timestamp is missing or invalid')
  }

  return {
    source,
    updatedAt,
    version: detectedVersion ?? fallbackVersion,
    heroes,
  }
}
