<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { useGameText } from '../../composables/useGameText'
import { useModal } from '../../composables/useModal'
import { useMatchStore } from '../../stores/match'
import ItemDetails from '../common/ItemDetails.vue'
import ItemIcon from '../common/ItemIcon.vue'

const store = useMatchStore()
const text = useGameText()
const { t } = text

useModal(() => store.pendingRecipe !== null)
</script>

<template>
  <DialogRoot :open="store.pendingRecipe !== null" @update:open="!$event && (store.pendingRecipe = null)">
    <DialogPortal>
      <DialogOverlay class="overlay" />

      <DialogContent v-if="store.pendingRecipe" class="sheet recipe-confirm">
        <DialogTitle class="hand">{{
          t('recipes.combine', { name: text.itemName(store.pendingRecipe.result) })
        }}</DialogTitle>

        <DialogDescription>{{ t('recipes.confirm') }}</DialogDescription>

        <div class="formula">
          <ItemIcon :item-id="store.pendingRecipe.parts[0]" :size="48" />
          <span>+</span>
          <ItemIcon :item-id="store.pendingRecipe.parts[1]" :size="48" />
          <span>→</span>
          <ItemIcon :item-id="store.pendingRecipe.result" :size="64" />
        </div>

        <ItemDetails :item-id="store.pendingRecipe.result" />

        <div class="actions">
          <DialogClose class="btn ghost">{{ t('recipes.cancel') }}</DialogClose>

          <button class="btn primary" type="button" @click="store.confirmCombine()">
            {{ t('recipes.combine', { name: text.itemName(store.pendingRecipe.result) }) }}
          </button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.recipe-confirm {
  display: grid;
  gap: 18px;
  width: min(440px, calc(100vw - 32px));
  border-radius: var(--radius);
}
.hand {
  font-size: 32px;
  line-height: 1.1;
}
.formula {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--gold);
}
.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}
</style>
