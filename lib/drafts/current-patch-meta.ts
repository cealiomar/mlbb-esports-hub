import type { DraftLane } from './coach'
import patchMetaSnapshot from '../../data/snapshots/patch-meta.json'

export type PatchMetaTier = 'SS' | 'S' | 'A' | 'B' | 'C' | 'D'

export interface PatchHeroMeta {
  lanes: DraftLane[]
  tier: PatchMetaTier
  score: number
  roles?: string[]
  specialties?: string[]
}

// Current-patch ranked fallback. Exact current-season pro drafts remain the
// primary signal; this fills lane knowledge and keeps unplayed meta options
// selectable instead of treating them as role-less heroes.
const FALLBACK_PATCH_META_SOURCE = 'https://mlbb.io/en/hero-tier'
const FALLBACK_PATCH_META_UPDATED_AT = '2026-08-24T23:03:57.000Z'
const FALLBACK_PATCH_META_VERSION = '2.1.95'

const FALLBACK_CURRENT_PATCH_META: Record<string, PatchHeroMeta> = {
  miya: { lanes: ['gold'], tier: 'SS', score: 0.929 },
  hanabi: { lanes: ['gold'], tier: 'SS', score: 0.894 },
  sun: { lanes: ['exp', 'jungle'], tier: 'SS', score: 0.889 },
  belerick: { lanes: ['roam'], tier: 'SS', score: 0.882 },
  rafaela: { lanes: ['roam'], tier: 'SS', score: 0.871 },
  melissa: { lanes: ['gold'], tier: 'SS', score: 0.869 },
  atlas: { lanes: ['roam'], tier: 'S', score: 0.842 },
  floryn: { lanes: ['roam'], tier: 'S', score: 0.84 },
  eudora: { lanes: ['mid'], tier: 'S', score: 0.832 },
  hanzo: { lanes: ['jungle'], tier: 'S', score: 0.82 },
  gord: { lanes: ['mid'], tier: 'S', score: 0.8 },
  valir: { lanes: ['mid'], tier: 'S', score: 0.796 },
  gloo: { lanes: ['roam', 'exp'], tier: 'S', score: 0.78 },
  yisunshin: { lanes: ['jungle'], tier: 'S', score: 0.776 },
  ling: { lanes: ['jungle'], tier: 'S', score: 0.776 },
  zetian: { lanes: ['mid'], tier: 'S', score: 0.774 },
  minotaur: { lanes: ['roam'], tier: 'S', score: 0.771 },
  silvanna: { lanes: ['exp'], tier: 'S', score: 0.766 },
  estes: { lanes: ['roam'], tier: 'A', score: 0.739 },
  paquito: { lanes: ['exp'], tier: 'A', score: 0.725 },
  guinevere: { lanes: ['exp'], tier: 'A', score: 0.711 },
  carmilla: { lanes: ['roam'], tier: 'A', score: 0.71 },
  minsitthar: { lanes: ['exp', 'roam'], tier: 'A', score: 0.692 },
  vexana: { lanes: ['mid'], tier: 'A', score: 0.688 },
  dyrroth: { lanes: ['exp', 'jungle'], tier: 'A', score: 0.688 },
  kadita: { lanes: ['mid'], tier: 'A', score: 0.683 },
  badang: { lanes: ['roam', 'exp'], tier: 'A', score: 0.669 },
  cyclops: { lanes: ['mid'], tier: 'A', score: 0.666 },
  barats: { lanes: ['jungle'], tier: 'A', score: 0.659 },
  marcel: { lanes: ['roam'], tier: 'A', score: 0.633 },
  saber: { lanes: ['jungle', 'roam'], tier: 'A', score: 0.632 },
  aamon: { lanes: ['jungle'], tier: 'A', score: 0.629 },
  hilda: { lanes: ['roam', 'exp'], tier: 'A', score: 0.627 },
  argus: { lanes: ['exp'], tier: 'A', score: 0.624 },
  julian: { lanes: ['jungle', 'exp'], tier: 'A', score: 0.62 },
  kagura: { lanes: ['mid'], tier: 'A', score: 0.617 },
  benedetta: { lanes: ['exp'], tier: 'A', score: 0.611 },
  irithel: { lanes: ['gold'], tier: 'A', score: 0.607 },
  khufra: { lanes: ['roam'], tier: 'A', score: 0.605 },
  vale: { lanes: ['mid'], tier: 'A', score: 0.595 },
  zhask: { lanes: ['mid'], tier: 'A', score: 0.593 },
  angela: { lanes: ['roam'], tier: 'B', score: 0.577 },
  thamuz: { lanes: ['exp'], tier: 'B', score: 0.574 },
  hirara: { lanes: ['jungle'], tier: 'B', score: 0.57 },
  popolandkupa: { lanes: ['jungle', 'gold'], tier: 'B', score: 0.569 },
  lukas: { lanes: ['exp', 'jungle'], tier: 'B', score: 0.569 },
  masha: { lanes: ['exp'], tier: 'B', score: 0.563 },
  lolita: { lanes: ['roam'], tier: 'B', score: 0.559 },
  xborg: { lanes: ['exp'], tier: 'B', score: 0.557 },
  fredrinn: { lanes: ['jungle'], tier: 'B', score: 0.554 },
  novaria: { lanes: ['mid'], tier: 'B', score: 0.554 },
  alice: { lanes: ['exp', 'jungle'], tier: 'B', score: 0.553 },
  akai: { lanes: ['roam'], tier: 'B', score: 0.549 },
  natalia: { lanes: ['jungle', 'roam'], tier: 'B', score: 0.546 },
  diggie: { lanes: ['roam'], tier: 'B', score: 0.544 },
  gusion: { lanes: ['jungle', 'mid'], tier: 'B', score: 0.54 },
  suyou: { lanes: ['jungle'], tier: 'B', score: 0.535 },
  moskov: { lanes: ['gold'], tier: 'B', score: 0.531 },
  bane: { lanes: ['jungle', 'exp'], tier: 'B', score: 0.531 },
  terizla: { lanes: ['exp'], tier: 'B', score: 0.527 },
  johnson: { lanes: ['roam'], tier: 'B', score: 0.526 },
  cecilion: { lanes: ['mid'], tier: 'B', score: 0.521 },
  uranus: { lanes: ['exp'], tier: 'C', score: 0.499 },
  odette: { lanes: ['mid'], tier: 'C', score: 0.498 },
  khaleed: { lanes: ['roam', 'exp'], tier: 'C', score: 0.496 },
  beatrix: { lanes: ['gold'], tier: 'C', score: 0.494 },
  sora: { lanes: ['exp'], tier: 'C', score: 0.487 },
  yuzhong: { lanes: ['exp'], tier: 'C', score: 0.482 },
  selena: { lanes: ['mid', 'roam'], tier: 'C', score: 0.48 },
  edith: { lanes: ['exp', 'roam'], tier: 'C', score: 0.476 },
  leomord: { lanes: ['jungle'], tier: 'C', score: 0.468 },
  ixia: { lanes: ['gold'], tier: 'C', score: 0.467 },
  aldous: { lanes: ['exp'], tier: 'C', score: 0.456 },
  esmeralda: { lanes: ['exp'], tier: 'C', score: 0.453 },
  alucard: { lanes: ['jungle'], tier: 'C', score: 0.451 },
  aulus: { lanes: ['jungle'], tier: 'C', score: 0.445 },
  lylia: { lanes: ['mid'], tier: 'C', score: 0.44 },
  brody: { lanes: ['gold'], tier: 'C', score: 0.436 },
  natan: { lanes: ['gold'], tier: 'C', score: 0.435 },
  obsidia: { lanes: ['gold'], tier: 'C', score: 0.435 },
  change: { lanes: ['mid'], tier: 'C', score: 0.427 },
  aurora: { lanes: ['mid'], tier: 'C', score: 0.423 },
  helcurt: { lanes: ['jungle', 'roam'], tier: 'C', score: 0.422 },
  clint: { lanes: ['gold'], tier: 'C', score: 0.421 },
  yin: { lanes: ['jungle', 'exp'], tier: 'C', score: 0.411 },
  ruby: { lanes: ['exp'], tier: 'C', score: 0.41 },
  nana: { lanes: ['mid'], tier: 'C', score: 0.401 },
  roger: { lanes: ['jungle'], tier: 'C', score: 0.4 },
  lapulapu: { lanes: ['exp'], tier: 'C', score: 0.4 },
  yve: { lanes: ['mid'], tier: 'C', score: 0.397 },
  balmond: { lanes: ['jungle', 'exp'], tier: 'C', score: 0.396 },
  layla: { lanes: ['gold'], tier: 'C', score: 0.396 },
  harley: { lanes: ['jungle', 'mid'], tier: 'C', score: 0.395 },
  lesley: { lanes: ['gold'], tier: 'C', score: 0.394 },
  xavier: { lanes: ['mid'], tier: 'C', score: 0.39 },
  claude: { lanes: ['gold'], tier: 'C', score: 0.389 },
  faramis: { lanes: ['mid', 'roam'], tier: 'C', score: 0.387 },
  hayabusa: { lanes: ['jungle'], tier: 'C', score: 0.382 },
  lunox: { lanes: ['mid'], tier: 'C', score: 0.369 },
  nolan: { lanes: ['jungle'], tier: 'C', score: 0.367 },
  karrie: { lanes: ['gold'], tier: 'D', score: 0.35 },
  martis: { lanes: ['jungle', 'exp'], tier: 'D', score: 0.349 },
  tigreal: { lanes: ['roam'], tier: 'D', score: 0.346 },
  kaja: { lanes: ['roam'], tier: 'D', score: 0.341 },
  jawhead: { lanes: ['roam', 'exp'], tier: 'D', score: 0.34 },
  freya: { lanes: ['exp', 'jungle'], tier: 'D', score: 0.339 },
  chou: { lanes: ['exp', 'roam'], tier: 'D', score: 0.333 },
  zilong: { lanes: ['exp'], tier: 'D', score: 0.322 },
  hylos: { lanes: ['roam'], tier: 'D', score: 0.319 },
  phoveus: { lanes: ['exp'], tier: 'D', score: 0.317 },
  kimmy: { lanes: ['mid', 'gold'], tier: 'D', score: 0.316 },
  alpha: { lanes: ['jungle', 'exp'], tier: 'D', score: 0.307 },
  arlott: { lanes: ['exp'], tier: 'D', score: 0.305 },
  grock: { lanes: ['roam'], tier: 'D', score: 0.291 },
  granger: { lanes: ['gold'], tier: 'D', score: 0.282 },
  franco: { lanes: ['roam'], tier: 'D', score: 0.281 },
  pharsa: { lanes: ['mid'], tier: 'D', score: 0.268 },
  joy: { lanes: ['jungle'], tier: 'D', score: 0.265 },
  karina: { lanes: ['jungle'], tier: 'D', score: 0.265 },
  bruno: { lanes: ['gold'], tier: 'D', score: 0.264 },
  cici: { lanes: ['exp'], tier: 'D', score: 0.256 },
  gatotkaca: { lanes: ['roam', 'exp'], tier: 'D', score: 0.25 },
  zhuxin: { lanes: ['mid'], tier: 'D', score: 0.24 },
  wanwan: { lanes: ['gold'], tier: 'D', score: 0.238 },
  lancelot: { lanes: ['jungle'], tier: 'D', score: 0.232 },
  luoyi: { lanes: ['mid'], tier: 'D', score: 0.231 },
  fanny: { lanes: ['jungle'], tier: 'D', score: 0.225 },
  chip: { lanes: ['roam'], tier: 'D', score: 0.21 },
  harith: { lanes: ['gold', 'jungle'], tier: 'D', score: 0.201 },
  baxia: { lanes: ['jungle', 'roam'], tier: 'D', score: 0.19 },
  mathilda: { lanes: ['roam'], tier: 'D', score: 0.177 },
  valentina: { lanes: ['mid'], tier: 'D', score: 0.165 },
  kalea: { lanes: ['roam'], tier: 'D', score: 0.162 },
}

