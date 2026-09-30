<script setup lang="ts">
import { Users } from '@lucide/vue'
import { computed } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useChatStore } from '../../stores/chat'
import { useCloudStore } from '../../stores/cloud'
import { useFriendsStore } from '../../stores/friends'
import InfoTooltip from '../common/InfoTooltip.vue'

/** Sits next to the profile card on the start screen once signed in; shows who is online and new requests at a glance. */
const cloud = useCloudStore()
const friends = useFriendsStore()
const chat = useChatStore()
const { t } = useGameText()

withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })

/** New friend requests and unread messages. */
const news = computed(() => friends.incoming.length + chat.totalUnread)

const label = computed(() =>
  [
    t('friends.button'),
    friends.onlineCount ? t('friends.onlineCount', { n: friends.onlineCount }) : null,
    news.value ? t('friends.incomingBadge', { n: news.value }) : null,
  ]
    .filter(Boolean)
    .join(' · '),
)
</script>

<template>
  <InfoTooltip v-if="cloud.signedIn" side="bottom">
    <button
      type="button"
      class="friends"
      :class="{ compact }"
      :aria-label="label"
      :aria-expanded="chat.windowOpen"
      aria-controls="social-window"
      @click="chat.toggleWindow()"
    >
      <span class="icon" aria-hidden="true">
        <Users :size="20" />
        <span v-if="news" class="badge">{{ news }}</span>
        <span v-if="friends.onlineCount" class="dot" />
      </span>
    </button>

    <template #content>{{ label }}</template>
  </InfoTooltip>
</template>

<style scoped>
.friends {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  min-height: var(--coach-card-height, 66px);
  padding: 0 20px;
  border-radius: 14px;
  border: 1px solid var(--edge-strong);
  background: linear-gradient(160deg, rgba(39, 54, 49, 0.92), rgba(24, 34, 31, 0.92));
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.35);
  color: var(--chalk);
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition:
    border-color 0.15s,
    transform 0.15s;
  animation: fade-in 0.4s 0.2s ease-out both;
}

.friends:hover {
  border-color: rgba(244, 197, 91, 0.6);
  transform: translateY(-1px);
}

.friends:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 3px;
}

.icon {
  position: relative;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex: none;
  color: var(--gold);
}

.badge {
  position: absolute;
  bottom: -5px;
  right: -5px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--gold);
  color: var(--ink);
  font-size: 11px;
  font-weight: 800;
  line-height: 18px;
  text-align: center;
  box-shadow: 0 0 0 2px var(--board-deep);
}

.dot {
  position: absolute;
  right: 6px;
  top: 5px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #7fe0b4;
  box-shadow: 0 0 6px rgba(127, 224, 180, 0.8);
  outline: 2px solid var(--board-deep);
}
.friends.compact {
  width: 48px;
  min-height: 48px;
  padding: 4px;
  border-radius: 14px;
  animation: none;
}
</style>
