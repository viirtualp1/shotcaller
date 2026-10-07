// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive, type App } from 'vue'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { HeroId, RoleId, StarLevel } from '@/content/ids'
import { HEROES } from '@/content/heroes'
import { heroSheet } from '@/domain/roster/heroSheet'
import AbilityTooltip from '@/ui/components/roster/AbilityTooltip.vue'
import { i18n } from '@/ui/i18n'

const props = reactive({
  heroId: 'shaman' as HeroId,
  stars: 1 as StarLevel,
  role: undefined as RoleId | undefined,
})

const initialLocale = i18n.global.locale.value
let app: App

function rows() {
  return [...document.querySelectorAll('.values > div')].map((row) => [
    row.querySelector('dt')?.textContent?.trim(),
    row.querySelector('dd')?.textContent?.replace(/\s+/g, ''),
  ])
}

beforeEach(() => {
  props.heroId = 'shaman'
  props.stars = 1
  props.role = undefined
  i18n.global.locale.value = 'en'

  app = createApp({
    render: () =>
      h(AbilityTooltip, {
        ...props,
        sheet: heroSheet({
          heroId: props.heroId,
          stars: props.stars,
          ...(props.role ? { role: props.role } : {}),
        }),
      }),
  }).use(i18n)

  app.mount(document.body.appendChild(document.createElement('div')))
})

afterEach(() => {
  app.unmount()
  document.body.innerHTML = ''
  i18n.global.locale.value = initialLocale
})

describe('ability tooltip', () => {
  it.each(['en', 'ru'] as const)('lists every number of the ability on its own row in %s', async (locale) => {
    i18n.global.locale.value = locale
    await nextTick()

    expect(document.querySelector('.tip-name')?.textContent).toBe('Chain Lightning')

    expect(document.querySelector('.meta')?.textContent).toContain(locale === 'en' ? 'Magical' : 'Магический')
    expect(document.querySelector('.body')?.textContent).not.toMatch(/\d/)

    expect(rows()).toEqual([
      [locale === 'en' ? 'Magical damage:' : 'Магический урон:', '110'],
      [locale === 'en' ? 'Targets:' : 'Целей:', '4'],
      [locale === 'en' ? 'Less damage per hit:' : 'Ослабление за удар:', '20%'],
    ])

    expect(document.querySelector('.tip-foot')?.textContent).toContain(
      locale === 'en' ? 'Full in 6 attacks' : 'Копится за 6 атак',
    )
  })

  it('puts units on durations and splits the lane orders of the banner', async () => {
    props.heroId = (Object.keys(HEROES) as HeroId[]).find((id) => HEROES[id].ability === 'standard')!
    await nextTick()

    const labels = rows().map(([label]) => label)
    expect(labels).toContain('Push: attack speed:')
    expect(labels).toContain('No order: heroes take less:')
    expect(rows().find(([label]) => label === 'Lifetime:')?.[1]).toMatch(/^\d+(\.\d+)?s$/)
    expect(rows().find(([label]) => label === 'Stun:')?.[1]).toMatch(/s$/)
  })

  it('waits for a role before listing the numbers of a borrowed ability', async () => {
    props.heroId = (Object.keys(HEROES) as HeroId[]).find((id) => HEROES[id].ability === 'mimic')!
    await nextTick()

    expect(document.querySelector('.values')).toBeNull()
    expect(document.querySelector('.meta')).toBeNull()

    props.role = 'mage'
    await nextTick()

    expect(rows()[0]?.[0]).toBe('Magical damage:')
  })
})
