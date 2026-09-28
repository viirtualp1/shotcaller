<script setup lang="ts">
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { watch } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useChatStore } from '../../stores/chat'
import { useCloudStore } from '../../stores/cloud'
import { useDuelStore } from '../../stores/duel'
import { useFriendsStore } from '../../stores/friends'
import FriendsList from './FriendsList.vue'

/** The friends list as a side panel, opened from the start screen. */
const cloud = useCloudStore()
const friends = useFriendsStore()
const chat = useChatStore()
const duel = useDuelStore()
const { t } = useGameText()

/* Opening the panel catches up on anything Realtime cannot report, such as being removed by a friend. */
watch(
  () => friends.open,
  (open) => {
    if (open) {
      void friends.refresh()
    }
  },
)

/* A chat, a profile, signing in or a duel starting takes over the screen, so the panel steps aside. */
watch(
  () => [chat.friendId, friends.viewedId, cloud.signInOpen, duel.active?.duel.id],
  (next) => {
    if (next.some(Boolean)) {
      friends.open = false
    }
  },
)
</script>

<template>
  <DialogRoot v-model:open="friends.open">
    <DialogPortal>
      <DialogOverlay class="overlay" />

      <DialogContent class="drawer" :aria-describedby="undefined">
        <header class="top">
          <DialogTitle class="hand title">{{ t('friends.title') }}</DialogTitle>
          <DialogClose class="btn ghost">{{ t('friends.close') }}</DialogClose>
        </header>

        <FriendsList />
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(420px, 100vw);
  overflow-y: auto;
  padding: calc(18px + env(safe-area-inset-top, 0px)) 20px calc(24px + env(safe-area-inset-bottom, 0px));
  background: var(--panel);
  border-left: 1px solid var(--edge-strong);
  box-shadow: -20px 0 50px rgba(0, 0, 0, 0.45);
  z-index: 41;
  display: flex;
  flex-direction: column;
  gap: 18px;
  animation: slide-in 0.25s ease-out;
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 36px;
  line-height: 1;
}
</style>
