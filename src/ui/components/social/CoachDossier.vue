<script setup lang="ts">
import { FlaskConical } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import type { CoachDossier } from '@/application/social/friends'
import { HEROES } from '@/content/heroes'
import { LANE_IDS, type HeroId, type LaneId, type SynergyId } from '@/content/ids'
import { MAPS } from '@/content/map'
import { ROLES } from '@/content/roles'
import { BATTLE } from '@/content/rules'
import { SYNERGY_BY_ID } from '@/content/synergies'
import {
  buildHeroes,
  heroBuild,
  heroPool,
  roleShares,
  signatureLineup,
  styleTags,
  synergyLines,
  type StyleTag,
} from '@/domain/profile/dossier'
import { cssColor } from '@/rendering/theme'
import { useGameText } from '../../composables/useGameText'
import { ROLE_ICONS } from '../../icons'
import { useFriendsStore } from '../../stores/friends'
import { useLeaderboardStore } from '../../stores/leaderboard'
import { useMatchStore } from '../../stores/match'
import { useProfileStore } from '../../stores/profile'
import HeroMastery from '../profile/HeroMastery.vue'
import HeroAvatar from '../common/HeroAvatar.vue'
import ItemIcon from '../common/ItemIcon.vue'
import ModeMap from '../modes/ModeMap.vue'

/** Heroes in the list beside the build: the pool, then anyone else fielded lately. */
const LIST_SIZE = 8

/**
 * How a coach plays: their usual lineup, roles and synergies, and the heroes they win with, each with the build to
 * try in training. Lays itself out by its own width, so the same dossier fits a wide window and a phone sheet.
 */
const props = defineProps<{ dossier: CoachDossier }>()

const text = useGameText()
const { t } = text
const profile = useProfileStore()
const match = useMatchStore()
const friends = useFriendsStore()
const leaderboard = useLeaderboardStore()

const picked = ref<HeroId | null>(null)
const comparing = ref(false)

const traits = computed(() => styleTags(props.dossier))
const signature = computed(() => signatureLineup(props.dossier.recent))
const roles = computed(() => roleShares(props.dossier.heroes).filter((role) => role.matches > 0))
const synergies = computed(() => synergyLines(props.dossier.synergies))

const pool = computed(
  () => new Map(heroPool(props.dossier.heroes, LIST_SIZE).map((hero) => [hero.heroId, hero])),
)

const heroes = computed(() =>
  [...new Set<HeroId>([...pool.value.keys(), ...buildHeroes(props.dossier)])].slice(0, LIST_SIZE),
)

const selected = computed(() => picked.value ?? heroes.value[0] ?? null)
const build = computed(() => (selected.value ? heroBuild(props.dossier.recent, selected.value) : null))
const ownMatches = computed(() => profile.profile.totals.matches)

const ownWinRate = computed(() =>
  ownMatches.value ? Math.round((profile.profile.totals.wins / ownMatches.value) * 100) : 0,
)

const theirWinRate = computed(() => {
  const totals = props.dossier.totals
  return totals?.matches ? Math.round((totals.wins / totals.matches) * 100) : 0
})

const canTrain = computed(() => !match.view || Boolean(match.view.sandbox))

function trait(tag: StyleTag) {
  if (tag.kind === 'synergy') {
    return t('dossier.tags.synergy', {
      name: t(`synergies.${tag.id}.name`),
      rate: tag.winRate,
    })
  }

  if (tag.kind === 'role') {
    return t('dossier.tags.role', { name: t(`roles.${tag.role}.name`) })
  }

  return t(`dossier.tags.${tag.kind}`, { ...tag })
}

/** Where a lane's heroes sit on the small map: around the lane's label, side by side. */
function position(lane: LaneId, index: number, count: number) {
  const point = MAPS[signature.value!.mode].laneLabels[lane] ?? [BATTLE.worldSize / 2, BATTLE.worldSize / 2]

  return {
    left: `${(point[0] / BATTLE.worldSize) * 100}%`,
    top: `${(point[1] / BATTLE.worldSize) * 100}%`,
    translate: `calc(-50% + ${(index - (count - 1) / 2) * 22}px) -50%`,
  }
}

