<script setup lang="ts">
import { ArrowRightLeft, ArrowUp, Flame, Package, Play, Plus } from '@lucide/vue'
import { computed, ref } from 'vue'
import { HEROES } from '@/content/heroes'
import type { LaneId } from '@/content/ids'
import { MODES } from '@/content/modes'
import type { MatchRecord } from '@/domain/profile/Profile'
import { lineupSteps, turningRound } from '@/domain/profile/dossier'
import { replayAvailability } from '@/domain/replay/setup'
import { useGameText } from '../../composables/useGameText'
import { useReplayStore } from '../../stores/replay'
import HeroAvatar from '../common/HeroAvatar.vue'
import ItemIcon from '../common/ItemIcon.vue'
import MatchDetails from './MatchDetails.vue'

type Tab = 'rounds' | 'stats'

/**
 * A match in full, for our own history and a coach's alike. Rounds first: a strip of every round, the turning one
 * marked, and the chosen round's lineups by lane, ours and theirs, with a replay. The usual stats sit in a second tab.
 */
const props = defineProps<{
  match: MatchRecord
  /** The match dialog puts Watch beside the verdict, so the stats tab keeps its copy hidden. */
  hideWatch?: boolean
}>()

const replay = useReplayStore()
const text = useGameText()
const { t } = text

const tab = ref<Tab>('rounds')
const picked = ref<number | null>(null)

const steps = computed(() => lineupSteps(props.match))
const turning = computed(() => turningRound(props.match))
const availability = computed(() => replayAvailability(props.match))
const round = computed(() => picked.value ?? turning.value ?? steps.value.length)
const step = computed(() => steps.value[round.value - 1] ?? null)
const lanes = computed<readonly LaneId[]>(() => MODES[props.match.mode].lanes)

/** The other side in the chosen round, by lane. */
const opponents = computed(() => props.match.roundLineups[round.value - 1]?.[1] ?? [])

function watchRound() {
  if (availability.value !== 'ready') {
    return
  }

  replay.open(props.match)
  replay.selectRound(round.value)
}
</script>

<template>
  <div class="analysis">
    <div v-if="steps.length" class="tabs" role="tablist">
      <button type="button" role="tab" class="tab" :aria-selected="tab === 'rounds'" @click="tab = 'rounds'">
        {{ t('dossier.tabRounds') }}
      </button>

      <button type="button" role="tab" class="tab" :aria-selected="tab === 'stats'" @click="tab = 'stats'">
        {{ t('dossier.tabStats') }}
      </button>
    </div>

    <template v-if="steps.length && tab === 'rounds'">
      <ol class="strip" :aria-label="t('dossier.rounds')">
        <li v-for="item in steps" :key="item.round">
          <button
            type="button"
            class="pip"
            :class="[item.verdict, { chosen: item.round === round, turning: item.round === turning }]"
            :aria-pressed="item.round === round"
            :title="item.round === turning ? t('dossier.turningHint') : undefined"
            @click="picked = item.round"
          >
            <Flame v-if="item.round === turning" :size="11" class="flame" aria-hidden="true" />
            {{ item.round }}
          </button>
        </li>
      </ol>

      <article v-if="step" class="round">
        <header class="round-head">
          <strong>{{ t('dossier.roundLineup', { n: step.round }) }}</strong>

          <span v-if="step.verdict" class="verdict" :class="step.verdict">{{
            t(`result.${step.verdict}`)
          }}</span>

          <span v-if="step.round === turning" class="chip" :title="t('dossier.turningHint')">
            <Flame :size="12" /> {{ t('dossier.turning') }}
          </span>

          <button v-if="availability === 'ready'" type="button" class="btn small watch" @click="watchRound">
            <Play :size="13" /> {{ t('dossier.watchRound', { n: step.round }) }}
          </button>

          <small v-else-if="availability === 'stale'" class="watch">{{ t('dossier.replayStale') }}</small>
        </header>

        <div class="lanes">
          <section v-for="lane in lanes" :key="lane" class="lane">
            <h4>{{ t(`lanes.${lane}`) }}</h4>

            <div
              v-for="(hero, index) in step.heroes.filter((one) => one.lane === lane)"
              :key="index"
              class="hero"
            >
              <span class="portrait">
                <HeroAvatar :hero-id="hero.heroId" :stars="hero.stars" :size="34" />

                <span v-if="hero.added" class="badge new" :title="t('dossier.added')"
                  ><Plus :size="10"
                /></span>

                <span v-else-if="hero.upgraded" class="badge up" :title="t('dossier.upgraded')"
                  ><ArrowUp :size="10"
                /></span>

                <span v-else-if="hero.moved" class="badge moved" :title="t('dossier.moved')"
                  ><ArrowRightLeft :size="10"
                /></span>

                <span v-else-if="hero.itemsChanged" class="badge moved" :title="t('dossier.itemsChanged')"
                  ><Package :size="10"
                /></span>
              </span>

              <span class="hero-text">
                <strong>{{ HEROES[hero.heroId].name }}</strong>

                <span v-if="hero.items.length" class="items">
                  <ItemIcon
                    v-for="(item, i) in hero.items"
                    :key="i"
                    :item-id="item"
                    :size="18"
                    :title="text.itemName(item)"
                  />
                </span>
              </span>
            </div>

            <div v-if="opponents.some((one) => one[2] === lane)" class="against">
              <small>vs</small>

              <HeroAvatar
                v-for="(pick, index) in opponents.filter((one) => one[2] === lane)"
                :key="index"
                :hero-id="pick[0]"
                :stars="pick[1]"
                :team="1"
                :size="22"
                :title="HEROES[pick[0]].name"
              />
            </div>
          </section>
        </div>
      </article>
    </template>

    <MatchDetails v-else :match="match" :hide-watch="hideWatch" />
  </div>
