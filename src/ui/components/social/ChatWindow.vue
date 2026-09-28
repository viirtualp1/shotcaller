<script setup lang="ts">
import { computed } from 'vue'
import { useChatStore } from '../../stores/chat'
import { useFriendsStore } from '../../stores/friends'
import ChatPanel from './ChatPanel.vue'

/** A conversation in a small window in the corner, over whatever screen the player is on. */
const chat = useChatStore()
const friends = useFriendsStore()

const friend = computed(() => friends.friends.find((f) => f.id === chat.friendId) ?? null)
</script>

<template>
  <Transition name="chat-window">
    <aside v-if="friend" class="chat-window">
      <ChatPanel :key="friend.id" :friend="friend" class="panel" @close="chat.close()" />
    </aside>
  </Transition>
</template>

<style scoped>
.chat-window {
  position: fixed;
  right: 16px;
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  z-index: 45;
  display: flex;
  width: min(380px, calc(100vw - 32px));
  height: min(540px, calc(100dvh - 32px));
  padding: 12px;
  border-radius: 16px;
  background: var(--panel);
  border: 1px solid var(--edge-strong);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
}

.panel {
  flex: 1;
}

.chat-window-enter-active,
.chat-window-leave-active {
  transition:
    opacity 0.18s ease-out,
    transform 0.18s ease-out;
}

.chat-window-enter-from,
.chat-window-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

@media (max-width: 520px) {
  .chat-window {
    right: 8px;
    left: 8px;
    width: auto;
    height: min(560px, calc(100dvh - 24px));
  }
}
</style>
