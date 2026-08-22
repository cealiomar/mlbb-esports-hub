import type { Match } from '@/lib/data/types'

export function isDirectReplay(url: string): boolean {
  return /(?:youtube\.com\/(?:watch|live)|youtu\.be\/|twitch\.tv\/videos\/|facebook\.com\/.*\/videos\/)/i.test(
    url,
  )
}

/** Returns a replay only for finished matches and only when it is direct. */
export function replayUrl(match: Match): string | undefined {
  if (match.status !== 'completed') return undefined

  const vod = match.vodUrls?.find(isDirectReplay)
  return vod ?? match.streamUrls.find(isDirectReplay)
}
