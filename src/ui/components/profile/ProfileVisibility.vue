<script setup lang="ts">
import { Eye, EyeOff } from '@lucide/vue'
import { computed } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useCloudStore } from '../../stores/cloud'
import { useFriendsStore } from '../../stores/friends'
import ExperimentInfo from '../settings/ExperimentInfo.vue'

/**
 * Whether coaches who are not friends can open this coach's dossier from the leaderboard. Profiles start private;
 * friends see the dossier either way.
 */
const cloud = useCloudStore()
const friends = useFriendsStore()
const { t } = useGameText()

const open = computed({
  get: () => friends.publicProfile === true,
  set: (visible: boolean) => {
    void friends.setPublicProfile(visible)
  },
})
</script>

<template>
  <div v-if="cloud.signedIn && friends.publicProfile !== null" class="visibility">
    <label class="toggle" :class="{ on: open }">
      <input v-model="open" type="checkbox" role="switch" />

      <span class="switch" aria-hidden="true">
        <span class="knob">
          <Eye v-if="open" :size="10" :stroke-width="2.6" />
          <EyeOff v-else :size="10" :stroke-width="2.6" />
        </span>
      </span>

      <span>{{ t('dossier.openProfile') }}</span>
    </label>

    <ExperimentInfo :title="t('dossier.openProfile')" :text="t('dossier.privacyHint')" hover />

    <small v-if="friends.publicProfileFailed" class="failed" role="alert">{{ t('dossier.privacyFailed') }}</small>
  </div>
</template>

<style scoped>
.visibility {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  color: var(--chalk-dim);
  cursor: pointer;
  transition: color 0.15s;
}

.toggle.on {
  color: var(--chalk);
}

.toggle input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

/* A switch keeps its pill track and round knob; the eye inside the knob tells the state at a glance. */
.switch {
  position: relative;
  flex: none;
  width: 34px;
  height: 20px;
  border-radius: 999px;
  background: var(--edge-strong);
  transition: background 0.15s;
}

.knob {
  position: absolute;
  top: 2px;
  left: 2px;
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--chalk);
  color: var(--ink);
  transition: translate 0.15s;
}

.toggle input:checked + .switch {
  background: var(--gold);
}

.toggle input:checked + .switch .knob {
  translate: 14px 0;
  background: var(--ink);
  color: var(--gold);
}

.toggle input:focus-visible + .switch {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}

.failed {
  font-size: 11px;
  font-weight: 700;
  color: var(--theirs);
}
</style>
