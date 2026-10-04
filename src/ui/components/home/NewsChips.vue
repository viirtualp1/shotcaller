<script setup lang="ts">
import { ScrollText } from '@lucide/vue'
import { discordInstallUrl, IN_DISCORD } from '@/application/discord'
import { useGameText } from '../../composables/useGameText'
import { isFresh, LATEST_PATCH } from '../../patchNotes/notes'
import { usePatchNotesStore } from '../../stores/patchNotes'
import DiscordIcon from '../common/DiscordIcon.vue'
import NoteLine from '../patchNotes/NoteLine.vue'

/** The latest patch and the Discord Activity as two slim links; `titled` adds the patch's headline. */
defineProps<{ titled?: boolean }>()

const notes = usePatchNotesStore()
const { t } = useGameText()
const discordHref = IN_DISCORD ? null : discordInstallUrl(import.meta.env)
</script>

<template>
  <div class="news" :class="{ titled }">
    <a :href="`/patches/${LATEST_PATCH.version}/`" class="chip" @click.prevent="notes.open()">
      <ScrollText :size="16" />
      <span>{{ t('patchNotes.patch', { version: LATEST_PATCH.version }) }}</span>

      <template v-if="titled">
        <span class="dot">·</span>
        <NoteLine :text="LATEST_PATCH.title" class="headline" />
      </template>

      <span v-if="isFresh(LATEST_PATCH)" class="fresh">{{ t('start.home.fresh') }}</span>
    </a>

    <a v-if="discordHref" :href="discordHref" class="chip" target="_blank" rel="noopener">
      <DiscordIcon :size="16" />
      <span>Discord</span>
    </a>
  </div>
</template>

<style scoped>
.news {
  display: grid;
  grid-auto-columns: minmax(0, 1fr);
  grid-auto-flow: column;
  gap: 8px;
}

.news.titled {
  grid-auto-columns: minmax(0, auto);
}

.chip {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: var(--panel);
  color: var(--chalk);
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
  transition: border-color 0.15s;
}

.chip:hover {
  border-color: rgba(244, 197, 91, 0.5);
}

.chip svg {
  flex: none;
  color: var(--gold);
}

.dot {
  color: var(--chalk-faint);
}

.headline {
  overflow: hidden;
  color: var(--chalk-dim);
  font-weight: 600;
  text-overflow: ellipsis;
}

.fresh {
  margin-left: auto;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--gold);
  color: var(--ink);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
}
</style>
