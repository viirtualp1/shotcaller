<script setup lang="ts">
import { Check, LockKeyhole, Play, Target, Trophy } from '@lucide/vue'
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  TabsContent,
  TabsList,
  TabsRoot,
  TabsTrigger,
} from 'reka-ui'
import { computed, ref } from 'vue'
import { ACHIEVEMENTS, TRIALS, type TrialDefinition, type TrialId } from '@/content/career'
import { achievementProgress, nextCareerWeek } from '@/domain/profile/career'
import { replayAvailability } from '@/domain/replay/setup'
import { useGameText } from '../../composables/useGameText'
import { useModal } from '../../composables/useModal'
import { useMatchStore } from '../../stores/match'
import { useDuelStore } from '../../stores/duel'
import { useProfileStore } from '../../stores/profile'
import { useSettingsStore } from '../../stores/settings'
import { useReplayStore } from '../../stores/replay'

withDefaults(defineProps<{ heading?: 'h1' | 'h2' }>(), { heading: 'h2' })

const profile = useProfileStore()
const match = useMatchStore()
const duel = useDuelStore()
const settings = useSettingsStore()
const replay = useReplayStore()
const text = useGameText()
const { t } = text
const tab = ref('trials')
const selected = ref<TrialDefinition | null>(null)
useModal(() => selected.value !== null)

const completed = computed(() => Object.keys(profile.profile.career.trials).length)
const resetAt = computed(() => nextCareerWeek(profile.week))

const trialReplays = computed(
  () =>
    new Map(
      TRIALS.map((trial) => [
        trial.id,
        profile.profile.recent.find(
          (record) =>
            record.trialId === trial.id && record.verdict === 'win' && replayAvailability(record) === 'ready',
        ),
      ]),
    ),
)

