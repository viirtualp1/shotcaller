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
import CoachTitle from './CoachTitle.vue'
import CoachAvatar from './CoachAvatar.vue'
import RankDropdown from './RankDropdown.vue'
import ProfileVisibility from './ProfileVisibility.vue'

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
    return
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
          :frame="profile.profile.cosmetics?.frame"
          :level="profile.level.level"
          :size="compact ? (linked ? 48 : 60) : linked ? 76 : 104"
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

        <CoachTitle :title="profile.profile.cosmetics?.title" />

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

        <ProfileVisibility v-if="!linked" class="visibility" />
      </div>
    </div>

    <div class="rank">
      <RankDropdown :rank="profile.rank" :size="compact ? (linked ? 48 : 56) : linked ? 76 : 112" />

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

        <span v-if="nextStep" class="muted next-step">{{ nextStep }}</span>
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
  gap: 24px;
  min-width: 0;
}

.avatar {
  position: relative;
  padding: 0;
  height: fit-content;
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
  min-height: 44px;
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

/*
 * Editing takes the name's own line: as tall, in the same type, and as wide as the column already is (width 0 with a
 * full min-width never widens it), so neither the header nor the rank beside it moves.
 */
.rename {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 0;
  min-width: 100%;
  min-height: 44px;
  font-size: clamp(26px, 4vw, 36px);
}

.name-input {
  flex: 1;
  min-width: 0;
  height: 44px;
  margin-left: -9px;
  padding: 0 8px;
  border-radius: var(--radius);
  border: 1px solid var(--gold);
  background: #0f1614;
  color: var(--chalk);
  font: 800 1em/1.1 var(--font-ui);
}

.rename .icon-btn {
  flex: none;
  width: 30px;
  height: 30px;
  padding: 0;
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
    gap: 12px;
  }

  .avatar {
    flex: none;
  }

  .who {
    flex: 1;
    gap: 5px;
  }

  .name,
  .rename {
    gap: 4px;
    min-height: 32px;
    font-size: 18px;
  }

  .name-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Only the pencil shows; a wider invisible ring keeps it easy to hit. */
  .rename-btn {
    position: relative;
    width: auto;
    height: auto;
    padding: 0;
    border: 0;
    background: none;
    color: var(--chalk-dim);
  }

  .rename-btn::after {
    content: '';
    position: absolute;
    inset: -8px;
  }

  .name-input {
    height: 32px;
    margin-left: -7px;
    padding: 0 6px;
  }

  .rename .icon-btn {
    width: 32px;
    height: 32px;
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

  /*
   * The profile's own card: the avatar with the name, the profile switch and the date beside it, then the level and the
   * rank as two equal tiles. The wrappers step aside so all of them share one grid.
   */
  .header:not(.linked) {
    --identity: 74px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px 8px;
    padding: 16px 14px 14px;
  }

  .header:not(.linked) .identity,
  .header:not(.linked) .who {
    display: contents;
  }

  .header:not(.linked) .avatar {
    grid-row: 1 / span 3;
    grid-column: 1;
    align-self: center;
    justify-self: start;
  }

  .header:not(.linked) .name,
  .header:not(.linked) .rename,
  .header:not(.linked) .visibility,
  .header:not(.linked) .since {
    grid-column: 1 / -1;
    min-width: 0;
    padding-inline: var(--identity) 64px;
  }

  .header:not(.linked) .name,
  .header:not(.linked) .rename {
    grid-row: 1;
    gap: 6px;
    min-height: 28px;
    font-size: 20px;
  }

  .header:not(.linked) .name-input {
    height: 28px;
    margin-left: -7px;
  }

  .header:not(.linked) .rename .icon-btn {
    width: 28px;
    height: 28px;
  }

  .header:not(.linked) .visibility {
    grid-row: 2;
  }

  .header:not(.linked) .since {
    grid-row: 3;
    align-self: start;
    color: var(--chalk-faint);
    font-size: 11px;
  }

  .header:not(.linked) .rename {
    width: auto;
  }

  /* The rank medal balances the avatar on the right; the rank's numbers join the level as the second tile. */
  .header:not(.linked) .rank {
    display: contents;
  }

  .header:not(.linked) .rank :deep(.rank-toggle) {
    grid-row: 1 / span 3;
    grid-column: 2;
    align-self: center;
    justify-self: end;
  }

  .header:not(.linked) .level,
  .header:not(.linked) .rank-text {
    grid-row: 4;
    align-content: center;
    margin-top: 10px;
    padding: 10px 12px;
    border: 1px solid var(--edge);
    border-radius: var(--radius);
    background: rgba(0, 0, 0, 0.18);
  }

  .header:not(.linked) .level {
    grid-column: 1;
    justify-content: space-between;
    gap: 8px 6px;
    font-size: 12px;
  }

  .header:not(.linked) .rank-text {
    grid-column: 2;
    gap: 8px 6px;
  }

  .header:not(.linked) .rank-name {
    font-size: 12px;
    color: var(--chalk);
  }

  .header:not(.linked) .rating {
    font-size: 16px;
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
