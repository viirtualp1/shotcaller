<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
import { computed } from 'vue'
import { HEROES } from '@/content/heroes'
import type { ItemId } from '@/content/ids'
import { ITEM_SLOTS, ITEMS } from '@/content/items'
import { heroSheet, type HeroLoadout } from '@/domain/roster/heroSheet'
import { useGameText } from '../../composables/useGameText'
import { useHeroStats } from '../../composables/useHeroStats'
import ItemIcon from './ItemIcon.vue'

/**
 * Dota-style item tooltip: name and cost up top, then what the item does. Given a hero, it also shows what the item
 * changes on them: one it is `equipped` on, or the one it would go to.
 */
const props = withDefaults(
  defineProps<{
    itemId: ItemId
    hint?: string
    heading?: boolean
    hero?: HeroLoadout | null
    equipped?: boolean
  }>(),
  {
    hint: undefined,
    heading: true,
    hero: null,
    equipped: false,
  },
)

const text = useGameText()
const { t } = text
const stats = useHeroStats()

const item = computed(() => ITEMS[props.itemId])
const passive = computed(() => Object.keys(item.value.effects).length > 0)

/** The hero's items without and with this one; null when there is no hero, or no free slot for the item. */
const loadouts = computed(() => {
  const hero = props.hero
  if (!hero) {
    return null
  }

  const items = hero.items ?? []
  if (props.equipped) {
    const index = items.indexOf(props.itemId)

    return index < 0
      ? null
      : {
          without: items.filter((_, i) => i !== index),
          with: items,
        }
  }

  return items.length < ITEM_SLOTS
    ? {
        without: items,
        with: [...items, props.itemId],
      }
    : null
})

const changes = computed(() => {
  const hero = props.hero
  const items = loadouts.value
  if (!hero || !items) {
    return []
  }

  return stats.changes(
    heroSheet({
      ...hero,
      items: items.without,
    }),
    heroSheet({
      ...hero,
      items: items.with,
    }),
    hero.stars,
  )
})
</script>

<template>
  <div class="item-details">
    <header v-if="heading" class="head">
      <ItemIcon :item-id="itemId" :size="42" />

      <span class="title">
        <strong class="name">{{ item.name }}</strong>
        <span class="cost"><span class="coin" /> {{ item.cost }}</span>
      </span>
    </header>

    <section class="block" :class="{ passive }">
      <span class="label">{{ passive ? t('itemTip.passive') : t('itemTip.bonus') }}</span>
      <p class="text">{{ text.itemDescription(itemId, hero ? HEROES[hero.heroId].role : undefined) }}</p>

      <p v-if="!hero && text.itemRoleDescription(itemId)" class="hint">
        {{ text.itemRoleDescription(itemId) }}
      </p>

      <p v-if="itemId === 'gloves' || itemId === 'staff' || itemId === 'manaStone'" class="hint">
        {{ t('itemTip.additive') }}
      </p>
    </section>

    <section v-if="hero && changes.length" class="block hero">
      <span class="label">{{
        t(equipped ? 'itemTip.onHero' : 'itemTip.forHero', { hero: text.heroName(hero.heroId) })
      }}</span>

      <dl class="changes">
        <div v-for="change in changes" :key="change.key" class="change">
          <dt>
            <component :is="change.icon" :size="13" aria-hidden="true" />
            {{ change.label }}
          </dt>

          <dd>
            <span class="before">{{ change.before }}</span>
            <ArrowRight :size="12" aria-hidden="true" />
            <strong :class="change.better ? 'better' : 'worse'">{{ change.after }}</strong>
          </dd>
        </div>
      </dl>
    </section>

    <p v-if="hint" class="hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.item-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 260px;
}

.head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--edge);
}

.title {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.name {
  font-size: 14px;
}

.cost {
  font-weight: 700;
  color: var(--gold);
  font-variant-numeric: tabular-nums;
}

.block {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 7px 9px;
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.04);
  border-left: 2px solid var(--heal);
}

.block.passive {
  border-left-color: var(--gold);
}

.block.hero {
  border-left-color: var(--edge-strong);
}

.label {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--chalk-dim);
}

.text {
  margin: 0;
  color: var(--chalk);
  white-space: pre-line;
}

.changes {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 2px 0 0;
}

.change {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.change dt {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--chalk-dim);
}

.change dd {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: var(--chalk-faint);
}

.before {
  color: var(--chalk-dim);
}

.better {
  color: var(--heal);
}

.worse {
  color: var(--theirs);
}

.hint {
  margin: 0;
  font-size: 11.5px;
  color: var(--chalk-faint);
}
</style>
