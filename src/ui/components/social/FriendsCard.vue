<script setup lang="ts">
import { useGameText } from '../../composables/useGameText'
import HudPanel from '../common/HudPanel.vue'
import FriendsList from './FriendsList.vue'

/** The friends list on the profile page. */
const { t } = useGameText()
</script>

<template>
  <HudPanel :title="t('friends.title')" class="panel">
    <div class="scroll">
      <FriendsList />
    </div>
  </HudPanel>
</template>

<style scoped>
.panel {
  gap: 12px;
  padding: 16px 18px;
}

.scroll {
  min-height: 0;
  max-height: 520px;
  overflow-y: auto;
}
</style>
