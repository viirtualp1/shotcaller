<script setup lang="ts">
import {
  ArrowRight,
  Castle,
  Coins,
  Crown,
  Flag,
  Hourglass,
  Keyboard,
  Route,
  Scale,
  ShoppingBag,
  Sparkles,
  Star,
  Swords,
  TrendingUp,
  Trophy,
  Users,
  Wand2,
} from '@lucide/vue'
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { computed, type Component } from 'vue'
import { FACTION_TIERS, FACTIONS } from '@/content/factions'
import { HEROES } from '@/content/heroes'
import {
  FACTION_IDS,
  HERO_IDS,
  ROLE_IDS,
  SHOP_ITEM_IDS,
  SYNERGY_IDS,
  type FactionId,
  type HeroId,
} from '@/content/ids'
import { ITEMS } from '@/content/items'
import { DEFAULT_MODE, MODES } from '@/content/modes'
import { ROLES } from '@/content/roles'
import { ECONOMY, MATCH, MERGE_COUNT, STAR_POWER } from '@/content/rules'
import { SYNERGY_BY_ID } from '@/content/synergies'
import { cssColor } from '@/rendering/theme'
import { useGameText } from '../../composables/useGameText'
import { useModal } from '../../composables/useModal'
import { FACTION_ICONS, ROLE_ICONS } from '../../icons'
import HeroAvatar from '../common/HeroAvatar.vue'
import RecipeBook from '../common/RecipeBook.vue'
import ItemIcon from '../common/ItemIcon.vue'
import { useMatchStore } from '../../stores/match'
import { useMenuStore } from '../../stores/menu'
import { usePatchNotesStore } from '../../stores/patchNotes'

const open = defineModel<boolean>('open', { required: true })
const text = useGameText()
const { t } = text
const store = useMatchStore()
const menu = useMenuStore()
const notes = usePatchNotesStore()

function openOrdersGuide() {
  open.value = false
  menu.gameMenu = false
  notes.open('8.5')
}

useModal(open)

/** Round limit and income follow the mode of the match being played. */
const mode = computed(() => MODES[store.view?.mode ?? DEFAULT_MODE])

const STEPS: readonly { key: 'shop' | 'lanes' | 'fight' | 'grow'; icon: Component }[] = [
  {
    key: 'shop',
    icon: ShoppingBag,
  },
  {
    key: 'lanes',
    icon: Route,
  },
  {
    key: 'fight',
    icon: Swords,
  },
  {
    key: 'grow',
    icon: TrendingUp,
  },
]

const FACTION_MEMBERS = Object.fromEntries(
  FACTION_IDS.map((id) => [id, HERO_IDS.filter((hero) => HEROES[hero].faction === id)]),
) as Record<FactionId, HeroId[]>

const WIN_RULES = computed(
  (): readonly { key: string; icon: Component; params?: Record<string, number> }[] => [
    {
      key: mode.value.killScore ? 'score' : 'damage',
      icon: Castle,
      params: { kill: mode.value.killScore },
    },
    {
      key: 'draw',
      icon: Scale,
      params: { threshold: MATCH.drawThreshold },
    },
    {
      key: 'persist',
      icon: Hourglass,
    },
    {
      key: 'throne',
      icon: Crown,
    },
    {
      key: 'limit',
      icon: Trophy,
      params: { max: mode.value.maxRounds },
    },
  ],
)

const ECONOMY_RULES = computed((): readonly { key: string; params: Record<string, number> }[] => [
  {
    key: 'base',
    params: { gold: mode.value.baseIncome },
  },
  {
    key: 'interest',
    params: {
      per: ECONOMY.goldPerInterest,
      max: ECONOMY.maxInterest,
    },
  },
  {
    key: 'farm',
    params: {
      creeps: ECONOMY.creepKillsPerGold,
      max: ECONOMY.maxFarmIncome,
    },
  },
  {
    key: 'win',
    params: { gold: ECONOMY.winBonus },
  },
  {
    key: 'xp',
    params: { xp: ECONOMY.passiveXpPerRound },
  },
])

const HOTKEYS: readonly { key: string; label: string }[] = [
  {
    key: 'D',
    label: 'reroll',
  },
  {
    key: 'F',
    label: 'xp',
  },
  {
    key: 'E',
    label: 'sell',
  },
  {
    key: 'Esc',
    label: 'menu',
  },
  {
    key: 'Space',
    label: 'fight',
  },
  {
    key: 'F9',
    label: 'pause',
  },
]

