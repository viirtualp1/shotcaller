<script setup lang="ts">
import enData from 'emoji-picker-element-data/en/cldr/data.json?url'
import ruData from 'emoji-picker-element-data/ru/cldr/data.json?url'
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import { useSettingsStore } from '../../stores/settings'

/**
 * The full emoji panel, like in messengers: categories, search, recent ones. The picker and its data load
 * only when the panel first opens; the data ships with the game, nothing is fetched from elsewhere.
 */
const emit = defineEmits<{ pick: [emoji: string] }>()

const settings = useSettingsStore()
const host = useTemplateRef<HTMLElement>('host')
let picker: HTMLElement | null = null

onMounted(async () => {
  const russian = settings.locale === 'ru'

  const [{ Picker }, { default: i18n }] = await Promise.all([
    import('emoji-picker-element'),
    russian ? import('emoji-picker-element/i18n/ru_RU') : import('emoji-picker-element/i18n/en'),
  ])

  if (!host.value) {
    return
  }

  picker = new Picker({
    locale: russian ? 'ru' : 'en',
    dataSource: russian ? ruData : enData,
    i18n,
  })

  picker.classList.add('dark')

  picker.addEventListener('emoji-click', (event) => {
    const unicode = (event as CustomEvent<{ unicode?: string }>).detail.unicode
    if (unicode) {
      emit('pick', unicode)
    }
  })

  host.value.appendChild(picker)
})

onBeforeUnmount(() => picker?.remove())
</script>

<template>
  <div ref="host" class="emoji-picker" />
</template>

<style scoped>
.emoji-picker :deep(emoji-picker) {
  --background: #111815;
  --border-color: var(--edge);
  --indicator-color: var(--gold);
  --input-border-color: var(--edge-strong);
  --input-font-color: var(--chalk);
  --input-placeholder-color: var(--chalk-faint);
  --button-hover-background: rgba(255, 255, 255, 0.08);
  --button-active-background: rgba(255, 255, 255, 0.14);
  --category-font-color: var(--chalk-dim);
  --outline-color: var(--gold);
  --num-columns: 8;
  --emoji-size: 1.35rem;
  width: 100%;
  height: 300px;
  border-radius: var(--radius);
}
</style>
