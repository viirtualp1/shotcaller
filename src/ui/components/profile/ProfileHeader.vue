<script setup lang="ts">
import { Check, Pencil, X } from '@lucide/vue'
import { useMediaQuery } from '@vueuse/core'
import { computed, nextTick, ref } from 'vue'
import { PROFILE } from '@/content/profile'
import { bestMode } from '@/domain/profile/Profile'
import { rankFor } from '@/domain/profile/progression'
import { useGameText } from '../../composables/useGameText'
import { useProfileStore } from '../../stores/profile'
import { useSettingsStore } from '../../stores/settings'
import { useAccountPhoto } from '../../composables/useAccountPhoto'
import CoachAvatar from './CoachAvatar.vue'
import RankDropdown from './RankDropdown.vue'

withDefaults(defineProps<{ linked?: boolean }>(), { linked: false })

const emit = defineEmits<{ pickAvatar: [] }>()

const profile = useProfileStore()
const settings = useSettingsStore()
const photo = useAccountPhoto()
const text = useGameText()
const { t } = text
const compact = useMediaQuery('(max-width: 720px)')

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

  const points = text.mmr(next - profile.profile.rating)
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
  <section class="header" :class="{ linked }">
    <a
      v-if="linked"
      href="/profile"
      class="profile-link"
      :aria-label="`${t('profile.title')} · ${name}`"
      @click.prevent="profile.open()"
    />

    <div class="identity">
      <component
        :is="linked ? 'div' : 'button'"
        :type="linked ? undefined : 'button'"
        class="avatar"
        :aria-label="linked ? undefined : t('profile.changeAvatar')"
        @click="!linked && emit('pickAvatar')"
      >
        <CoachAvatar
          :hero-id="profile.avatar"
          :level="profile.level.level"
          :size="compact ? 48 : linked ? 76 : 104"
          :photo="photo.shown.value"
        />

        <span v-if="!linked" class="avatar-edit"><Pencil :size="16" /></span>
      </component>

      <div class="who">
        <form
          v-if="!linked && editing"
          class="rename"
          @submit.prevent="save"
          @keydown.esc.stop="editing = false"
        >
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

        <component :is="linked ? 'h2' : 'h1'" v-else class="name">
          <span class="name-label">{{ name }}</span>

          <button
            v-if="!linked"
            type="button"
            class="icon-btn rename-btn"
            :aria-label="t('profile.rename')"
            @click="startEditing"
          >
            <Pencil :size="13" />
          </button>
        </component>

        <div class="level">
          <span class="level-label">{{ t('profile.level', { level: profile.level.level }) }}</span>
          <span class="bar"><span class="fill xp" :style="{ width: `${xpShare}%` }" /></span>

          <span class="muted xp-value">
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
      <RankDropdown :rank="profile.rank" :size="compact ? 48 : linked ? 76 : 112" />

      <div class="rank-text">
        <strong class="rank-name">{{ t(`profile.ranks.${profile.rank.tier}`) }}</strong>

        <span class="rating">
          <span class="display-number">{{ text.number(profile.profile.rating) }}</span>
          <span class="mmr">MMR</span>
        </span>

        <span v-if="profile.profile.rating > 0" class="best-mode">
          {{ t('profile.bestMode', { mode: t(`modes.${bestMode(profile.profile.ratings)}.name`) }) }}
        </span>

        <span class="bar"><span class="fill" :style="{ width: `${rankShare}%` }" /></span>

        <span class="muted next-step">{{ nextStep }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.best-mode {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--gold);
}

.header {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 24px 40px;
  padding: 28px;
  border-radius: var(--radius);
  border: 1px solid var(--edge);
  background:
    radial-gradient(ellipse 70% 140% at 100% 0%, rgba(244, 197, 91, 0.1), transparent 60%),
    linear-gradient(180deg, var(--panel), rgba(31, 43, 39, 0.6));
}

.header.linked {
  transition: border-color 0.15s;
}

.header.linked:hover {
  border-color: var(--gold);
}

.profile-link {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
}

.profile-link:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 4px;
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
  border-radius: var(--radius);
  background: none;
  cursor: pointer;
}

.avatar-edit {
  position: absolute;
  z-index: 1;
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
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 30px;
  height: 30px;
  padding: 0;
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
  border-radius: var(--radius);
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
  border: 0;
  padding: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
}

.rank-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rank-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 22px;
  font-weight: 800;
  line-height: 1.1;
}

.rating {
  display: inline-flex;
  align-items: baseline;
  gap: 0.2em;
  white-space: nowrap;
  font-size: 30px;
  font-weight: 800;
  line-height: 1;
  color: var(--gold);
  font-variant-numeric: tabular-nums;
}

.rating > span {
  line-height: 1;
}

.mmr {
  font-size: 0.5em;
  line-height: 1;
}

.rank-text .bar {
  width: 180px;
  margin-top: 4px;
}

@media (max-width: 720px) {
  .header {
    flex-wrap: nowrap;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding: 14px 12px;
  }

  .identity {
    flex: 1;
    gap: 8px;
  }

  .avatar {
    flex: none;
  }

  .who {
    flex: 1;
    gap: 5px;
  }

  .name {
    gap: 4px;
    font-size: 18px;
  }

  .name-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .rename-btn {
    width: 32px;
    height: 32px;
  }

  .name-input {
    width: 100%;
    min-width: 0;
    padding: 4px;
    font-size: 14px;
  }

  .rename {
    flex-wrap: wrap;
    gap: 4px;
  }

  .level {
    gap: 4px 6px;
    font-size: 10px;
  }

  .level .bar {
    order: 1;
    flex-basis: 100%;
    max-width: 100%;
    height: 4px;
  }

  .xp-value,
  .since {
    font-size: 9px;
    line-height: 1.3;
  }

  .rank {
    flex: none;
    gap: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--edge);
  }

  .rank-text {
    display: grid;
    flex: 1;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    min-width: 0;
    gap: 6px 10px;
  }

  .rank-name {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
  }

  .rating {
    font-size: 20px;
  }

  .best-mode,
  .next-step {
    display: none;
  }

  .rank-text .bar {
    grid-column: 1 / -1;
    width: 100%;
    height: 4px;
    margin-top: 0;
  }
}
</style>
