// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive, type App } from 'vue'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { HeroId, ItemId, RoleId, StarLevel, SynergyId } from '@/content/ids'
import type { TalentChoice } from '@/content/talents'
import HeroDetails from '@/ui/components/common/HeroDetails.vue'
import { i18n } from '@/ui/i18n'

const props = reactive({
  heroId: 'pyromancer' as HeroId,
  stars: 1 as StarLevel,
  items: [] as ItemId[],
  synergies: [] as SynergyId[],
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
  props.synergies = []
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
  it.each(['en', 'ru'] as const)('shows current lane synergies below the role in %s', async (locale) => {
    i18n.global.locale.value = locale
    props.synergies = ['setup', 'trilane']
    await nextTick()

    const role = document.querySelector('.passive')!
    const cards = [...document.querySelectorAll('.block.synergy')]
    expect(role.querySelector('.role-label')?.firstElementChild?.tagName.toLowerCase()).toBe('svg')
    expect(role.nextElementSibling).toBe(cards[0])
    expect(cards[0]?.nextElementSibling).toBe(cards[1])
    expect(cards[0]?.textContent).toContain('40%')
    expect(cards[1]?.textContent).toContain('25%')
    expect(cards[0]?.querySelector('.label')?.textContent).toContain(locale === 'en' ? 'Synergy:' : 'Связка:')

    props.synergies = ['arcane']
    await nextTick()
    expect(document.querySelectorAll('.block.synergy')).toHaveLength(1)
    expect(document.querySelector('.block.synergy p')?.textContent).toContain('20%')

    props.synergies = []
    await nextTick()
    expect(document.querySelector('.block.synergy')).toBeNull()
  })

  it.each(['en', 'ru'] as const)('gives turret values distinct meanings and icons in %s', async (locale) => {
    i18n.global.locale.value = locale
    props.heroId = 'engineer'
    await nextTick()

    const duration = document.querySelector('.ability-value.duration')!
    const health = document.querySelector('.ability-value.health')!
    const damage = document.querySelector('.ability-value.physicalDamage')!
    expect(duration.textContent).toBe('10')
    expect(health.textContent).toBe('320')
    expect(damage.textContent).toBe('28')
    expect(duration.querySelector('svg')).not.toBeNull()
    expect(health.querySelector('svg')).not.toBeNull()
    expect(damage.querySelector('svg')).not.toBeNull()
    expect(damage.getAttribute('title')).toBe(locale === 'en' ? 'Physical damage' : 'Физический урон')

    expect(document.querySelector('.ability > p')?.textContent).toContain(
      locale === 'en' ? 'physical damage per shot' : 'физического урона за выстрел',
    )
  })

  it('distinguishes both damage types in a single ability and keeps item bonuses typed', async () => {
    props.heroId = 'rogue'
    props.items = ['staff']
    await nextTick()

    expect(document.querySelector('.ability-value.physicalDamage .stat-value')?.textContent).toBe('70+21')
    expect(document.querySelector('.ability-value.magicalDamage .stat-value')?.textContent).toBe('25+8')
    expect(document.querySelector('.ability > p')?.textContent).toContain('physical damage')
    expect(document.querySelector('.ability > p')?.textContent).toContain('magical damage')

    props.heroId = 'changeling'
    props.role = 'carry'
    await nextTick()
    expect(document.querySelector('.ability-value.magicalDamage')).not.toBeNull()
    expect(document.querySelector('.ability-value.physicalDamage')).toBeNull()
  })

  it.each(['en', 'ru'] as const)('explains automatic casting and labels mana gains in %s', async (locale) => {
    i18n.global.locale.value = locale
    props.heroId = 'spearman'
    await nextTick()

    const rule = document.querySelector('.mana-rule')?.textContent
    const labels = [...document.querySelectorAll('.mana dt')].map((label) => label.textContent)

    expect(rule).toContain(locale === 'en' ? 'automatically once they have 80 mana' : 'когда накопит 80 маны')

    expect(labels[0]).toContain(locale === 'en' ? 'Mana per' : 'Мана за свою атаку')
    expect(labels[1]).toContain(locale === 'en' ? '10% max health lost' : 'потерю 10% макс. здоровья')
  })

  it.each(['en', 'ru'] as const)('shows Prayer’s talented target count in %s', async (locale) => {
    i18n.global.locale.value = locale
    props.heroId = 'acolyte'
    await nextTick()

    expect(document.querySelector('.ability > p')?.textContent).toContain(
      locale === 'en' ? 'up to 1 at a time' : 'Максимум целей — 1',
    )

    props.stars = 2
    props.talent = 0
    await nextTick()

    expect(document.querySelector('.ability > p')?.textContent).toContain(
      locale === 'en' ? 'up to 2 at a time' : 'Максимум целей — 2',
    )

    expect(document.querySelector('.ability > p')?.textContent).not.toContain('{')
  })

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
