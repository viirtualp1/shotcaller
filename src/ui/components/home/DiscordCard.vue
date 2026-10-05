<script setup lang="ts">
import { UserPlus } from '@lucide/vue'
import { discordInstallUrl, IN_DISCORD, inviteToActivity } from '@/application/discord'
import { useGameText } from '../../composables/useGameText'
import DiscordIcon from '../common/DiscordIcon.vue'

/** Outside Discord it offers the Activity; inside an Activity it invites friends to this one. */
const { t } = useGameText()

const href = IN_DISCORD ? null : discordInstallUrl(import.meta.env)

function invite() {
  void inviteToActivity(t('start.inviteMessage'))
}
</script>

<template>
  <button v-if="IN_DISCORD" type="button" class="discord" @click="invite">
    <UserPlus :size="22" />
    <b>{{ t('start.invite') }}</b>
  </button>

  <a v-else-if="href" :href="href" class="discord" target="_blank" rel="noopener">
    <DiscordIcon :size="26" />

    <span
      ><b>{{ t('start.home.discord.title') }}</b>

      <small>{{ t('start.home.discord.text') }}</small></span
    >
  </a>
</template>

<style scoped>
.discord {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px;
  border: 1px solid rgba(88, 101, 242, 0.55);
  border-radius: var(--radius);
  background: rgba(88, 101, 242, 0.16);
  color: var(--chalk);
  font: inherit;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.discord:hover {
  border-color: rgb(88, 101, 242);
  background: rgba(88, 101, 242, 0.26);
}

.discord svg {
  flex: none;
  color: #c9cdfb;
}

b {
  display: block;
  font-size: 16px;
}

small {
  display: block;
  margin-top: 2px;
  color: var(--chalk-dim);
  font-size: 12px;
  line-height: 1.4;
}
</style>
