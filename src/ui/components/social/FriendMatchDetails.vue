<script setup lang="ts">
import { useAsyncState } from '@vueuse/core'
import { useGameText } from '../../composables/useGameText'
import { useFriendsStore } from '../../stores/friends'
import MatchDetails from '../profile/MatchDetails.vue'

/** A friend's match in full, fetched when its row is opened. */
const props = defineProps<{
  matchId: string
}>()

const friends = useFriendsStore()
const { t } = useGameText()
const { state: match, isLoading } = useAsyncState(() => friends.viewedMatch(props.matchId), null)
</script>

<template>
  <p v-if="isLoading" class="muted">{{ t('coach.matchLoading') }}</p>
  <MatchDetails v-else-if="match" :match="match" />
  <p v-else class="muted">{{ t('coach.matchUnavailable') }}</p>
</template>

<style scoped>
.muted {
  margin: 0;
  font-size: 13px;
  color: var(--chalk-faint);
}
</style>
