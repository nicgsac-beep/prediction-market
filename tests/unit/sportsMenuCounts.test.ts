import type { SportsMenuEntry } from '@/lib/sports-menu-types'
import { describe, expect, it } from 'vitest'
import { buildSportsMenuCountsBySlug } from '@/lib/sports-menu-counts'
import {
  SPORTS_SIDEBAR_FUTURE_COUNT_KEY,
  SPORTS_SIDEBAR_LIVE_COUNT_KEY,
} from '@/lib/sports-sidebar-counts'
import { buildSportsSlugResolver } from '@/lib/sports-slug-mapping'

function buildLinkEntry(params: {
  id: string
  label: string
  href: string
  menuSlug?: string | null
}): SportsMenuEntry {
  return {
    type: 'link',
    id: params.id,
    label: params.label,
    href: params.href,
    iconPath: `/icons/${params.id}.svg`,
    menuSlug: params.menuSlug ?? null,
  }
}

describe('buildSportsMenuCountsBySlug', () => {
  it('counts live and future sidebar buckets and matches events by sports_series_slug aliases', () => {
    const resolver = buildSportsSlugResolver([
      {
        menuSlug: 'league-of-legends',
        h1Title: 'League of Legends',
        aliases: ['lol', 'LoL'],
        sections: {
          gamesEnabled: true,
          propsEnabled: true,
        },
      },
      {
        menuSlug: 'counter-strike',
        h1Title: 'Counter-Strike',
        aliases: ['cs2', 'CS2'],
        sections: {
          gamesEnabled: true,
          propsEnabled: true,
        },
      },
    ])

    const menuEntries: SportsMenuEntry[] = [
      buildLinkEntry({ id: 'live', label: 'Live', href: '/esports/live' }),
      buildLinkEntry({ id: 'upcoming', label: 'Upcoming', href: '/esports/soon' }),
      buildLinkEntry({
        id: 'lol',
        label: 'LoL',
        href: '/esports/league-of-legends/games',
        menuSlug: 'league-of-legends',
      }),
      buildLinkEntry({
        id: 'cs2',
        label: 'CS2',
        href: '/esports/cs2/games',
        menuSlug: 'counter-strike',
      }),
    ]

    const now = new Date('2026-04-02T12:00:00.000Z')
    const counts = buildSportsMenuCountsBySlug(
      resolver,
      [
        {
          slug: null,
          series_slug: 'league-of-legends',
          tags: [],
          is_hidden: false,
          sports_live: false,
          sports_ended: false,
          sports_start_time: new Date('2026-04-02T15:00:00.000Z'),
          start_date: new Date('2026-04-02T15:00:00.000Z'),
          end_date: new Date('2026-04-02T17:00:00.000Z'),
        },
        {
          slug: 'cs2',
          series_slug: null,
          tags: [],
          is_hidden: false,
          sports_live: true,
          sports_ended: false,
          sports_start_time: new Date('2026-04-02T10:00:00.000Z'),
          start_date: new Date('2026-04-02T10:00:00.000Z'),
          end_date: new Date('2026-04-02T14:00:00.000Z'),
        },
      ],
      menuEntries,
      now.getTime(),
    )

    expect(counts).toMatchObject({
      'league-of-legends': 1,
      'counter-strike': 1,
      [SPORTS_SIDEBAR_LIVE_COUNT_KEY]: 1,
      [SPORTS_SIDEBAR_FUTURE_COUNT_KEY]: 1,
    })
  })

  it('ignores slugs that are not present in the current vertical menu', () => {
    const resolver = buildSportsSlugResolver([
      {
        menuSlug: 'league-of-legends',
        h1Title: 'League of Legends',
        aliases: ['lol'],
        sections: {
          gamesEnabled: true,
          propsEnabled: true,
        },
      },
      {
        menuSlug: 'basketball',
        h1Title: 'Basketball',
        sections: {
          gamesEnabled: true,
          propsEnabled: true,
        },
      },
    ])

    const menuEntries: SportsMenuEntry[] = [
      buildLinkEntry({
        id: 'lol',
        label: 'LoL',
        href: '/esports/league-of-legends/games',
        menuSlug: 'league-of-legends',
      }),
    ]

    const counts = buildSportsMenuCountsBySlug(
      resolver,
      [
        {
          slug: 'basketball',
          series_slug: null,
          tags: [],
          is_hidden: false,
          sports_live: true,
          sports_ended: false,
          sports_start_time: new Date('2026-04-02T10:00:00.000Z'),
          start_date: new Date('2026-04-02T10:00:00.000Z'),
          end_date: new Date('2026-04-02T14:00:00.000Z'),
        },
      ],
      menuEntries,
      new Date('2026-04-02T12:00:00.000Z').getTime(),
    )

    expect(counts).toEqual({})
  })
})
