<script setup lang="ts">
import { useClipboard, useTimeoutFn } from '@vueuse/core'
import {
  Ban,
  Check,
  Copy,
  Inbox,
  MessageCircle,
  Send,
  Swords,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-vue-next'
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { computed, ref, watch } from 'vue'
import {
  formatFriendCode,
  isFriendCode,
  normalizeFriendCode,
  type FriendRequestResult,
} from '@/application/social/friends'
import { HERO_IDS } from '@/content/ids'
import { rankFor } from '@/domain/profile/progression'
import { useGameText } from '../../composables/useGameText'
import { useChatStore } from '../../stores/chat'
import { useCloudStore } from '../../stores/cloud'
import { useDuelStore } from '../../stores/duel'
import { useFriendsStore } from '../../stores/friends'
import CoachAvatar from '../profile/CoachAvatar.vue'
import ChatPanel from './ChatPanel.vue'

/** A remove button asks once more; the question goes away on its own. */
const CONFIRM_MS = 3000

const cloud = useCloudStore()
const friends = useFriendsStore()
const chat = useChatStore()
const duel = useDuelStore()
const { t } = useGameText()
const { copy, copied } = useClipboard({ legacy: true })

const code = ref('')
const result = ref<FriendRequestResult | 'error' | null>(null)
const sending = ref(false)
const confirming = ref<string | null>(null)

const { start: expireConfirm } = useTimeoutFn(() => (confirming.value = null), CONFIRM_MS, {
  immediate: false,
})

const valid = computed(() => isFriendCode(code.value))
const ownCode = computed(() => (friends.card ? formatFriendCode(friends.card.friendCode) : ''))
const succeeded = computed(() => result.value === 'sent' || result.value === 'accepted')

const heroOf = (avatar: string | null) => HERO_IDS.find((id) => id === avatar) ?? 'spearman'

/** The friend whose conversation is open in the panel. */
const chatting = computed(() => friends.friends.find((f) => f.id === chat.friendId) ?? null)

/* A duel that starts takes the player to the board. */
watch(
  () => duel.active?.duel.id,
  (id) => {
    if (id) {
      friends.open = false
    }
  },
)

/* Opening the panel catches up on anything Realtime cannot report, such as being removed by a friend. */
watch(
  () => friends.open,
  (open) => {
    if (open) {
      void friends.refresh()
    } else {
      chat.close()
    }
  },
)

function signIn() {
  friends.open = false
  cloud.signInOpen = true
}

async function submit() {
  if (!valid.value || sending.value) {
    return
  }

  sending.value = true
  result.value = await friends.add(normalizeFriendCode(code.value))
  sending.value = false

  if (succeeded.value) {
    code.value = ''
  }
}

function askRemove(id: string) {
  if (confirming.value !== id) {
    confirming.value = id
    expireConfirm()

    return
  }

  confirming.value = null
  void friends.remove(id)
}
</script>

<template>
  <DialogRoot v-model:open="friends.open">
    <DialogPortal>
      <DialogOverlay class="overlay" />

      <DialogContent class="drawer" :class="{ chatting }" :aria-describedby="undefined">
        <header class="top">
          <DialogTitle class="hand title">{{ t('friends.title') }}</DialogTitle>
          <DialogClose class="btn ghost">{{ t('friends.close') }}</DialogClose>
        </header>

        <section v-if="!cloud.signedIn" class="card gate">
          <p>{{ t('friends.signInHint') }}</p>

          <button type="button" class="btn primary" @click="signIn">{{ t('friends.signIn') }}</button>
        </section>

        <p v-else-if="!friends.card && friends.status !== 'error'" class="muted">
          {{ t('friends.loading') }}
        </p>

        <section v-else-if="!friends.card" class="card gate">
          <p>{{ t('friends.error') }}</p>

          <button type="button" class="btn" @click="friends.refresh()">{{ t('friends.retry') }}</button>
        </section>

        <ChatPanel
          v-else-if="chatting"
          :key="chatting.id"
          :friend="chatting"
          class="chat"
          @back="chat.close()"
        />

        <template v-else>
          <section class="card own">
            <span class="eyebrow">{{ t('friends.yourCode') }}</span>

            <div class="code-row">
              <strong class="code">{{ ownCode }}</strong>

              <button
                type="button"
                class="icon-btn"
                :aria-label="t('friends.copy')"
                :title="copied ? t('friends.copied') : t('friends.copy')"
                @click="copy(ownCode)"
              >
                <Check v-if="copied" :size="16" class="good" />
                <Copy v-else :size="16" />
              </button>
            </div>

            <p>{{ t('friends.codeHint') }}</p>
          </section>

          <form class="add" @submit.prevent="submit">
            <label class="section-title" for="friend-code">
              <UserPlus :size="15" /> {{ t('friends.addTitle') }}
            </label>

            <div class="add-row">
              <input
                id="friend-code"
                v-model="code"
                class="code-input"
                maxlength="12"
                autocomplete="off"
                autocapitalize="characters"
                spellcheck="false"
                placeholder="ABCD-2345"
                :aria-label="t('friends.codeLabel')"
                @input="result = null"
              />

              <button type="submit" class="btn primary" :disabled="!valid || sending">
                {{ t('friends.add') }}
              </button>
            </div>

            <p v-if="result" class="result" :class="{ good: succeeded }" role="status">
              {{ t(`friends.results.${result}`) }}
            </p>
          </form>

          <section v-if="friends.incoming.length">
            <h3 class="section-title"><Inbox :size="15" /> {{ t('friends.incoming') }}</h3>

            <ul class="list">
              <li v-for="entry in friends.incoming" :key="entry.id" class="row">
                <CoachAvatar :hero-id="heroOf(entry.avatar)" :size="36" />

                <span class="who">
                  <strong class="name">{{ entry.name || t('profile.defaultName') }}</strong>
                  <span class="meta">{{ t(`profile.ranks.${rankFor(entry.rating).tier}`) }}</span>
                </span>

                <button
                  type="button"
                  class="icon-btn accept"
                  :aria-label="t('friends.accept')"
                  :title="t('friends.accept')"
                  @click="friends.accept(entry.id)"
                >
                  <Check :size="16" />
                </button>

                <button
                  type="button"
                  class="icon-btn"
                  :aria-label="t('friends.decline')"
                  :title="t('friends.decline')"
                  @click="friends.decline(entry.id)"
                >
                  <X :size="16" />
                </button>
              </li>
            </ul>
          </section>

          <section>
            <h3 class="section-title"><Users :size="15" /> {{ t('friends.list') }}</h3>

            <p v-if="!friends.friends.length" class="muted">{{ t('friends.empty') }}</p>

            <ul v-else class="list">
              <li
                v-for="entry in friends.friends"
                :key="entry.id"
                class="row"
                :class="{ online: friends.isOnline(entry.id) }"
              >
                <button
                  type="button"
                  class="open"
                  :aria-label="t('chat.open', { name: entry.name || t('profile.defaultName') })"
                  @click="chat.open(entry.id)"
                >
                  <span class="avatar">
                    <CoachAvatar :hero-id="heroOf(entry.avatar)" :size="36" />
                    <i class="presence" />
                  </span>

                  <span class="who">
                    <strong class="name">{{ entry.name || t('profile.defaultName') }}</strong>

                    <span class="meta">
                      {{ friends.isOnline(entry.id) ? t('friends.online') : t('friends.offline') }}
                      · {{ t(`profile.ranks.${rankFor(entry.rating).tier}`) }}
                    </span>
                  </span>

                  <span
                    v-if="chat.unreadFrom(entry.id)"
                    class="unread"
                    :aria-label="t('chat.unread', { n: chat.unreadFrom(entry.id) })"
                  >
                    {{ chat.unreadFrom(entry.id) }}
                  </span>

                  <MessageCircle v-else :size="16" class="chat-icon" />
                </button>

                <button
                  v-if="friends.isOnline(entry.id) && !duel.busy"
                  type="button"
                  class="icon-btn duel"
                  :aria-label="t('duel.challengeName', { name: entry.name || t('profile.defaultName') })"
                  :title="t('duel.challenge')"
                  @click="duel.invite(entry.id)"
                >
                  <Swords :size="16" />
                </button>

                <button
                  type="button"
                  class="icon-btn remove"
                  :class="{ confirming: confirming === entry.id }"
                  :aria-label="t('friends.remove')"
                  :title="t('friends.remove')"
                  @click="askRemove(entry.id)"
                >
                  <span v-if="confirming === entry.id">{{ t('friends.confirmRemove') }}</span>
                  <UserMinus v-else :size="16" />
                </button>
              </li>
            </ul>
          </section>

          <section v-if="friends.outgoing.length">
            <h3 class="section-title"><Send :size="15" /> {{ t('friends.outgoing') }}</h3>

            <ul class="list">
              <li v-for="entry in friends.outgoing" :key="entry.id" class="row pending">
                <CoachAvatar :hero-id="heroOf(entry.avatar)" :size="36" />

                <span class="who">
                  <strong class="name">{{ entry.name || t('profile.defaultName') }}</strong>
                </span>

                <button
                  type="button"
                  class="icon-btn"
                  :aria-label="t('friends.cancel')"
                  :title="t('friends.cancel')"
                  @click="friends.remove(entry.id)"
                >
                  <X :size="16" />
                </button>
              </li>
            </ul>
          </section>

          <section v-if="friends.blocked.length">
            <h3 class="section-title"><Ban :size="15" /> {{ t('friends.blocked') }}</h3>

            <ul class="list">
              <li v-for="entry in friends.blocked" :key="entry.id" class="row pending">
                <CoachAvatar :hero-id="heroOf(entry.avatar)" :size="36" />

                <span class="who">
                  <strong class="name">{{ entry.name || t('profile.defaultName') }}</strong>
                </span>

                <button type="button" class="btn ghost" @click="friends.unblock(entry.id)">
                  {{ t('friends.unblock') }}
                </button>
              </li>
            </ul>
          </section>
        </template>
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
  gap: 22px;
  animation: slide-in 0.25s ease-out;
}