const copies = Array.from({ length: MERGE_COUNT }, (_, i) => i)
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="overlay" />

      <DialogContent class="drawer" :aria-describedby="undefined">
        <header class="top">
          <DialogTitle class="hand title">{{ t('help.title') }}</DialogTitle>
          <DialogClose class="btn ghost">{{ t('help.close') }}</DialogClose>
        </header>

        <section>
          <h3 class="section-title"><Sparkles :size="15" /> {{ t('help.how') }}</h3>

          <ol class="steps">
            <li v-for="(step, i) in STEPS" :key="step.key" class="card step">
              <span class="badge">{{ i + 1 }}</span>
              <component :is="step.icon" :size="18" class="step-icon" />
              <p>{{ t(`start.steps.${step.key}`) }}</p>
            </li>
          </ol>
        </section>

        <section>
          <h3 class="section-title"><Route :size="15" /> {{ t('settings.laneOrders') }}</h3>
          <p>{{ t('help.ordersGuide') }}</p>

          <a href="/patches/8.5/" class="btn" @click.prevent="openOrdersGuide">
            <Route :size="16" /> {{ t('settings.laneOrdersAbout') }} <ArrowRight :size="15" />
          </a>
        </section>

        <section>
          <h3 class="section-title"><Trophy :size="15" /> {{ t('help.win') }}</h3>

          <ul class="rules">
            <li v-for="rule in WIN_RULES" :key="rule.key" class="rule">
              <component :is="rule.icon" :size="16" class="rule-icon" />
              <span>{{ t(`help.winRules.${rule.key}`, rule.params ?? {}) }}</span>
            </li>
          </ul>
        </section>

        <section>
          <h3 class="section-title"><Star :size="15" /> {{ t('help.stars') }}</h3>

          <div class="card merge">
            <span class="copies">
              <HeroAvatar v-for="i in copies" :key="i" hero-id="spearman" :stars="1" :size="30" />
            </span>

            <ArrowRight :size="18" class="arrow" />
            <HeroAvatar hero-id="spearman" :stars="2" :size="42" />
          </div>

          <ul class="rules">
            <li class="rule">
              <span class="stars-badge">★★</span>

              <span>{{
                t('help.starsRules.two', { count: MERGE_COUNT, power: text.number(STAR_POWER[2]) })
              }}</span>
            </li>

            <li class="rule">
              <span class="stars-badge">★★★</span>

              <span>{{
                t('help.starsRules.three', { count: MERGE_COUNT, power: text.number(STAR_POWER[3]) })
              }}</span>
            </li>

            <li class="rule">
              <ShoppingBag :size="16" class="rule-icon" />
              <span>{{ t('help.starsRules.auto') }}</span>
            </li>

            <li class="rule">
              <Wand2 :size="16" class="rule-icon" />
              <span>{{ t('help.starsRules.items') }}</span>
            </li>
          </ul>
        </section>

        <section>
          <h3 class="section-title"><Users :size="15" /> {{ t('help.roles') }}</h3>

          <ul class="grid">
            <li
              v-for="role in ROLE_IDS"
              :key="role"
              class="card role"
              :style="{ '--accent': cssColor(ROLES[role].color) }"
            >
              <span class="role-head">
                <span class="role-icon"><component :is="ROLE_ICONS[role]" :size="15" /></span>
                <strong>{{ text.roleName(role) }}</strong>
              </span>

              <p>{{ text.rolePassive(role) }}</p>
            </li>
          </ul>
        </section>

        <section>
          <h3 class="section-title"><Route :size="15" /> {{ t('help.synergies') }}</h3>

          <ul class="list">
            <li
              v-for="id in SYNERGY_IDS"
              :key="id"
              class="card synergy"
              :style="{ '--accent': cssColor(SYNERGY_BY_ID[id].color) }"
            >
              <span class="synergy-head">
                <span class="dot" aria-hidden="true" />
                <strong>{{ text.synergyName(id) }}</strong>
                <span class="need">{{ text.synergyNeed(id) }}</span>
              </span>

              <p>{{ text.synergyEffect(id) }}</p>
            </li>
          </ul>
        </section>

        <section>
          <h3 class="section-title"><Flag :size="15" /> {{ t('help.factions') }}</h3>
          <p>{{ t('help.factionRules') }}</p>

          <ul class="list">
            <li
              v-for="id in FACTION_IDS"
              :key="id"
              class="card synergy"
              :style="{ '--accent': cssColor(FACTIONS[id].color) }"
            >
              <span class="synergy-head">
                <component :is="FACTION_ICONS[id]" :size="15" class="faction-icon" aria-hidden="true" />
                <strong>{{ text.factionName(id) }}</strong>

                <span class="members">
                  <HeroAvatar v-for="hero in FACTION_MEMBERS[id]" :key="hero" :hero-id="hero" :size="22" />
                </span>
              </span>

              <p v-for="tier in FACTION_TIERS" :key="tier">
                <strong class="tier">{{ tier }}</strong> {{ text.factionEffect(id, tier) }}
              </p>
            </li>
          </ul>
        </section>

        <section>
          <h3 class="section-title"><Wand2 :size="15" /> {{ t('help.items') }}</h3>
          <p>{{ t('help.itemMerge') }}</p>

          <ul class="grid">
            <li v-for="id in SHOP_ITEM_IDS" :key="id" class="card item">
              <span class="item-head">
                <ItemIcon :item-id="id" :size="30" />

                <span class="item-title">
                  <strong>{{ text.itemName(id) }}</strong>
                  <span class="cost"><span class="coin" /> {{ ITEMS[id].cost }}</span>
                </span>
              </span>

              <p class="item-description">{{ text.itemDescription(id) }}</p>
            </li>
          </ul>
        </section>

        <section>
          <h3 class="section-title"><Coins :size="15" /> {{ t('help.economy') }}</h3>

          <ul class="rules">
            <li v-for="rule in ECONOMY_RULES" :key="rule.key" class="rule">
              <span class="coin" />
              <span>{{ t(`help.economyRules.${rule.key}`, rule.params) }}</span>
            </li>
          </ul>
        </section>

        <section>
          <h3 class="section-title"><Keyboard :size="15" /> {{ t('help.hotkeysTitle') }}</h3>

          <ul class="hotkeys">
            <li v-for="hotkey in HOTKEYS" :key="hotkey.key">
              <kbd>{{ hotkey.key === 'Space' ? t('help.space') : hotkey.key }}</kbd>
              <span>{{ t(`help.hotkeys.${hotkey.label}`) }}</span>
            </li>
          </ul>
        </section>

        <section>
          <h3>{{ t('legends.title') }}</h3>
          <p>{{ t('legends.help') }}</p>
        </section>

        <RecipeBook />
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(460px, 100vw);
  overflow-y: auto;
  padding: calc(18px + env(safe-area-inset-top, 0px)) 20px calc(24px + env(safe-area-inset-bottom, 0px));
  background: var(--panel);
  border-left: 1px solid var(--edge-strong);
  box-shadow: -20px 0 50px rgba(0, 0, 0, 0.45);
  z-index: 41;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 36px;
  line-height: 1;
}

