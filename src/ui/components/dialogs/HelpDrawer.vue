<script setup lang="ts">
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { ITEM_IDS, ROLE_IDS, SYNERGY_IDS } from '@/content/ids'
import { ITEMS } from '@/content/items'
import ItemIcon from '../common/ItemIcon.vue'
import { useGameText } from '../../composables/useGameText'

const open = defineModel<boolean>('open', { required: true })
const text = useGameText()
const { t } = text
const STEPS = ['shop', 'lanes', 'fight', 'grow'] as const
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="overlay" />

      <DialogContent class="drawer" :aria-describedby="undefined">
        <header>
          <DialogTitle class="hand title">{{ t('help.title') }}</DialogTitle>
          <DialogClose class="btn ghost">{{ t('help.close') }}</DialogClose>
        </header>

        <section>
          <h3>{{ t('help.how') }}</h3>

          <ol class="steps">
            <li v-for="step in STEPS" :key="step">{{ t(`start.steps.${step}`) }}</li>
          </ol>
        </section>

        <section>
          <h3>{{ t('help.synergies') }}</h3>

          <dl>
            <template v-for="id in SYNERGY_IDS" :key="id">
              <dt>
                {{ text.synergyName(id) }} <span>{{ text.synergyNeed(id) }}</span>
              </dt>

              <dd>{{ text.synergyEffect(id) }}</dd>
            </template>
          </dl>
        </section>

        <section>
          <h3>{{ t('help.roles') }}</h3>

          <dl>
            <template v-for="role in ROLE_IDS" :key="role">
              <dt>{{ text.roleName(role) }}</dt>
              <dd>{{ text.rolePassive(role) }}</dd>
            </template>
          </dl>
        </section>

        <section>
          <h3>{{ t('help.items') }}</h3>

          <ul class="item-list">
            <li v-for="id in ITEM_IDS" :key="id">
              <ItemIcon :item-id="id" :size="26" />

              <span>
                <b>{{ text.itemName(id) }}</b> ·
                <span class="cost"><span class="coin" /> {{ ITEMS[id].cost }}</span>
                <br />
                <span class="muted">{{ text.itemDescription(id) }}</span>
              </span>
            </li>
          </ul>
        </section>

        <section>
          <h3>{{ t('help.stars') }}</h3>
          <p>{{ t('help.starsText') }}</p>
        </section>

        <section>
          <h3>{{ t('help.economy') }}</h3>
          <p>{{ t('help.economyText') }}</p>
          <p class="hotkeys">{{ t('help.hotkeys') }}</p>
        </section>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(420px, 100vw);
  overflow-y: auto;
  padding: calc(18px + env(safe-area-inset-top, 0px)) 20px calc(24px + env(safe-area-inset-bottom, 0px));
  background: var(--panel);
  border-left: 1px solid var(--edge-strong);
  box-shadow: -20px 0 50px rgba(0, 0, 0, 0.45);
  z-index: 41;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 36px;
  line-height: 1;
}

h3 {
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--chalk-dim);
}

p,
dd {
  margin: 0;
}

.steps {
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

dl {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
}

dt {
  margin-top: 8px;
  font-weight: 700;
}

dt span {
  font-weight: 400;
  color: var(--chalk-dim);
  font-size: 12px;
  margin-left: 6px;
}

dd {
  color: var(--chalk-dim);
}

.item-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.item-list li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13px;
}

.cost {
  color: var(--gold);
}

.muted {
  color: var(--chalk-dim);
}

.hotkeys {
  margin-top: 8px;
  color: var(--chalk-dim);
  font-size: 12px;
}
</style>
