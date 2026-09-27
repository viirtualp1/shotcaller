<script setup lang="ts">
import { Menu } from 'lucide-vue-next'
import { useGameText } from '../../composables/useGameText'
import { useMenuStore } from '../../stores/menu'

const menu = useMenuStore()
const { t } = useGameText()
</script>

<template>
  <div class="menu">
    <button
      type="button"
      class="icon-btn"
      :aria-label="t('hud.menu')"
      :title="`${t('hud.menu')} · Esc`"
      @click="menu.gameMenu = true"
    >
      <Menu :size="18" />
    </button>

    <span class="brand hand">{{ t('app.title') }}</span>
  </div>
</template>

<style scoped>
.menu {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand {
  font-size: 28px;
  line-height: 1;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
}
</style>
