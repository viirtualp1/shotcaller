<script setup lang="ts">
import { UserPlus } from '@lucide/vue'
import { ref } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useFriendsStore } from '../../stores/friends'
import HudPanel from '../common/HudPanel.vue'
import AddFriendDialog from './AddFriendDialog.vue'
import FriendsList from './FriendsList.vue'

/** The friends list on the profile page. */
defineProps<{ fill?: boolean }>()

const friends = useFriendsStore()
const { t } = useGameText()
const adding = ref(false)
</script>

<template>
  <HudPanel :title="t('friends.title')" class="panel" :class="{ fill }">
    <template v-if="friends.card" #actions>
      <button
        type="button"
        class="icon-btn add"
        :aria-label="t('friends.addFriend')"
        :title="t('friends.addFriend')"
        @click="adding = true"
      >
        <UserPlus :size="16" />
      </button>
    </template>

    <div class="scroll">
      <FriendsList :contained="fill" />
    </div>

    <AddFriendDialog v-model:open="adding" />
  </HudPanel>
</template>

<style scoped>
.panel {
  gap: 12px;
  padding: 16px 18px;
}

.panel :deep(.head) {
  align-items: center;
}

.add {
  margin-left: auto;
}

.scroll {
  min-height: 0;
  max-height: 520px;
  overflow-y: auto;
  overflow-x: clip;
}

.fill {
  min-height: 0;
  overflow: hidden;
}

.fill .scroll {
  display: flex;
  flex: 1;
  max-height: none;
  overflow: hidden;
}
</style>
