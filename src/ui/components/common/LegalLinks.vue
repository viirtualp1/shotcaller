<script setup lang="ts">
import { useGameText } from '../../composables/useGameText'
import { LEGAL_IDS, legalPath } from '../../legal/documents'
import { useLegalStore } from '../../stores/legal'

const legal = useLegalStore()
const { t } = useGameText()
</script>

<template>
  <nav class="legal-links" :aria-label="t('legal.documents')">
    <a v-for="id in LEGAL_IDS" :key="id" :href="legalPath(id)" @click.prevent="legal.open(id)">
      {{ t(`legal.short.${id}`) }}
    </a>
  </nav>
</template>

<style scoped>
.legal-links {
  display: flex;
  gap: 12px;
  font-size: 12px;
}

.legal-links a {
  color: var(--chalk-faint);
  text-decoration: none;
}

.legal-links a:hover,
.legal-links a:focus-visible {
  color: var(--chalk);
  text-decoration: underline;
}
</style>