section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--gold);
}

ol,
ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

p {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--chalk-dim);
}

.card {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 9px 11px;
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--edge);
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.step {
  display: grid;
  grid-template-columns: auto auto 1fr;
  align-items: center;
  gap: 10px;
}

.badge {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--gold);
  color: var(--ink);
  font-size: 12px;
  font-weight: 800;
}

.step-icon {
  color: var(--chalk);
}

.rules {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.rule {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13px;
  color: var(--chalk);
}

.rule-icon {
  flex: none;
  margin-top: 1px;
  color: var(--gold);
}

.rule .coin {
  flex: none;
  margin-top: 3px;
}

.stars-badge {
  flex: none;
  min-width: 40px;
  color: var(--gold);
  font-weight: 800;
  letter-spacing: -0.05em;
}

.merge {
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 14px 11px 20px;
}

.copies {
  display: flex;
  gap: 8px;
}

.arrow {
  color: var(--gold);
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.role,
.synergy {
  border-left: 3px solid var(--accent);
}

.role-head,
.synergy-head,
.item-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.role-icon {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent) 22%, transparent);
  color: var(--accent);
}

.role strong {
  color: var(--accent);
}

.faction-icon {
  color: var(--accent);
}

.members {
  display: flex;
  gap: 3px;
  margin-left: auto;
}

.tier {
  display: inline-grid;
  place-items: center;
  width: 18px;
  height: 18px;
  margin-right: 4px;
  border-radius: 999px;
  border: 1px solid var(--accent);
  color: var(--accent);
  font-size: 11px;
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent);
}

.need {
  margin-left: auto;
  padding: 1px 8px;
  border-radius: 999px;
  border: 1px solid var(--edge-strong);
  font-size: 11px;
  color: var(--chalk-dim);
  white-space: nowrap;
}

.item-title {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.item-title strong {
  font-size: 12.5px;
}

.item-description {
  white-space: pre-line;
}

.cost {
  font-size: 12px;
  font-weight: 700;
  color: var(--gold);
}

.hotkeys {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 14px;
}

.hotkeys li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.hotkeys kbd {
  min-width: 34px;
  text-align: center;
}
</style>