/** The viewer's own role mix, for the thin bar under the coach's. */
const ownRoles = computed(
  () => new Map(roleShares(profile.profile.heroes).map((role) => [role.role, role.share])),
)

function ownSynergy(id: SynergyId) {
  const record = profile.profile.synergies[id]
  return record?.matches ? Math.round((record.wins / record.matches) * 100) : null
}

function ownRate(heroId: HeroId) {
  const record = profile.profile.heroes[heroId]
  return record?.matches ? Math.round((record.wins / record.matches) * 100) : null
}

function train() {
  if (!build.value || !canTrain.value) {
    return
  }

  const mode =
    props.dossier.recent.find((record) => record.lineup.some((hero) => hero.heroId === build.value!.heroId))
      ?.mode ?? 'threeLanes'

  if (match.tryBuild(mode, build.value)) {
    friends.closeProfile()
    friends.open = false
    profile.close()
    leaderboard.close()
  }
}

watch(
  () => props.dossier.id,
  () => {
    picked.value = null
    comparing.value = false
  },
)
</script>

<template>
  <div class="dossier">
    <div v-if="traits.length || ownMatches > 0" class="topbar">
      <ul class="traits" :aria-label="t('dossier.playstyle')">
        <li v-for="(tag, index) in traits" :key="index">{{ trait(tag) }}</li>
      </ul>

      <label v-if="ownMatches > 0" class="compare">
        <input v-model="comparing" type="checkbox" role="switch" />
        <span class="switch" aria-hidden="true" />
        {{ t('dossier.compare') }}
      </label>
    </div>

    <p v-if="comparing" class="compare-line">
      {{ t('coach.winRate') }}: <b class="theirs">{{ theirWinRate }}%</b>
      <span class="vs">·</span>
      {{ t('dossier.ours') }} <b class="ours">{{ ownWinRate }}%</b>
      <span class="legend"><i class="mark" aria-hidden="true" /> {{ t('dossier.compareLegend') }}</span>
    </p>

    <div class="top">
      <section class="panel lineup-panel">
        <header class="panel-head">
          <h3>{{ t('dossier.lineup') }}</h3>

          <small v-if="signature"
            >{{ t(`modes.${signature.mode}.name`) }} ·
            {{ t('dossier.recentSample', { n: signature.matches }) }}</small
          >
        </header>

        <div v-if="signature" class="lineup">
          <div class="map" aria-hidden="true">
            <ModeMap :mode="signature.mode" :size="200" />

            <template v-for="(laneHeroes, lane) in signature.lanes" :key="lane">
              <span
                v-for="(hero, index) in laneHeroes"
                :key="hero.heroId"
                class="map-pick"
                :style="position(lane, index, laneHeroes?.length ?? 1)"
              >
                <HeroAvatar :hero-id="hero.heroId" :stars="hero.stars" :size="22" />
              </span>
            </template>
          </div>

          <ul class="lanes">
            <template v-for="lane in LANE_IDS" :key="lane">
              <li v-if="signature.lanes[lane]?.length" class="lane">
                <span class="lane-name">{{ t(`lanes.${lane}`) }}</span>

                <button
                  v-for="hero in signature.lanes[lane]"
                  :key="hero.heroId"
                  type="button"
                  class="lane-hero"
                  :class="{ chosen: selected === hero.heroId }"
                  @click="picked = hero.heroId"
                >
                  <HeroAvatar :hero-id="hero.heroId" :stars="hero.stars" :size="28" />

                  <span class="lane-hero-name">{{ HEROES[hero.heroId].name }}</span>

                  <span class="lane-items">
                    <ItemIcon
                      v-for="item in hero.items"
                      :key="item"
                      :item-id="item"
                      :size="20"
                      :title="text.itemName(item)"
                    />
                  </span>
                </button>
              </li>
            </template>
          </ul>
        </div>

        <p v-else class="muted">{{ t('dossier.discovering') }}</p>
      </section>

      <section class="panel style-panel">
        <div class="block">
          <h3>{{ t('dossier.roles') }}</h3>

          <template v-if="roles.length">
            <div class="role-bar" aria-hidden="true">
              <span
                v-for="role in roles"
                :key="role.role"
                :style="{ flexGrow: role.share, background: cssColor(ROLES[role.role].color) }"
              />
            </div>

            <div v-if="comparing" class="role-bar ours" aria-hidden="true">
              <template v-for="[role, share] in ownRoles" :key="role">
                <span
                  v-if="share > 0"
                  :style="{ flexGrow: share, background: cssColor(ROLES[role].color) }"
                />
              </template>
            </div>

            <ul class="role-legend">
              <li v-for="role in roles" :key="role.role">
                <component
                  :is="ROLE_ICONS[role.role]"
                  :size="14"
                  :style="{ color: cssColor(ROLES[role.role].color) }"
                  aria-hidden="true"
                />

                <span>{{ t(`roles.${role.role}.name`) }}</span>
                <b>{{ Math.round(role.share * 100) }}%</b>

                <small v-if="comparing" class="ours"
                  >{{ Math.round((ownRoles.get(role.role) ?? 0) * 100) }}%</small
                >
              </li>
            </ul>
          </template>

          <p v-else class="muted">{{ t('dossier.noPool') }}</p>
        </div>

        <div class="block">
          <h3>{{ t('dossier.synergies') }}</h3>

          <ul v-if="synergies.length" class="synergies">
            <li v-for="line in synergies" :key="line.id">
              <i
                class="dot"
                :style="{ background: cssColor(SYNERGY_BY_ID[line.id].color) }"
                aria-hidden="true"
              />

              <span class="synergy-name">{{ t(`synergies.${line.id}.name`) }}</span>

              <span class="meter" aria-hidden="true"
                ><span :style="{ width: `${line.winRate}%` }" />

                <i
                  v-if="comparing && ownSynergy(line.id) !== null"
                  class="mark"
                  :style="{ left: `${ownSynergy(line.id)}%` }"
              /></span>

              <b>{{ line.winRate }}%</b>

              <small v-if="comparing" class="ours">{{
                ownSynergy(line.id) === null ? '—' : `${ownSynergy(line.id)}%`
              }}</small>

              <small v-else>{{ t('dossier.sample', { n: line.matches }) }}</small>
            </li>
          </ul>

          <p v-else class="muted">{{ t('dossier.noSynergies') }}</p>
        </div>
      </section>
    </div>

    <section class="panel heroes-panel">
      <header class="panel-head">
        <h3>{{ t('dossier.heroes') }}</h3>
      </header>

      <div v-if="heroes.length" class="heroes">
        <ul class="pool">
          <li v-for="heroId in heroes" :key="heroId">
            <button
              type="button"
              class="pool-hero"
              :class="{ chosen: selected === heroId }"
              :aria-pressed="selected === heroId"
              @click="picked = heroId"
            >
              <HeroAvatar :hero-id="heroId" :stars="pool.get(heroId)?.bestStars ?? 1" :size="34" />

              <span class="pool-text">
                <strong>{{ HEROES[heroId].name }}</strong>
                <HeroMastery :record="dossier.heroes[heroId]" />

                <small v-if="pool.get(heroId)">{{
                  t('dossier.heroRecord', {
                    n: pool.get(heroId)!.matches,
                    kills: pool.get(heroId)!.kills,
                    deaths: pool.get(heroId)!.deaths,
                  })
                }}</small>

                <small v-else>{{ t('dossier.lately') }}</small>
              </span>

              <span v-if="pool.get(heroId)" class="pool-rates">
                <span class="rate">
                  <span class="meter"
                    ><span :style="{ width: `${pool.get(heroId)!.winRate}%` }" />

                    <i
                      v-if="comparing && ownRate(heroId) !== null"
                      class="mark"
                      :style="{ left: `${ownRate(heroId)}%` }"
                  /></span>

                  <b>{{ pool.get(heroId)!.winRate }}%</b>
                </span>

                <small v-if="comparing" class="ours own-rate">{{
                  ownRate(heroId) === null
                    ? t('dossier.notPlayed')
                    : `${t('dossier.ours')}: ${ownRate(heroId)}%`
                }}</small>
              </span>
            </button>
          </li>
        </ul>

        <article class="build" aria-live="polite">
          <template v-if="build">
            <header class="build-head">
              <HeroAvatar :hero-id="build.heroId" :stars="build.stars" :size="52" />

              <div>
                <p class="eyebrow">{{ t('dossier.builds') }}</p>
                <strong class="build-name">{{ HEROES[build.heroId].name }}</strong>

                <span class="facts">
                  <span v-if="build.lane">{{ t(`lanes.${build.lane}`) }}</span>
                  <span>{{ t('dossier.buildSample', { n: build.appearances }) }}</span>
                  <span>{{ t('dossier.buildWins', { n: build.wins }) }}</span>
                </span>
              </div>
            </header>

            <ul v-if="build.items.length" class="build-items">
              <li v-for="{ item, count } in build.items.slice(0, 4)" :key="item">
                <ItemIcon :item-id="item" :size="30" />

                <span class="item-text">
                  <strong>{{ text.itemName(item) }}</strong>

                  <span class="meter"
                    ><span :style="{ width: `${(count / build.appearances) * 100}%` }"
                  /></span>
                </span>

                <small>{{ t('dossier.itemShare', { count, n: build.appearances }) }}</small>
              </li>
            </ul>

            <p v-else class="muted">{{ t('dossier.noItems') }}</p>

            <footer class="build-actions">
              <button type="button" class="btn primary" :disabled="!canTrain" @click="train">
                <FlaskConical :size="16" /> {{ t('dossier.tryBuild') }}
              </button>

              <small>{{ canTrain ? t('dossier.tryHint') : t('dossier.finishMatch') }}</small>
            </footer>
          </template>

          <p v-else class="muted">{{ t('dossier.noBuild') }}</p>
        </article>
      </div>

      <p v-else class="muted">{{ t('dossier.noPool') }}</p>
    </section>
  </div>
