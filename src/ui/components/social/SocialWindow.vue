<script setup lang="ts">
import { Bell, BellOff, UserPlus, X } from '@lucide/vue'
import { useEventListener } from '@vueuse/core'
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useVisibleViewport } from '../../composables/useVisibleViewport'
import { useChatStore } from '../../stores/chat'
import { useDuelStore } from '../../stores/duel'
import { useFriendsStore } from '../../stores/friends'
import { useModalsStore } from '../../stores/modals'
import { useSystemNotificationsStore } from '../../stores/systemNotifications'
import AddFriendDialog from './AddFriendDialog.vue'
import ChatPanel from './ChatPanel.vue'
import FriendsList from './FriendsList.vue'

/**
 * Friends and conversations share a window; the backdrop closes it without sending clicks to the game.
 */
const friends = useFriendsStore()
const chat = useChatStore()
const duel = useDuelStore()
const modals = useModalsStore()
const system = useSystemNotificationsStore()
const { t } = useGameText()
const viewport = useVisibleViewport()

const window = useTemplateRef<HTMLElement>('window')
const adding = ref(false)
/** Set while the window moves between the start screen's column and the corner, which happens without a fade. */
const moving = ref(false)
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

/* Docked on the start screen, the window stays: closing a conversation goes back to the list. */
function close() {
  if (chat.docked) {
    back()

    return
  }

  chat.minimize()

  void nextTick(() =>
    document.querySelector<HTMLElement>('[aria-controls="social-window"]')?.focus({ preventScroll: true }),
  )
}

/* A dialog over the window, such as a friend's profile opened from the chat, takes Esc and closes alone. */
useEventListener(
  document,
  'keydown',
  (event) => {
    if (
      event.key !== 'Escape' ||
      event.defaultPrevented ||
      modals.anyOpen ||
      !chat.windowOpen ||
      (chat.docked && !chatting.value)
    ) {
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
  () => friends.open || chat.docked,
  (open) => {
    if (open) {
      void friends.refresh()
    }
  },
)

watch(
  () => chat.docked,
  () => {
    moving.value = true

    setTimeout(() => {
      moving.value = false
    }, 50)
  },
  { flush: 'sync' },
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
  <Teleport :to="chat.docked ? '#home-friends' : 'body'" defer>
    <Transition name="social-backdrop">
      <div v-if="chat.windowOpen && !chat.docked" class="social-backdrop" aria-hidden="true" @click="close" />
    </Transition>

    <Transition name="social-window" :css="!moving" @after-enter="focusChat">
      <aside
        v-show="chat.windowOpen || chat.docked"
        id="social-window"
        ref="window"
        class="social-window"
        :class="{ docked: chat.docked }"
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

              <button
                v-if="friends.card"
                type="button"
                class="icon-btn"
                :aria-label="t('friends.addFriend')"
                :title="t('friends.addFriend')"
                @click="adding = true"
              >
                <UserPlus :size="16" />
              </button>

              <button
                v-if="!chat.docked"
                type="button"
                class="icon-btn"
                :aria-label="t('friends.close')"
                @click="close"
              >
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

        <AddFriendDialog v-model:open="adding" />
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
.social-backdrop {
  position: fixed;
  inset: 0;
  z-index: 44;
  background: rgba(8, 12, 11, 0.62);
  backdrop-filter: blur(2px);
}

.social-window {
  position: fixed;
  right: 16px;
  bottom: calc(var(--visible-bottom, 0px) + 16px + env(safe-area-inset-bottom, 0px));
  z-index: 45;
  display: flex;
  width: min(380px, calc(100vw - 32px));
  height: min(560px, calc(var(--visible-height, 100dvh) - 32px - env(safe-area-inset-bottom, 0px)));
  padding: 12px;
  border-radius: var(--radius);
  background: var(--panel);
  border: 1px solid var(--edge-strong);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
}

/* In the start screen's column it fills the space beside the board instead of floating over the page. */
.social-window.docked {
  position: static;
  z-index: auto;
  width: auto;
  height: 100%;
  box-shadow: none;
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
  padding-bottom: 12px;
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
  margin-left: auto;
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
  border-radius: var(--radius);
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
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
}

.social-backdrop-enter-active,
.social-backdrop-leave-active,
.social-window-enter-active,
.social-window-leave-active {
  transition:
    opacity 0.18s ease-out,
    transform 0.18s ease-out;
}

.social-backdrop-enter-from,
.social-backdrop-leave-to {
  opacity: 0;
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
