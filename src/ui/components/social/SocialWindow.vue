<script setup lang="ts">
import { Bell, BellOff, X } from '@lucide/vue'
import { useEventListener } from '@vueuse/core'
import { computed, nextTick, useTemplateRef, watch } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useVisibleViewport } from '../../composables/useVisibleViewport'
import { useChatStore } from '../../stores/chat'
import { useDuelStore } from '../../stores/duel'
import { useFriendsStore } from '../../stores/friends'
import { useSystemNotificationsStore } from '../../stores/systemNotifications'
import ChatPanel from './ChatPanel.vue'
import FriendsList from './FriendsList.vue'

/**
 * Friends like a messenger: a small window in the corner with the contact list, where a click on a friend
 * opens the conversation in the same window. It floats over whatever screen the player is on.
 */
const friends = useFriendsStore()
const chat = useChatStore()
const duel = useDuelStore()
const system = useSystemNotificationsStore()
const { t } = useGameText()
const viewport = useVisibleViewport()

const window = useTemplateRef<HTMLElement>('window')
const panel = useTemplateRef<InstanceType<typeof ChatPanel>>('chatPanel')

/** Offered once, until the player answers or closes it. */
const offerNotifications = computed(
  () => system.supported && system.permission === 'default' && !system.promptDismissed,
)

const bellTitle = computed(() => {
  if (system.permission === 'denied') {
    return t('systemNotifications.denied')
  }

  return system.active ? t('systemNotifications.on') : t('systemNotifications.off')
})

const chatting = computed(() => friends.friends.find((f) => f.id === chat.friendId) ?? null)

function toggleBell() {
  if (system.permission === 'default') {
    void system.request()
  } else if (system.permission === 'granted') {
    system.enabled = !system.enabled
  }
}

const focusChat = () => panel.value?.focusComposer()

function back() {
  chat.close()
  friends.open = true
}

function close() {
  chat.minimize()

  void nextTick(() =>
    document.querySelector<HTMLElement>('[aria-controls="social-window"]')?.focus({ preventScroll: true }),
  )
}

useEventListener(
  document,
  'keydown',
  (event) => {
    if (event.key !== 'Escape' || event.defaultPrevented || !chat.windowOpen) {
      return
    }

    if (window.value?.querySelector('[data-emoji-open="true"]')) {
      return
    }

    event.preventDefault()
    event.stopImmediatePropagation()
    close()
  },
  { capture: true },
)

watch(
  () => chat.windowOpen,
  (open) => {
    if (!open && window.value?.contains(document.activeElement)) {
      ;(document.activeElement as HTMLElement).blur()
    }
  },
)

/* The list catches up on anything Realtime cannot report, such as being removed by a friend. */
watch(
  () => friends.open,
  (open) => {
    if (open) {
      void friends.refresh()
    }
  },
)

/* A duel that starts takes the player to the board. */
watch(
  () => duel.active?.duel.id,
  (id) => {
    if (id) {
      chat.minimize()
    }
  },
)
</script>

<template>
  <Transition name="social-window" @after-enter="focusChat">
    <aside
      v-show="chat.windowOpen"
      id="social-window"
      ref="window"
      class="social-window"
      :style="viewport.style.value"
      :aria-label="t('friends.title')"
    >
      <ChatPanel
        v-if="chatting"
        ref="chatPanel"
        :key="chatting.id"
        :friend="chatting"
        :active="chat.windowOpen"
        class="panel"
        @back="back"
        @close="close"
      />

      <section v-else class="contacts">
        <header class="head">
          <h2 class="hand title">{{ t('friends.title') }}</h2>

          <span class="tools">
            <button
              v-if="system.supported"
              type="button"
              class="icon-btn bell"
              :class="{ on: system.active }"
              :aria-label="bellTitle"
              :title="bellTitle"
              :disabled="system.permission === 'denied'"
              @click="toggleBell"
            >
              <Bell v-if="system.active" :size="16" />
              <BellOff v-else :size="16" />
            </button>

            <button type="button" class="icon-btn" :aria-label="t('friends.close')" @click="close">
              <X :size="16" />
            </button>
          </span>
        </header>

        <div v-if="offerNotifications" class="offer">
          <p>{{ t('systemNotifications.prompt') }}</p>

          <div class="offer-actions">
            <button type="button" class="btn primary small" @click="system.request()">
              <Bell :size="14" /> {{ t('systemNotifications.enable') }}
            </button>

            <button type="button" class="btn ghost small" @click="system.promptDismissed = true">
              {{ t('systemNotifications.later') }}
            </button>
          </div>
        </div>

        <div class="scroll">
          <FriendsList />
        </div>
      </section>
    </aside>
  </Transition>
</template>

<style scoped>
.social-window {
  position: fixed;
  right: 16px;
  bottom: calc(var(--visible-bottom, 0px) + 16px + env(safe-area-inset-bottom, 0px));
  z-index: 45;
  display: flex;
  width: min(380px, calc(100vw - 32px));
  height: min(560px, calc(var(--visible-height, 100dvh) - 32px - env(safe-area-inset-bottom, 0px)));
  padding: 12px;
  border-radius: 16px;
  background: var(--panel);
  border: 1px solid var(--edge-strong);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
}

.panel,
.contacts {
  flex: 1;
  min-width: 0;
}

.contacts {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--edge);
}

.title {
  margin: 0;
  font-size: 28px;
  line-height: 1;
}

.tools {
  display: flex;
  gap: 6px;
}

.bell {
  color: var(--chalk-faint);
}

.bell.on {
  color: var(--gold);
}

.offer {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(244, 197, 91, 0.08);
  border: 1px solid rgba(244, 197, 91, 0.4);
}

.offer p {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.4;
  color: var(--chalk-dim);
}

.offer-actions {
  display: flex;
  gap: 8px;
}

.small {
  padding: 6px 10px;
  font-size: 12.5px;
}

.scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.social-window-enter-active,
.social-window-leave-active {
  transition:
    opacity 0.18s ease-out,
    transform 0.18s ease-out;
}

.social-window-enter-from,
.social-window-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

@media (max-width: 520px) {
  .social-window {
    right: 8px;
    left: 8px;
    width: auto;
    height: min(580px, calc(var(--visible-height, 100dvh) - 24px - env(safe-area-inset-bottom, 0px)));
  }
}
</style>
