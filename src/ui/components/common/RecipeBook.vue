<script setup lang="ts">
import { RECIPES } from '@/content/items'
import { useGameText } from '../../composables/useGameText'
import ItemIcon from './ItemIcon.vue'

const text = useGameText()
const { t } = text
</script>

<template>
  <section class="recipe-book">
    <h3>{{ t('recipes.title') }}</h3>
    <p>{{ t('recipes.hint') }}</p>

    <article v-for="recipe in RECIPES" :key="recipe.result" class="recipe-row">
      <div class="formula">
        <ItemIcon :item-id="recipe.a" /><span>+</span><ItemIcon :item-id="recipe.b" />

        <span>→</span>

        <ItemIcon :item-id="recipe.result" />
      </div>

      <div>
        <strong>{{ text.itemName(recipe.result) }}</strong>

        <small>{{ text.itemName(recipe.a) }} + {{ text.itemName(recipe.b) }}</small>
        <p>{{ text.itemDescription(recipe.result) }}</p>
      </div>
    </article>
  </section>
</template>

<style scoped>
.recipe-book {
  display: grid;
  gap: 14px;
}
.recipe-book h3,
.recipe-book p {
  margin: 0;
}
.recipe-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 18px;
  padding: 14px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
}
.recipe-row > div:last-child {
  flex: 1 1 200px;
}
.formula {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--gold);
}
small {
  display: block;
  color: var(--gold);
  margin: 4px 0;
}
p {
  color: var(--chalk-dim);
  font-size: 13px;
  white-space: pre-line;
}
</style>
