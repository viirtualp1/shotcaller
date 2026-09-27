<script setup lang="ts">
import { Check, Pencil, X } from 'lucide-vue-next'
import { computed, nextTick, ref } from 'vue'
import { PROFILE } from '@/content/profile'
import { rankFor } from '@/domain/profile/progression'
import { useGameText } from '../../composables/useGameText'
import { useProfileStore } from '../../stores/profile'
import { useSettingsStore } from '../../stores/settings'
import CoachAvatar from './CoachAvatar.vue'
import RankMedal from './RankMedal.vue'

const emit = defineEmits<{ pickAvatar: [] }>()

const profile = useProfileStore()
const settings = useSettingsStore()
const text = useGameText()
const { t } = text

const editing = ref(false)
const draft = ref('')
const input = ref<HTMLInputElement | null>(null)

const name = computed(() => profile.profile.name || t('profile.defaultName'))

const since = computed(() =>
  new Intl.DateTimeFormat(settings.locale, { dateStyle: 'long' }).format(new Date(profile.profile.createdAt)),
)

const xpShare = computed(() => (profile.level.into / profile.level.needed) * 100)

const rankShare = computed(() => {
  const { floor, next } = profile.rank
  return next === null ? 100 : ((profile.profile.rating - floor) / (next - floor)) * 100
})

/** The next star, or the next medal when the next star starts one. */
const nextStep = computed(() => {
  const { next, tier } = profile.rank
  if (next === null) {
    return t('profile.topRank')
  }

  const points = text.number(next - profile.profile.rating)
  const upcoming = rankFor(next)
  return upcoming.tier === tier
    ? t('profile.toNextStar', { points })
    : t('profile.toNextRank', {
        points,
        rank: t(`profile.ranks.${upcoming.tier}`),
      })
})

async function startEditing() {
  draft.value = profile.profile.name
  editing.value = true
  await nextTick()
  input.value?.select()
}

function save() {
  profile.rename(draft.value)
  editing.value = false
}
</script>

<template>
  <section class="header">
    <div class="identity">
      <button
        type="button"
        class="avatar"
        :aria-label="t('profile.changeAvatar')"
        @click="emit('pickAvatar')"
      >
        <CoachAvatar :hero-id="profile.avatar" :level="profile.level.level" :size="104" />
        <span class="avatar-edit"><Pencil :size="16" /></span>
      </button>

      <div class="who">
        <form v-if="editing" class="rename" @submit.prevent="save" @keydown.esc.stop="editing = false">
          <input
            ref="input"
            v-model="draft"
            class="name-input"
            :maxlength="PROFILE.nameMaxLength"
            :placeholder="t('profile.namePlaceholder')"
            :aria-label="t('profile.namePlaceholder')"
          />

          <button type="submit" class="icon-btn" :aria-label="t('profile.save')"><Check :size="18" /></button>

          <button type="button" class="icon-btn" :aria-label="t('profile.cancel')" @click="editing = false">
            <X :size="18" />
          </button>
        </form>

        <h1 v-else class="name">
          {{ name }}
          <button
            type="button"
            class="icon-btn rename-btn"
            :aria-label="t('profile.rename')"
            @click="startEditing"
          >
            <Pencil :size="15" />
          </button>
        </h1>

        <div class="level">
          <span class="level-label">{{ t('profile.level', { level: profile.level.level }) }}</span>
          <span class="bar"><span class="fill xp" :style="{ width: `${xpShare}%` }" /></span>

          <span class="muted">
            {{
              t('profile.xp', {
                into: text.number(profile.level.into),
                needed: text.number(profile.level.needed),
              })
            }}
          </span>
        </div>

        <p class="muted since">{{ t('profile.since', { date: since }) }}</p>
      </div>
    </div>

    <div class="rank">
      <RankMedal :tier="profile.rank.tier" :stars="profile.rank.stars" :size="112" />

      <div class="rank-text">
        <strong class="rank-name">{{ t(`profile.ranks.${profile.rank.tier}`) }}</strong>
        <span class="rating">{{ text.number(profile.profile.rating) }}</span>
        <span class="bar"><span class="fill" :style="{ width: `${rankShare}%` }" /></span>
        <span class="muted">{{ nextStep }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 24px 40px;
  padding: 28px;
  border-radius: 18px;
  border: 1px solid var(--edge);
  background:
    radial-gradient(ellipse 70% 140% at 100% 0%, rgba(244, 197, 91, 0.1), transparent 60%),
    linear-gradient(180deg, var(--panel), rgba(31, 43, 39, 0.6));
}

.identity {
  display: flex;
  align-items: center;
  gap: 24px;
  min-width: 0;
}

.avatar {
  position: relative;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  cursor: pointer;
}

.avatar-edit {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(10, 15, 13, 0.55);
  color: var(--chalk);
  opacity: 0;
  transition: opacity 0.15s;
}

.avatar:hover .avatar-edit,
.avatar:focus-visible .avatar-edit {
  opacity: 1;
}

.who {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.name {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: clamp(26px, 4vw, 36px);
  font-weight: 800;
  line-height: 1.1;
  overflow-wrap: anywhere;
}

.rename-btn {
  width: 30px;
  height: 30px;
  opacity: 0.7;
}

.rename {
  display: flex;
  align-items: center;
  gap: 6px;
}

.name-input {
  width: min(280px, 60vw);
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--gold);
  background: #0f1614;
  color: var(--chalk);
  font: 800 24px/1.2 var(--font-ui);
}

.level {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
}

.level-label {
  font-weight: 700;
  color: var(--gold);
}

.bar {
  position: relative;
  width: 160px;
  height: 6px;
  border-radius: 999px;
  background: rgba(236, 232, 220, 0.1);
  overflow: hidden;
}

.fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: inherit;
  background: linear-gradient(90deg, #d49a2a, var(--gold));
  transition: width 0.6s ease-out;
}

.fill.xp {
  background: linear-gradient(90deg, #4f9a7c, var(--heal));
}

.muted {
  font-size: 12.5px;
  color: var(--chalk-dim);
}

.since {
  margin: 0;
}

.rank {
  display: flex;
  align-items: center;
  gap: 20px;
}

.rank-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rank-name {
  font-size: 22px;
  font-weight: 800;
  line-height: 1.1;
}

.rating {
  font-size: 30px;
  font-weight: 800;
  line-height: 1;
  color: var(--gold);
  font-variant-numeric: tabular-nums;
}

.rank-text .bar {
  width: 180px;
  margin-top: 4px;
}

@media (max-width: 720px) {
  .header {
    padding: 20px;
  }

  .identity {
    gap: 16px;
  }
}
</style>