.drawer.chatting {
  overflow: hidden;
}

.chat {
  flex: 1;
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 36px;
  line-height: 1;
}

section,
.add {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--gold);
}

p {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--chalk-dim);
}

.muted {
  color: var(--chalk-faint);
}

.card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--edge);
}

.gate {
  align-items: flex-start;
}

.code-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.code {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 0.12em;
  font-variant-numeric: tabular-nums;
  color: var(--chalk);
}

.good {
  color: #7fe0b4;
}

.add-row {
  display: flex;
  gap: 8px;
}

.code-input {
  flex: 1;
  min-width: 0;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--edge-strong);
  background: #0f1614;
  color: var(--chalk);
  font: 700 16px/1.3 var(--font-ui);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.code-input::placeholder {
  color: var(--chalk-faint);
  letter-spacing: 0.12em;
}

.code-input:focus {
  outline: none;
  border-color: var(--gold);
}

.result {
  font-weight: 600;
  color: var(--theirs);
}

.result.good {
  color: #7fe0b4;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--edge);
}

.row.pending {
  opacity: 0.75;
}

.open {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.open:hover .name {
  color: var(--gold);
}

.chat-icon {
  flex: none;
  color: var(--chalk-faint);
}

.unread {
  flex: none;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--gold);
  color: var(--ink);
  font-size: 11.5px;
  font-weight: 800;
  line-height: 20px;
  text-align: center;
}

.avatar {
  position: relative;
  display: grid;
}

.presence {
  position: absolute;
  right: -1px;
  bottom: -1px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--chalk-faint);
  box-shadow: 0 0 0 2px var(--panel);
}

.online .presence {
  background: #7fe0b4;
}

.who {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.name {
  overflow: hidden;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  font-size: 11.5px;
  color: var(--chalk-faint);
}

.online .meta {
  color: #7fe0b4;
}

.icon-btn.accept {
  border-color: rgba(127, 224, 180, 0.5);
  color: #7fe0b4;
}

.icon-btn.duel {
  border-color: rgba(244, 197, 91, 0.5);
  color: var(--gold);
}

.icon-btn.remove {
  width: auto;
  min-width: 36px;
  padding: 0 8px;
  color: var(--chalk-dim);
  font-size: 12px;
  font-weight: 700;
}

.icon-btn.remove.confirming {
  border-color: rgba(255, 112, 96, 0.6);
  color: var(--theirs);
}
</style>
