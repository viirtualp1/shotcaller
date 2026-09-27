<template>
  <div class="frame">
    <div class="surface">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.frame {
  position: relative;
  padding: 10px;
  border-radius: 10px;
  background:
    repeating-linear-gradient(97deg, rgba(0, 0, 0, 0.06) 0 2px, transparent 2px 9px),
    linear-gradient(135deg, var(--wood-light), var(--wood) 45%, #6f5139 70%, var(--wood-dark));
  box-shadow:
    0 14px 34px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.14);
}

.surface {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 3px;
  overflow: hidden;
  background: var(--board);
  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.5),
    inset 0 0 40px rgba(0, 0, 0, 0.35);
}
</style>
