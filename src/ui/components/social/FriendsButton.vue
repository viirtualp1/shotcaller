<script setup lang="ts">
import { Users } from 'lucide-vue-next'
import { computed } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useChatStore } from '../../stores/chat'
import { useCloudStore } from '../../stores/cloud'
import { useFriendsStore } from '../../stores/friends'

/** Sits next to the profile card on the start screen once signed in; shows who is online and new requests at a glance. */
const cloud = useCloudStore()
const friends = useFriendsStore()
const chat = useChatStore()
const { t } = useGameText()

/** New friend requests and unread messages. */
const news = computed(() => friends.incoming.length + chat.totalUnread)
</script>

<template>
  <button v-if="cloud.signedIn" type="button" class="friends" @click="friends.open = true">
    <span class="icon">
      <Users :size="20" />

      <span v-if="news" class="badge" :aria-label="t('friends.incomingBadge', { n: news })">
        {{ news }}
      </span>
    </span>

    <span class="label">
      <span>{{ t('friends.button') }}</span>

      <span v-if="friends.onlineCount" class="online">
        <i class="dot" />
        {{ t('friends.onlineCount', { n: friends.onlineCount }) }}
      </span>
    </span>
  </button>
</template>

<style scoped>
.friends {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 66px;
  padding: 0 18px 0 14px;
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

.icon {
  position: relative;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(108, 196, 255, 0.14);
  color: var(--ours);
}

.badge {
  position: absolute;
  top: -6px;
  right: -8px;
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

.label {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.online {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--chalk-dim);
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #7fe0b4;
  box-shadow: 0 0 6px rgba(127, 224, 180, 0.8);
}
</style>