interface PatchMetaSnapshotData {
  source?: string
  updatedAt?: string
  version?: string
  heroes?: Record<string, PatchHeroMeta>
}

const liveData = (patchMetaSnapshot as { data?: PatchMetaSnapshotData }).data
const hasValidLiveData =
  Boolean(liveData?.updatedAt && !Number.isNaN(Date.parse(liveData.updatedAt))) &&
  Object.keys(liveData?.heroes ?? {}).length >= 120

const liveHeroes = hasValidLiveData ? liveData?.heroes ?? {} : {}

// The live source owns ranking/tier data. Curated fallback lanes are retained
// as extra flex-role knowledge because the source currently publishes only a
// single primary lane per hero.
export const CURRENT_PATCH_META: Record<string, PatchHeroMeta> = hasValidLiveData
  ? Object.fromEntries(
      Object.entries(liveHeroes).map(([key, item]) => [
        key,
        {
          ...item,
          lanes: [
            ...new Set([
              ...item.lanes,
              ...(FALLBACK_CURRENT_PATCH_META[key]?.lanes ?? []),
            ]),
          ],
        },
      ]),
    )
  : FALLBACK_CURRENT_PATCH_META

export const PATCH_META_SOURCE = hasValidLiveData
  ? liveData?.source ?? FALLBACK_PATCH_META_SOURCE
  : FALLBACK_PATCH_META_SOURCE
export const PATCH_META_UPDATED_AT = hasValidLiveData
  ? liveData?.updatedAt ?? FALLBACK_PATCH_META_UPDATED_AT
  : FALLBACK_PATCH_META_UPDATED_AT
export const PATCH_META_VERSION = hasValidLiveData
  ? liveData?.version ?? FALLBACK_PATCH_META_VERSION
  : FALLBACK_PATCH_META_VERSION
