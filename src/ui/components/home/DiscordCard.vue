<script setup lang="ts">
import { UserPlus } from '@lucide/vue'
import { discordInstallUrl, IN_DISCORD, inviteToActivity } from '@/application/discord'
import { useGameText } from '../../composables/useGameText'
import DiscordIcon from '../common/DiscordIcon.vue'

/** Outside Discord it offers the Activity; inside an Activity it invites friends to this one. */
const href = IN_DISCORD ? null : discordInstallUrl(import.meta.env)

const { t } = useGameText()

function invite() {
  void inviteToActivity(t('start.inviteMessage'))
}
</script>

<template>
  <button v-if="IN_DISCORD" type="button" class="discord" @click="invite">
    <UserPlus :size="22" />
    <b>{{ t('start.invite') }}</b>
  </button>

  <a
    v-else-if="href"
    :href="href"
    :aria-label="t('start.home.discord.title')"
    class="discord"
    target="_blank"
    rel="noopener"
  >
    <DiscordIcon :size="26" />

    <b class="mobile-label" aria-hidden="true">Play</b>

    <b class="desktop-copy">{{ t('start.home.discord.title') }}</b>
  </a>
</template>

<style scoped>
.discord {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 0;
  height: 100%;
  padding: 12px;
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
  line-height: 1.2;
  text-align: center;
}

.mobile-label {
  display: none;
}

@media (max-width: 860px) {
  .discord {
    gap: 6px;
    padding: 12px 8px;
  }

  .discord svg {
    width: 20px;
    height: 20px;
  }

  .desktop-copy {
    display: none;
  }

  .mobile-label {
    display: block;
    font-size: 14px;
    white-space: nowrap;
  }
}
</style>
