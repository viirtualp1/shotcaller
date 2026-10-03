import { defineStore } from 'pinia'
import { computed } from 'vue'
import { usePage } from '../composables/usePage'
import { LEGAL_DOCUMENTS, legalFromPath, legalPath, type LegalId } from '../legal/documents'

export const useLegalStore = defineStore('legal', () => {
  const page = usePage(legalFromPath, legalPath)

  const document = computed(() => (page.state.value === null ? null : LEGAL_DOCUMENTS[page.state.value]))

  return {
    document,
    open: (id: LegalId) => page.open(id),
    close: page.close,
  }
})
