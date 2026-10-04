<script setup lang="ts">
import { Check, Swords } from '@lucide/vue'
import { computed } from 'vue'
import { useSettingsStore } from '../../stores/settings'

const settings = useSettingsStore()

const copy = computed(() =>
  settings.locale === 'ru'
    ? {
        ready: 'Готово',
        game: 'Игра',
        discord: 'Discord',
        open: 'Играть',
      }
    : {
        ready: 'Ready',
        game: 'Game',
        discord: 'Discord',
        open: 'Play',
      },
)
</script>

<template>
  <div class="scene">
    <article class="setup">
      <header class="bar">
        <span class="mark">
          <Swords :size="18" />
        </span>

        <span class="name">
          <strong>The Shotcaller</strong>
          <em>{{ copy.ready }}</em>
        </span>
      </header>

      <div class="body">
        <div class="file">
          <b>TheShotcaller.exe</b>
          <Check :size="14" />
        </div>

        <div class="track">
          <i />
        </div>

        <ul class="steps">
          <li>
            <Check :size="14" />
            {{ copy.game }}
          </li>

          <li>
            <Check :size="14" />
            {{ copy.discord }}
          </li>
        </ul>

        <div class="go">{{ copy.open }}</div>
      </div>
    </article>
  </div>
</template>

<style scoped>
.scene {
  width: min(420px, 92%);
  padding: 12px;
}

.setup {
  overflow: hidden;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  background: var(--panel);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.38);
}

.bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--panel-raised);
  border-bottom: 1px solid var(--edge);
}

.mark {
  display: grid;
  place-items: center;
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: var(--radius);
  background: var(--gold);
  color: var(--ink);
}

.name {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.name strong {
  font-family: var(--font-hand);
  font-size: 26px;
  font-weight: 700;
  line-height: 1;
  color: var(--chalk);
}

.name em {
  color: var(--heal);
  font-size: 12px;
  font-style: normal;
  font-weight: 700;
}

.body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.file {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: rgba(236, 232, 220, 0.04);
  color: var(--heal);
}

.file b {
  color: var(--chalk);
  font-size: 13px;
  font-weight: 700;
}

.track {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(236, 232, 220, 0.12);
}

.track i {
  display: block;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, #b98a26, var(--gold));
}

.steps {
  display: flex;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.steps li {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  padding: 7px 10px;
  border: 1px solid rgba(127, 224, 180, 0.45);
  border-radius: var(--radius);
  background: rgba(127, 224, 180, 0.08);
  color: var(--chalk);
  font-size: 13px;
  font-weight: 700;
}

.steps svg {
  flex: none;
  color: var(--heal);
}

.go {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  border-radius: var(--radius);
  background: var(--gold);
  color: var(--ink);
  font-size: 15px;
  font-weight: 800;
}
</style>
