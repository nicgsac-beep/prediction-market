import type { SportsVertical } from '@/lib/sports-vertical'
import { getSportsVerticalConfig } from '@/lib/sports-vertical'

export const SPORTS_SIDEBAR_LIVE_COUNT_KEY = '__live__'
export const SPORTS_SIDEBAR_FUTURE_COUNT_KEY = '__future__'

function normalizeComparableValue(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

export function isSportsSidebarLiveHref(value: string | null | undefined, vertical: SportsVertical) {
  return normalizeComparableValue(value) === normalizeComparableValue(getSportsVerticalConfig(vertical).livePath)
}

export function isSportsSidebarFutureHref(value: string | null | undefined, vertical: SportsVertical) {
  return normalizeComparableValue(value)
    .startsWith(normalizeComparableValue(getSportsVerticalConfig(vertical).futurePathPrefix))
}

export function resolveSportsSidebarCountKey(input: {
  href?: string | null
  menuSlug?: string | null
  vertical: SportsVertical
}) {
  if (isSportsSidebarLiveHref(input.href, input.vertical)) {
    return SPORTS_SIDEBAR_LIVE_COUNT_KEY
  }

  if (isSportsSidebarFutureHref(input.href, input.vertical)) {
    return SPORTS_SIDEBAR_FUTURE_COUNT_KEY
  }

  const normalizedMenuSlug = normalizeComparableValue(input.menuSlug)
  return normalizedMenuSlug || null
}