</template>

<style scoped>
.dossier {
  display: flex;
  flex-direction: column;
  gap: 14px;
  container-type: inline-size;
}

.traits {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.traits li {
  padding: 4px 10px;
  border: 1px solid rgba(244, 197, 91, 0.4);
  border-radius: var(--radius);
  background: rgba(244, 197, 91, 0.08);
  color: var(--gold);
  font-size: 12px;
  font-weight: 700;
}

.top {
  display: grid;
  gap: 14px;
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.02);
}

.panel-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 12px;
}

h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--chalk-dim);
}

small,
.muted {
  font-size: 12px;
  color: var(--chalk-faint);
}

.muted {
  margin: 0;
  line-height: 1.5;
}

.eyebrow {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--gold);
}

.meter {
  position: relative;
  display: block;
  height: 4px;
  border-radius: 999px;
  background: var(--edge);
}

/* The viewer's own number on the same scale: a gold tick, so comparing adds no rows. */
.mark {
  position: absolute;
  top: -3px;
  width: 3px;
  height: 10px;
  border-radius: 2px;
  background: var(--gold);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.6);
  translate: -50% 0;
}

.meter > span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--heal);
}

/* Signature lineup: a small map to see the shape, and the lanes listed beside it to read heroes and items. */
.lineup {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  align-items: center;
  gap: 18px;
}

