<script setup lang="ts">
import { Play, X } from 'lucide-vue-next'
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { computed, ref, watch } from 'vue'
import type { MatchRecord } from '@/domain/profile/Profile'
import { replayAvailability } from '@/domain/replay/setup'
import { useGameText } from '../../composables/useGameText'
import { vOpticalAlign } from '../../directives/opticalAlign'
import { useReplayStore } from '../../stores/replay'
import { useSettingsStore } from '../../stores/settings'
import HeroAvatar from '../common/HeroAvatar.vue'
import MatchDetails from './MatchDetails.vue'

const match = defineModel<MatchRecord | null>({ required: true })

const settings = useSettingsStore()
const replay = useReplayStore()
const text = useGameText()
const { t } = text
const round = ref<number | null>(null)

const open = computed({
  get: () => match.value !== null,
  set: (value: boolean) => {
    if (!value) {
      match.value = null
    }
  },
})

const reason = computed(() => {
  const record = match.value
  if (record?.reason === 'forfeit') {
    return t(`matchDetails.reasons.${record.verdict === 'win' ? 'forfeitWin' : 'forfeitLoss'}`)
  }

  if (record?.reason === 'throne') {
    return null
  }

  return t('matchDetails.reasons.roundLimit')
})

const opponent = computed(() =>
  match.value?.duel
    ? t('matchDetails.duelWith', { name: match.value.duel.opponentName || t('profile.defaultName') })
    : null,
)

const playedAt = computed(() =>
  match.value
    ? new Intl.DateTimeFormat(settings.locale, {
        dateStyle: 'long',
        timeStyle: 'short',
      }).format(new Date(match.value.playedAt))
    : '',
)

const mvp = computed(() => match.value?.heroes.find((line) => line.heroId === match.value?.mvp) ?? null)
const canWatch = computed(() => match.value !== null && replayAvailability(match.value) === 'ready')

function watchReplay() {
  const record = match.value

  if (!record) {
    return
  }

  replay.open(record, round.value ?? record.replays.length)
}

watch(match, () => {
  round.value = null
})
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="overlay" />

      <DialogContent v-if="match" class="sheet match-details" :aria-describedby="undefined">
        <header class="head">
          <div class="outcome">
            <div class="title-row">
              <DialogTitle v-optical-align class="title hand" :data-verdict="match.verdict">
                {{ t(`result.${match.verdict}`) }}
              </DialogTitle>

              <button v-if="canWatch" type="button" class="btn watch" @click="watchReplay()">
                <Play :size="14" /> {{ t('replay.watch') }}
              </button>
            </div>

            <p v-if="reason" class="reason">{{ reason }}</p>

            <p class="meta">
              {{ t(`modes.${match.mode}.name`) }} ·
              {{ opponent ?? t(`settings.difficulties.${match.difficulty}`) }} ·
              <time :datetime="match.playedAt">{{ playedAt }}</time>
            </p>
          </div>

          <p v-if="mvp" class="mvp">
            <HeroAvatar :hero-id="mvp.heroId" :stars="mvp.stars" :size="30" />

            <span>
              <span class="eyebrow">{{ t('report.mvp') }}</span>
              <strong>{{ text.heroName(mvp.heroId) }}</strong> ·
              {{ t('report.mvpDamage', { damage: text.number(mvp.damage) }) }}
            </span>
          </p>

          <DialogClose class="icon-btn close" :aria-label="t('matchDetails.close')">
            <X :size="16" />
          </DialogClose>
        </header>

        <MatchDetails :key="match.id" v-model:round="round" hide-watch :match="match" />
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.match-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: min(860px, calc(100vw - 32px));
}

.head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 10px 18px;
  padding-right: 40px;
}

.outcome {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 200px;
}

.title-row {
  --title: 44px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
}

.title {
  margin: 0;
  font-size: var(--title);
  line-height: 1;
}

/* Caveat draws its letters below the middle of the em box, so the button follows the ink. */
.watch {
  flex: none;
  translate: 0 calc(var(--title) * 0.1);
}

.title[data-verdict='win'] {
  color: var(--gold);
}

.title[data-verdict='loss'] {
  color: var(--theirs);
}

.reason {
  margin: 0;
  font-weight: 600;
}

.meta {
  margin: 0;
  font-size: 12.5px;
  color: var(--chalk-dim);
}

.mvp {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  padding: 6px 12px;
  border-radius: 10px;
  background: rgba(244, 197, 91, 0.08);
  border: 1px solid rgba(244, 197, 91, 0.3);
  font-size: 13px;
}

.mvp .eyebrow {
  display: block;
  color: var(--gold);
}

/* In the corner like every other dialog, however the header wraps. */
.close {
  position: absolute;
  top: 14px;
  right: 14px;
}

@media (max-width: 560px) {
  .title-row {
    --title: 36px;
  }
}
</style>
