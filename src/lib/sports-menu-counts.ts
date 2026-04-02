import type { SportsMenuEntry } from '@/lib/sports-menu-types'
import type { SportsSlugResolver } from '@/lib/sports-slug-mapping'
import { normalizeComparableValue } from '@/lib/slug'
import {
  SPORTS_SIDEBAR_FUTURE_COUNT_KEY,
  SPORTS_SIDEBAR_LIVE_COUNT_KEY,
} from '@/lib/sports-sidebar-counts'
import { resolveCanonicalSportsSportSlug } from '@/lib/sports-slug-mapping'

export interface SportsMenuActiveCountRow {
  slug: string | null
  series_slug: string | null
  tags: unknown
  is_hidden: boolean
  sports_live: boolean | null
  sports_ended: boolean | null
  sports_start_time: Date | string | null
  start_date: Date | string | null
  end_date: Date | string | null
}

const SPORTS_LIVE_FALLBACK_WINDOW_MS = 2 * 60 * 60 * 1000

function toOptionalStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[]
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean)
}

function toFiniteTimestamp(value: Date | string | null | undefined) {
  if (!value) {
    return Number.NaN
  }

  if (value instanceof Date) {
    const timestamp = value.getTime()
    return Number.isFinite(timestamp) ? timestamp : Number.NaN
  }

  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : Number.NaN
}

function resolveCountRowStartTimestamp(row: SportsMenuActiveCountRow) {
  const sportsStartTimestamp = toFiniteTimestamp(row.sports_start_time)
  if (Number.isFinite(sportsStartTimestamp)) {
    return sportsStartTimestamp
  }

  return toFiniteTimestamp(row.start_date)
}

function resolveCountRowEndTimestamp(row: SportsMenuActiveCountRow) {
  return toFiniteTimestamp(row.end_date)
}

function resolveCountRowLiveFallbackEndTimestamp(row: SportsMenuActiveCountRow) {
  const startMs = resolveCountRowStartTimestamp(row)
  if (!Number.isFinite(startMs)) {
    return Number.NaN
  }

  const endMs = resolveCountRowEndTimestamp(row)
  const referenceEndMs = Number.isFinite(endMs) && endMs > startMs
    ? endMs
    : startMs

  return referenceEndMs + SPORTS_LIVE_FALLBACK_WINDOW_MS
}

function isCountRowLiveNow(row: SportsMenuActiveCountRow, nowMs: number) {
  if (row.sports_ended === true) {
    return false
  }

  if (row.sports_live === true) {
    return true
  }

  const startMs = resolveCountRowStartTimestamp(row)
  const endMs = resolveCountRowEndTimestamp(row)
  const isInTimeWindow = Number.isFinite(startMs) && Number.isFinite(endMs)
    ? startMs <= nowMs && nowMs <= endMs
    : false
  const liveFallbackEndMs = resolveCountRowLiveFallbackEndTimestamp(row)
  const isWithinFallbackWindow = Number.isFinite(startMs) && Number.isFinite(liveFallbackEndMs)
    ? startMs <= nowMs && nowMs <= liveFallbackEndMs
    : false

  return isInTimeWindow || isWithinFallbackWindow
}

function isCountRowFuture(row: SportsMenuActiveCountRow, nowMs: number) {
  if (row.sports_ended === true) {
    return false
  }

  const startMs = resolveCountRowStartTimestamp(row)
  return Number.isFinite(startMs) && startMs > nowMs
}

function collectMenuSlugs(entries: SportsMenuEntry[]) {
  const slugs = new Set<string>()

  for (const entry of entries) {
    if (entry.type === 'link') {
      const menuSlug = normalizeComparableValue(entry.menuSlug)
      if (menuSlug) {
        slugs.add(menuSlug)
      }
      continue
    }

    if (entry.type !== 'group') {
      continue
    }

    const groupMenuSlug = normalizeComparableValue(entry.menuSlug)
    if (groupMenuSlug) {
      slugs.add(groupMenuSlug)
    }

    for (const link of entry.links) {
      const linkMenuSlug = normalizeComparableValue(link.menuSlug)
      if (linkMenuSlug) {
        slugs.add(linkMenuSlug)
      }
    }
  }

  return slugs
}

export function buildSportsMenuCountsBySlug(
  resolver: SportsSlugResolver,
  activeCountRows: SportsMenuActiveCountRow[],
  menuEntries: SportsMenuEntry[],
  nowMs = Date.now(),
) {
  const countsBySlug: Record<string, number> = {}
  const menuSlugs = collectMenuSlugs(menuEntries)

  for (const row of activeCountRows) {
    if (row.is_hidden) {
      continue
    }

    const sportsTags = toOptionalStringArray(row.tags)
    const canonicalSlug = resolveCanonicalSportsSportSlug(resolver, {
      sportsSportSlug: row.slug,
      sportsSeriesSlug: row.series_slug,
      sportsTags,
    })
    if (!canonicalSlug || !menuSlugs.has(canonicalSlug)) {
      continue
    }

    countsBySlug[canonicalSlug] = (countsBySlug[canonicalSlug] ?? 0) + 1

    if (isCountRowLiveNow(row, nowMs)) {
      countsBySlug[SPORTS_SIDEBAR_LIVE_COUNT_KEY] = (countsBySlug[SPORTS_SIDEBAR_LIVE_COUNT_KEY] ?? 0) + 1
    }

    if (isCountRowFuture(row, nowMs)) {
      countsBySlug[SPORTS_SIDEBAR_FUTURE_COUNT_KEY] = (countsBySlug[SPORTS_SIDEBAR_FUTURE_COUNT_KEY] ?? 0) + 1
    }
  }

  return countsBySlug
}