</template>

<style scoped>
/* One column no wider than the dialog, so the hero tables scroll inside instead of stretching it. */
.analysis {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
}

.tabs {
  display: inline-flex;
  justify-self: start;
  gap: 2px;
  padding: 3px;
  border-radius: var(--radius);
  background: rgba(0, 0, 0, 0.25);
}

.tab {
  min-height: 32px;
  padding: 0 14px;
  border: 0;
  border-radius: var(--radius);
  background: transparent;
  color: var(--chalk-dim);
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
}

.tab[aria-selected='true'] {
  background: var(--gold);
  color: var(--ink);
}

/* Every round at a glance: its number on its result's colour; the turning round wears a flame. */
.strip {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pip {
  --verdict: var(--chalk-faint);
  position: relative;
  display: grid;
  place-items: center;
  min-width: 34px;
  height: 34px;
  padding: 0 6px;
  border: 1px solid color-mix(in srgb, var(--verdict) 55%, transparent);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--verdict) 18%, transparent);
  color: var(--chalk);
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}

.pip.win {
  --verdict: var(--heal);
}

.pip.loss {
  --verdict: var(--theirs);
}

.pip.turning {
  border-color: var(--gold);
}

.pip.chosen {
  outline: 2px solid var(--gold);
  outline-offset: 1px;
}

.flame {
  position: absolute;
  top: -6px;
  right: -5px;
  color: var(--gold);
}

.round {
  display: grid;
  gap: 14px;
  padding: 14px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.02);
}

.round-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
  font-size: 14px;
}

.verdict {
  font-size: 12px;
  font-weight: 700;
  color: var(--chalk-dim);
}

.verdict.win {
  color: var(--heal);
}

.verdict.loss {
  color: var(--theirs);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border: 1px solid rgba(244, 197, 91, 0.5);
  border-radius: var(--radius);
  color: var(--gold);
  font-size: 12px;
  font-weight: 700;
}

.watch {
  margin-left: auto;
}

small.watch {
  font-size: 12px;
  color: var(--chalk-faint);
}

/* One column per lane: our heroes with their items, and below them who they faced. */
.lanes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}

.lane {
  display: grid;
  align-content: start;
  gap: 8px;
  padding: 10px;
  border-radius: var(--radius);
  background: rgba(0, 0, 0, 0.18);
}

h4 {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--chalk-faint);
}

.hero {
  display: flex;
  align-items: center;
  gap: 10px;
}

.portrait {
  position: relative;
  display: grid;
  flex: none;
}

/* Status badges keep their round shape, like the portraits they sit on. */
.badge {
  position: absolute;
  top: -3px;
  right: -4px;
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  color: var(--ink);
}

.badge.new {
  background: var(--heal);
}

.badge.up {
  background: var(--gold);
}

.badge.moved {
  background: var(--chalk-dim);
}

.hero-text {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.hero-text strong {
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.items {
  display: flex;
  gap: 3px;
}

.against {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  min-height: 22px;
  padding-top: 8px;
  border-top: 1px dashed var(--edge);
}

.against small {
  margin-right: 2px;
  font-size: 11px;
  font-weight: 700;
  color: var(--theirs);
}
</style>
