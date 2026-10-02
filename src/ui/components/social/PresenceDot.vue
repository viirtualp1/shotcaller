<script setup lang="ts">
import { computed } from 'vue'
import { useFriendsStore } from '../../stores/friends'

/**
 * A friend's presence on the corner of their avatar: grey when away, green when online, and gold with waves going
 * out, like a broadcast, while they are in a match that can be watched. The avatar's wrapper places it.
 */
const props = defineProps<{ friendId: string }>()

const friends = useFriendsStore()

const state = computed(() =>
  friends.isPlaying(props.friendId) ? 'playing' : friends.isOnline(props.friendId) ? 'online' : 'away',
)
</script>

<template>
  <i class="presence" :class="state" aria-hidden="true" />
</template>

<style scoped>
.presence {
  position: absolute;
  right: -1px;
  bottom: -1px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--chalk-faint);
  box-shadow: 0 0 0 2px var(--panel);
}

.online {
  background: var(--heal);
}

.playing {
  background: var(--gold);
}

.playing::before,
.playing::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1.5px solid var(--gold);
  animation: broadcast 1.8s ease-out infinite;
}

.playing::after {
  animation-delay: 0.9s;
}

@keyframes broadcast {
  from {
    opacity: 0.9;
    transform: scale(1);
  }

  to {
    opacity: 0;
    transform: scale(2.6);
  }
}

@media (prefers-reduced-motion: reduce) {
  .playing::before,
  .playing::after {
    animation: none;
    opacity: 0;
  }
}
</style>
