// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive, type App } from 'vue'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { HeroId, ItemId, RoleId, StarLevel } from '@/content/ids'
import type { TalentChoice } from '@/content/talents'
import HeroDetails from '@/ui/components/common/HeroDetails.vue'
import { i18n } from '@/ui/i18n'

const props = reactive({
  heroId: 'pyromancer' as HeroId,
  stars: 1 as StarLevel,
  items: [] as ItemId[],
  role: undefined as RoleId | undefined,
  talent: undefined as TalentChoice | undefined,
})

const initialLocale = i18n.global.locale.value
let app: App

function values(selector: string) {
  return [...document.querySelectorAll(`${selector} .stat-value`)].map((value) => ({
    base: value.firstElementChild?.textContent,
    bonus: value.querySelector('.bonus')?.textContent ?? null,
    worse: Boolean(value.querySelector('.bonus.worse')),
  }))
}

beforeEach(() => {
  props.heroId = 'pyromancer'
  props.stars = 1
  props.items = []
  props.role = undefined
  props.talent = undefined
  i18n.global.locale.value = 'en'

  app = createApp({ render: () => h(HeroDetails, props) }).use(i18n)
  app.mount(document.body.appendChild(document.createElement('div')))
})

afterEach(() => {
  app.unmount()
  document.body.innerHTML = ''
  i18n.global.locale.value = initialLocale
})

describe('hero detail bonuses', () => {
  it.each(['en', 'ru'] as const)('separates damage from the item bonus in %s', async (locale) => {
    i18n.global.locale.value = locale
    props.items = ['staff']
    await nextTick()

    expect(values('.ability > p')).toEqual([
      {
        base: '85',
        bonus: '+43',
        worse: false,
      },
    ])

    expect(document.querySelector('.ability > p')?.textContent).toContain(
      locale === 'en' ? 'area damage' : 'урона',
    )

    props.items = []
    await nextTick()

    expect(values('.ability > p')).toEqual([
      {
        base: '85',
        bonus: null,
        worse: false,
      },
    ])
  })

  it('uses healing power for healing and spell power for damage', async () => {
    props.heroId = 'warden'
    props.items = ['staff', 'chalice']
    await nextTick()

    expect(values('.ability > p').filter((value) => value.bonus)).toEqual([
      {
        base: '100',
        bonus: '+30',
        worse: false,
      },
      {
        base: '110',
        bonus: '+39',
        worse: false,
      },
    ])
  })

  it.each([
    ['oracle', 'chalice', '380', '+133'],
    ['stonewright', 'chalice', '50', '+18'],
    ['necromancer', 'staff', '260', '+130'],
  ] as const)('separates shield, repair and summon bonuses for %s', async (heroId, item, base, bonus) => {
    props.heroId = heroId
    props.items = [item]
    await nextTick()

    expect(values('.ability > p')).toContainEqual({
      base,
      bonus,
      worse: false,
    })
  })

  it('separates both mana gains and shows penalties with a minus sign', async () => {
    props.items = ['manaStone']
    await nextTick()

    expect(values('.mana').slice(0, 2)).toEqual([
      {
        base: '+15',
        bonus: '+7.5',
        worse: false,
      },
      {
        base: '+6',
        bonus: '+3',
        worse: false,
      },
    ])

    props.items = ['echoShard']
    await nextTick()

    expect(values('.mana').slice(0, 2)).toEqual([
      {
        base: '+15',
        bonus: '−3',
        worse: true,
      },
      {
        base: '+6',
        bonus: '−1.2',
        worse: true,
      },
    ])
  })

  it('keeps star and talent improvements in the base ability value', async () => {
    props.heroId = 'acolyte'
    props.stars = 2
    props.talent = 1
    props.items = ['chalice']
    await nextTick()

    expect(values('.ability > p').filter((value) => value.bonus)).toEqual([
      {
        base: '396',
        bonus: '+139',
        worse: false,
      },
    ])
  })

  it('separates bonuses on a borrowed ability and keeps undecided Mimicry readable', async () => {
    props.heroId = 'changeling'
    props.role = 'mage'
    props.items = ['staff']
    await nextTick()

    expect(document.querySelector('.ability > p')?.textContent).toContain('Chain Lightning')
    expect(values('.ability > p').some((value) => value.bonus !== null)).toBe(true)

    props.role = undefined
    await nextTick()
    expect(document.querySelector('.ability > p')?.textContent).toContain('Chain Lightning')
    expect(document.querySelector('.ability > p')?.textContent).not.toContain('{')
  })
})
