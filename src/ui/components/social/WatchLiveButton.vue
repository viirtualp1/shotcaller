<script setup lang="ts">
import { Eye } from '@lucide/vue'
import { computed } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useFriendsStore } from '../../stores/friends'

/** Watch a friend's match live; it shows up by itself while they play and goes when they stop. */
const props = withDefaults(defineProps<{ friendId: string; name: string; iconOnly?: boolean }>(), {
  iconOnly: false,
})

const friends = useFriendsStore()
const { t } = useGameText()

const label = computed(() => t('replay.watchFriend', { name: props.name }))
</script>

<template>
  <button
    v-if="friends.isPlaying(friendId)"
    type="button"
    :class="iconOnly ? 'icon-btn watch' : 'btn watch'"
    :aria-label="label"
    :title="label"
    @click="friends.watchMatch(friendId)"
  >
    <Eye :size="16" />
    <template v-if="!iconOnly">{{ t('friends.watch') }}</template>
  </button>
</template>

<style scoped>
.watch {
  color: var(--gold);
}
</style>
