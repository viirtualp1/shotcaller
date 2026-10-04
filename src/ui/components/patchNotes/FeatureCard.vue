<script setup lang="ts">
import type { FeatureNote } from '../../patchNotes/notes'
import FeatureArt from './FeatureArt.vue'
import NoteLine from './NoteLine.vue'

/** A highlight of a major update; `wide` lays the picture beside the words instead of above them. */
withDefaults(defineProps<{ feature: FeatureNote; wide?: boolean }>(), { wide: false })
</script>

<template>
  <article class="feature" :class="{ wide }">
    <FeatureArt :art="feature.art" class="picture" />

    <div class="words">
      <h3 class="title"><NoteLine :text="feature.title" /></h3>
      <p class="text"><NoteLine :text="feature.text" /></p>
    </div>
  </article>
</template>

<style scoped>
.feature {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: var(--radius);
  border: 1px solid var(--edge);
  background: var(--panel);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.3);
  transition:
    border-color 0.2s,
    transform 0.2s;
}

.feature:hover {
  border-color: rgba(244, 197, 91, 0.45);
  transform: translateY(-2px);
}

.feature:not(.wide) {
  display: grid;
  grid-template-rows: subgrid;
  grid-row: span 2;
  gap: 0;
}

.picture {
  border-bottom: 1px solid var(--edge);
}

.words {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 18px 18px;
}

.title {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.2;
}

.text {
  margin: 0;
  min-width: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--chalk-dim);
  overflow-wrap: anywhere;
}

.wide {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
}

.wide .picture {
  border-bottom: 0;
  border-right: 1px solid var(--edge);
}

.wide .words {
  justify-content: center;
  padding: 24px 28px;
}

.wide .title {
  font-size: 26px;
}

.wide .text {
  font-size: 15px;
}

@media (max-width: 640px) {
  .wide {
    display: flex;
  }

  .wide .picture {
    border-right: 0;
    border-bottom: 1px solid var(--edge);
  }

  .wide .words {
    padding: 16px 18px 18px;
  }

  .wide .title {
    font-size: 20px;
  }
}
</style>