const resetLabel = computed(() =>
  new Intl.DateTimeFormat(settings.locale, {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(resetAt.value),
)

const milestones = computed(() =>
  ACHIEVEMENTS.map((achievement) => ({
    ...achievement,
    progress: Math.min(achievement.target, achievementProgress(profile.profile, achievement.id)),
    completed: Boolean(profile.profile.career.achievements[achievement.id]),
  })),
)

function start() {
  const trial = selected.value
  if (!trial || duel.matchmaking) {
    return
  }

  selected.value = null
  profile.close()
  if (trial.ghost) {
    void duel.search(trial.mode)
  } else {
    match.startTrial(trial.id)
  }
}

function watchReplay(trialId: TrialId) {
  const record = trialReplays.value.get(trialId)
  if (!record) {
    return
  }

  selected.value = null
  replay.open(record)
}
</script>

<template>
  <section class="career" aria-labelledby="career-title">
    <header class="heading">
      <div>
        <span class="eyebrow"><Trophy :size="14" /> {{ t('career.eyebrow') }}</span>
        <component :is="heading" id="career-title" class="hand">{{ t('career.title') }}</component>
        <p>{{ t('career.intro') }}</p>
      </div>
    </header>

    <TabsRoot v-model="tab" class="career-tabs">
      <TabsList class="tab-list" :aria-label="t('career.title')">
        <TabsTrigger class="tab" value="trials"
          >{{ t('career.tabs.trials') }} · {{ completed }}/{{ TRIALS.length }}</TabsTrigger
        >

        <TabsTrigger class="tab" value="weekly">{{ t('career.tabs.weekly') }}</TabsTrigger>
        <TabsTrigger class="tab" value="milestones">{{ t('career.tabs.milestones') }}</TabsTrigger>
      </TabsList>

      <TabsContent value="trials" class="content">
        <div class="cards">
          <article
            v-for="trial in TRIALS"
            :key="trial.id"
            class="card"
            :class="{
              locked: profile.level.level < trial.level,
              complete: profile.profile.career.trials[trial.id],
            }"
          >
            <div class="card-top">
              <span class="tag"
                >{{ t('profile.level', { level: trial.level }) }} · {{ t(`modes.${trial.mode}.name`) }}</span
              >

              <Check
                v-if="profile.profile.career.trials[trial.id]"
                :size="17"
                :aria-label="t('career.completed')"
              />

              <LockKeyhole
                v-else-if="profile.level.level < trial.level"
                :size="17"
                :aria-label="t('career.locked', { level: trial.level })"
              />

              <Target v-else :size="17" />
            </div>

            <h3>{{ t(`career.trials.${trial.id}.name`) }}</h3>
            <p class="objective">{{ t(`career.trials.${trial.id}.objective`) }}</p>

            <p v-if="profile.profile.career.trials[trial.id]" class="record">
              {{ t('career.bestRounds', { n: profile.profile.career.trials[trial.id]!.bestRounds }) }}
            </p>

            <footer>
              <span class="reward">{{
                profile.profile.career.trials[trial.id]
                  ? t('career.rewardReceived')
                  : t('career.firstClear', { xp: trial.xp })
              }}</span>

              <div class="trial-actions">
                <button
                  v-if="trialReplays.get(trial.id)"
                  type="button"
                  class="btn ghost"
                  @click="watchReplay(trial.id)"
                >
                  <Play :size="14" /> {{ t('replay.watch') }}
                </button>

                <button
                  type="button"
                  class="btn"
                  :disabled="profile.level.level < trial.level || duel.matchmaking || (trial.ghost && !duel.connected)"
                  @click="selected = trial"
                >
                  <Play :size="14" />
                  {{
                    profile.level.level < trial.level
                      ? t('career.locked', { level: trial.level })
                      : profile.profile.career.trials[trial.id]
                        ? t('career.retry')
                        : t('career.play')
                  }}
                </button>
              </div>
            </footer>
          </article>
        </div>

        <p class="weekly-note">{{ t('career.trialsHint') }}</p>
      </TabsContent>

      <TabsContent value="weekly" class="content">
        <div class="cards">
          <article
            v-for="contract in profile.contracts"
            :key="`${profile.week}:${contract.id}`"
            class="card"
            :class="{ complete: contract.completed }"
          >
            <div class="card-top">
              <span class="tag">{{ t('career.tabs.weekly') }}</span>
              <Check v-if="contract.completed" :size="17" :aria-label="t('career.completed')" />
            </div>

            <h3>{{ t(`career.contracts.${contract.id}.name`) }}</h3>

            <p class="objective">
              {{ t(`career.contracts.${contract.id}.objective`, { n: contract.target }) }}
            </p>

            <progress
              :value="contract.progress"
              :max="contract.target"
              :aria-label="t(`career.contracts.${contract.id}.name`)"
            />

            <footer>
              <span class="count">{{ contract.progress }}/{{ contract.target }}</span>

              <span class="reward">{{
                contract.completed ? t('career.rewardReceived') : t('career.xpReward', { xp: contract.xp })
              }}</span>
            </footer>
          </article>
        </div>

        <div class="weekly-note">
          <time :datetime="resetAt.toISOString()">{{ t('career.resets', { date: resetLabel }) }}</time>
        </div>
      </TabsContent>

      <TabsContent value="milestones" class="content milestones">
        <div class="cards">
          <article
            v-for="milestone in milestones"
            :key="milestone.id"
            class="card"
            :class="{ complete: milestone.completed }"
          >
            <div v-if="milestone.completed" class="card-top">
              <Check :size="17" :aria-label="t('career.completed')" />
            </div>

            <h3>{{ t(`career.achievements.${milestone.id}.name`) }}</h3>

            <p class="objective">
              {{ t(`career.achievements.${milestone.id}.objective`, { n: milestone.target }) }}
            </p>

            <progress
              :value="milestone.progress"
              :max="milestone.target"
              :aria-label="t(`career.achievements.${milestone.id}.name`)"
            />

            <footer>
              <span class="count">{{ milestone.progress }}/{{ milestone.target }}</span>

              <span class="reward">{{
                milestone.completed
                  ? t('career.xpReceived', { xp: milestone.xp })
                  : t('career.xpReward', { xp: milestone.xp })
              }}</span>
            </footer>
          </article>
        </div>
      </TabsContent>
    </TabsRoot>

    <DialogRoot
      :open="selected !== null"
      @update:open="
        (open) => {
          if (!open) {
            selected = null
          }
        }
      "
    >
      <DialogPortal>
        <DialogOverlay class="overlay" />

        <DialogContent v-if="selected" class="sheet career-trial-dialog">
          <DialogTitle class="hand">{{ t(`career.trials.${selected.id}.name`) }}</DialogTitle>
          <DialogDescription>{{ t(`career.trials.${selected.id}.objective`) }}</DialogDescription>
          <p class="note">{{ t('career.trialSetup', { mode: t(`modes.${selected.mode}.name`) }) }}</p>

          <p v-if="!profile.profile.career.trials[selected.id]" class="reward">
            {{ t('career.firstClear', { xp: selected.xp }) }}
          </p>

          <p v-if="match.savedRound" class="replace-warning">{{ t('career.replaceSave') }}</p>

          <div class="dialog-actions">
            <button type="button" class="btn primary block" :disabled="duel.matchmaking" @click="start">
              <Play :size="16" /> {{ t('career.play') }}
            </button>

            <button type="button" class="btn ghost block" @click="selected = null">
              {{ t('newMatch.cancel') }}
            </button>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  </section>
</template>

<style scoped>
.career {
  padding: 20px;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  background: linear-gradient(140deg, rgba(244, 197, 91, 0.06), var(--panel) 55%);
}
.heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  margin-bottom: 16px;
}
.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--gold);
}
.heading .hand {
  font-size: 40px;
  line-height: 1.2;
}
.heading p {
  margin: 6px 0 0;
  max-width: 54ch;
  color: var(--chalk-dim);
  font-size: 13px;
}
.career-tabs {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.tab-list {
  width: fit-content;
  max-width: 100%;
}
.tab {
  padding-inline: 14px;
}
.content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.content[data-state='inactive'] {
  display: none;
}
.note {
  margin: 0;
  font-size: 12px;
  color: var(--chalk-dim);
}
.cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: rgba(10, 15, 13, 0.28);
}
.card.complete {
  border-color: rgba(127, 224, 180, 0.35);
}
.card.locked {
  background: rgba(10, 15, 13, 0.1);
}
.card.locked h3 {
  color: var(--chalk-dim);
}
.card-top,
footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.card-top svg {
  color: var(--gold);
}
.card.complete .card-top svg {
  color: var(--heal);
}
.tag {
  font-size: 11px;
  color: var(--chalk-faint);
}
h3 {
  margin: 0;
  font-size: 18px;
}
.objective {
  flex: 1;
  margin: 0;
  font-size: 13px;
  color: var(--chalk-dim);
  line-height: 1.5;
}
.record {
  margin: 0;
  color: var(--heal);
  font-size: 12px;
}
footer {
  margin-top: 4px;
  flex-wrap: wrap;
}
.reward {
  color: var(--gold);
  font-size: 12px;
  font-weight: 700;
}

