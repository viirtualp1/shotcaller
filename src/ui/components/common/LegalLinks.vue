<script setup lang="ts">
import { FileText, ShieldCheck } from '@lucide/vue'
import { useGameText } from '../../composables/useGameText'
import { legalPath } from '../../legal/documents'
import { useLegalStore } from '../../stores/legal'

/** The footer keeps to the two documents everyone needs; account deletion is linked from the privacy policy. */
const FOOTER_DOCUMENTS = ['terms', 'privacy'] as const

const ICONS = {
  terms: FileText,
  privacy: ShieldCheck,
} as const

const legal = useLegalStore()
const { t } = useGameText()
</script>

<template>
  <nav class="legal-links" :aria-label="t('legal.documents')">
    <a
      v-for="id in FOOTER_DOCUMENTS"
      :key="id"
      :href="legalPath(id)"
      class="btn ghost"
      @click.prevent="legal.open(id)"
    >
      <component :is="ICONS[id]" :size="14" />

      <span>{{ t(`legal.short.${id}`) }}</span>
    </a>
  </nav>
</template>

<style scoped>
.legal-links {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legal-links a {
  height: var(--control-height);
  padding: 5px 10px;
  font-size: 12px;
  color: var(--chalk-dim);
  white-space: nowrap;
}
</style>
