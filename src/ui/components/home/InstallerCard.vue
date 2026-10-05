<script setup lang="ts">
import { Download } from '@lucide/vue'
import { useGameText } from '../../composables/useGameText'

const INSTALLER_URL =
  'https://github.com/viirtualp1/shotcaller/releases/latest/download/The%20Shotcaller%20Installer.exe'

const { t } = useGameText()
</script>

<template>
  <a class="installer" :href="INSTALLER_URL" target="_blank" rel="noreferrer">
    <Download :size="26" />

    <span>
      <b>{{ t('start.home.installer.title') }}</b>
      <small>{{ t('start.home.installer.text') }}</small>
    </span>
  </a>
</template>

<style scoped>
.installer {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  min-width: 0;
  height: 100%;
  padding: 16px;
  border: 1px solid rgba(244, 197, 91, 0.45);
  border-radius: var(--radius);
  background: var(--gold-soft);
  color: var(--chalk);
  text-decoration: none;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.installer:hover {
  border-color: var(--gold);
  background: rgba(244, 197, 91, 0.22);
}

.installer svg {
  flex: none;
  color: var(--gold);
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

@media (max-width: 860px) {
  .installer {
    align-items: center;
  }

  small {
    display: none;
  }
}
</style>