.map {
  position: relative;
  width: 200px;
  aspect-ratio: 1;
}

.map :deep(.mode-map) {
  width: 100%;
  height: 100%;
  opacity: 0.85;
}

.map-pick {
  position: absolute;
  filter: drop-shadow(0 2px 3px #0008);
}

.lanes {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.lane {
  display: grid;
  gap: 4px;
}

.lane-name {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--chalk-faint);
}

.lane-hero {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 4px 8px;
  border: 1px solid transparent;
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.03);
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.lane-hero:hover {
  border-color: var(--edge-strong);
}

.lane-hero.chosen {
  border-color: rgba(244, 197, 91, 0.6);
}

.lane-hero-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lane-items {
  display: flex;
  gap: 4px;
}

/* Roles and synergies share a panel: both are short, and side by side they leave no empty space. */
.style-panel {
  gap: 18px;
}

.block {
  display: grid;
  gap: 10px;
}

.role-bar {
  display: flex;
  gap: 2px;
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
}

.role-bar span {
  flex-basis: 0;
  min-width: 4px;
}

.role-legend {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.role-legend li {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 12px;
  color: var(--chalk-dim);
}

.role-legend span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role-legend b {
  margin-left: auto;
  color: var(--chalk);
}

.synergies {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.synergies li {
  display: grid;
  grid-template-columns: auto minmax(80px, 1fr) minmax(60px, 1.2fr) 40px auto;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.synergy-name {
  overflow: hidden;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.synergies b {
  text-align: right;
  color: var(--heal);
}

/* Heroes and builds: pick a hero on the left, read and try its build on the right. */
.compare {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  color: var(--chalk-dim);
  cursor: pointer;
}

.compare input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

/* A switch keeps its pill track and round knob. */
.switch {
  position: relative;
  width: 30px;
  height: 18px;
  border-radius: 999px;
  background: var(--edge-strong);
  transition: background 0.15s;
}

.switch::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--chalk);
  transition: translate 0.15s;
}

.compare input:checked + .switch {
  background: var(--gold);
}

.compare input:checked + .switch::after {
  translate: 12px 0;
  background: var(--ink);
}

.compare input:focus-visible + .switch {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}

.topbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
}

.legend {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 14px;
  font-size: 12px;
  color: var(--chalk-faint);
}

.legend .mark {
  position: static;
  translate: none;
}

.role-bar.ours {
  height: 5px;
  margin-top: -4px;
  opacity: 0.75;
}

.compare-line {
  margin: -4px 0 0;
  font-size: 13px;
  color: var(--chalk-dim);
}

.compare-line .vs {
  margin: 0 6px;
}

.theirs {
  color: var(--heal);
}

.ours {
  color: var(--gold);
}

.heroes {
  display: grid;
  gap: 14px;
}

.pool {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pool-hero {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(90px, 0.8fr);
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 52px;
  padding: 8px 10px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.02);
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.pool-hero:hover {
  border-color: var(--edge-strong);
}

.pool-hero.chosen {
  border-color: var(--gold);
  background: rgba(244, 197, 91, 0.06);
}

.pool-text {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.pool-text strong {
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pool-rates {
  display: grid;
  gap: 5px;
}

.rate {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 38px;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.rate b {
  text-align: right;
}

.own-rate {
  font-size: 11px;
  text-align: right;
}

.build {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  padding: 16px;
  border: 1px solid rgba(244, 197, 91, 0.3);
  border-radius: var(--radius);
  background: linear-gradient(160deg, rgba(244, 197, 91, 0.08), transparent 60%);
}

.build-head {
  display: flex;
  align-items: center;
  gap: 14px;
}

.build-name {
  display: block;
  margin: 2px 0 6px;
  font-size: 20px;
}

.facts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.facts span {
  padding: 2px 8px;
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.05);
  font-size: 12px;
  color: var(--chalk-dim);
}

.build-items {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.build-items li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}

.item-text {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.item-text strong {
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-text .meter > span {
  background: var(--gold);
}

.build-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--edge);
}

button:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}

/* Wide dossier: lineup beside roles and synergies, the hero list beside its build. */
@container (min-width: 820px) {
  .top {
    grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  }

  .heroes {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: start;
  }

  .build {
    position: sticky;
    top: 0;
  }
}

@container (max-width: 520px) {
  .lineup {
    grid-template-columns: 1fr;
    justify-items: center;
  }

  .lanes {
    width: 100%;
  }

  .role-legend {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .synergies li {
    grid-template-columns: auto minmax(0, 1fr) 70px 38px;
  }

  .synergies li small {
    display: none;
  }

  .pool-hero {
    grid-template-columns: auto minmax(0, 1fr) 90px;
  }
}
</style>
