<script setup lang="ts">
import { ArrowLeft, FileText, ShieldCheck, UserX } from '@lucide/vue'
import { computed, watch } from 'vue'
import { useGameText } from '../composables/useGameText'
import { useUiZoom } from '../composables/useUiZoom'
import { LEGAL_IDS, LEGAL_UPDATED, legalPath, type LegalDocument, type LegalId } from '../legal/documents'
import { useLegalStore } from '../stores/legal'
import { useSettingsStore } from '../stores/settings'

const ICONS = {
  terms: FileText,
  privacy: ShieldCheck,
  'delete-account': UserX,
} as const

const legal = useLegalStore()
const settings = useSettingsStore()
const { t } = useGameText()
const zoom = useUiZoom()

/** The screen is only mounted while a document is open. */
const document = computed(() => legal.document as LegalDocument)
const locale = computed(() => settings.locale)
const other = computed<LegalId>(() => (document.value.id === 'privacy' ? 'terms' : 'privacy'))

const updated = computed(() => {
  const [year = 0, month = 1, day = 1] = LEGAL_UPDATED.split('-').map(Number)
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'long' }).format(new Date(year, month - 1, day))
})

watch(
  () => document.value.id,
  () => globalThis.scrollTo({ top: 0 }),
)
</script>

<template>
  <div class="legal" :style="{ '--ui-zoom': zoom }">
    <header class="topbar">
      <div class="bar">
        <a href="/" class="btn" @click.prevent="legal.close()"
          ><ArrowLeft :size="16" /> {{ t('legal.back') }}</a
        >

        <nav class="switch" :aria-label="t('legal.documents')">
          <a
            v-for="id in LEGAL_IDS"
            :key="id"
            :href="legalPath(id)"
            class="btn"
            :class="{ current: id === document.id }"
            :aria-current="id === document.id ? 'page' : undefined"
            @click.prevent="legal.open(id)"
          >
            <component :is="ICONS[id]" :size="15" /> {{ t(`legal.short.${id}`) }}
          </a>
        </nav>
      </div>
    </header>

    <Transition name="fade" mode="out-in">
      <main :key="document.id" class="page">
        <section class="masthead">
          <h1 class="title hand">{{ document.title[locale] }}</h1>
          <p class="summary">{{ document.summary[locale] }}</p>
          <time :datetime="LEGAL_UPDATED" class="date">{{ t('legal.updated', { date: updated }) }}</time>
        </section>

        <section v-for="(section, i) in document.sections" :key="i" class="section">
          <h2 class="section-title">{{ section.title[locale] }}</h2>

          <p v-for="(paragraph, j) in section.paragraphs" :key="`p${j}`">{{ paragraph[locale] }}</p>

          <ul v-if="section.items" class="items">
            <li v-for="(item, j) in section.items" :key="j">{{ item[locale] }}</li>
          </ul>

          <p v-for="(paragraph, j) in section.after" :key="`a${j}`">{{ paragraph[locale] }}</p>
        </section>

        <footer class="also">
          <span>{{ t('legal.also') }}</span>

          <a :href="legalPath(other)" class="btn" @click.prevent="legal.open(other)">
            <component :is="ICONS[other]" :size="15" /> {{ t(`legal.${other}`) }}
          </a>
        </footer>
      </main>
    </Transition>
  </div>
</template>

<style scoped>
.legal {
  --topbar: 64px;
  min-height: calc((100dvh - var(--mobile-tabs, 0px) - env(safe-area-inset-bottom, 0px)) / var(--ui-zoom));
  zoom: var(--ui-zoom);
}

/* As on the patch notes, only the buttons take clicks; the page scrolls under the bar. */
.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  padding-top: env(safe-area-inset-top, 0px);
  pointer-events: none;
}

/* On a phone the longer Russian labels move the document switch to a second row. */
.bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  max-width: 1200px;
  min-height: var(--topbar);
  margin: 0 auto;
  padding: 10px 20px;
}

.bar .btn {
  flex: none;
  pointer-events: auto;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
}

.switch {
  display: flex;
  gap: 8px;
}

.switch .current {
  border-color: var(--gold);
  color: var(--gold);
}

.page {
  max-width: 760px;
  margin: 0 auto;
  padding: 0 20px calc(80px + env(safe-area-inset-bottom, 0px));
  line-height: 1.6;
}

.masthead {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 40px 0 8px;
}

.title {
  max-width: 100%;
  font-size: clamp(38px, 9vw, 84px);
  line-height: 0.95;
  overflow-wrap: break-word;
  hyphens: auto;
  color: var(--gold);
  text-shadow: 0 10px 40px rgba(244, 197, 91, 0.18);
}

.summary {
  max-width: 60ch;
  margin: 0;
  font-size: 17px;
  color: var(--chalk);
}

.date {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--chalk-faint);
}

.section {
  padding-top: 32px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.section-title::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, var(--edge-strong), transparent);
}

.section p {
  margin: 0 0 10px;
  color: var(--chalk-dim);
}

.items {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0 0 10px;
  padding-left: 20px;
  color: var(--chalk-dim);
}

.items li::marker {
  color: var(--gold);
}

.also {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid var(--edge);
  color: var(--chalk-faint);
}

@media (max-width: 640px) {
  .page {
    padding-inline: 16px;
  }
}
</style>