.trial-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.complete .reward {
  color: var(--heal);
}
.count {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
progress {
  display: block;
  width: 100%;
  height: 6px;
  border: 0;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.08);
  color: var(--gold);
}
progress::-webkit-progress-bar {
  background: rgba(255, 255, 255, 0.08);
}
progress::-webkit-progress-value {
  background: var(--gold);
  border-radius: 999px;
}
progress::-moz-progress-bar {
  background: var(--gold);
}
.weekly-note {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  margin: 0;
  font-size: 12px;
  color: var(--chalk-faint);
}
time {
  font-size: 12px;
  color: var(--chalk-faint);
}
:global(.career-trial-dialog) {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: min(440px, calc(100vw - 32px));
}
:global(.career-trial-dialog .hand) {
  font-size: 38px;
}
:global(.career-trial-dialog p) {
  margin: 0;
}
.replace-warning {
  color: var(--gold);
  font-size: 13px;
}
.dialog-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.milestones .cards {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
}
.milestones .card {
  position: relative;
  gap: 6px;
  padding: 12px;
}
.milestones .card-top {
  justify-content: flex-end;
}
.milestones .card-top {
  position: absolute;
  top: 12px;
  right: 12px;
}
.milestones .card.complete h3 {
  padding-right: 24px;
}

@media (max-width: 720px) {
  .career {
    padding: 18px 14px;
  }
  .heading {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  .cards {
    grid-template-columns: minmax(0, 1fr);
  }
  .tab-list {
    width: 100%;
  }
  .tab {
    padding-inline: 7px;
    font-size: 12px;
  }
}
</style>
