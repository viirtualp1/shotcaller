<script setup lang="ts">
import { onClickOutside, useTextareaAutosize } from '@vueuse/core'
import { ArrowLeft, SendHorizontal, Smile, Swords, X } from 'lucide-vue-next'
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { MESSAGE_MAX_LENGTH } from '@/application/social/chat'
import type { FriendEntry } from '@/application/social/friends'
import { HERO_IDS } from '@/content/ids'
import { useFriendStatus } from '../../composables/useFriendStatus'
import { useGameText } from '../../composables/useGameText'
import { useChatStore } from '../../stores/chat'
import { useDuelStore } from '../../stores/duel'
import { useFriendsStore } from '../../stores/friends'
import { useSettingsStore } from '../../stores/settings'
import CoachAvatar from '../profile/CoachAvatar.vue'
import EmojiPicker from './EmojiPicker.vue'

const SHOW_COUNTER_FROM = MESSAGE_MAX_LENGTH - 100

const props = defineProps<{ friend: FriendEntry }>()
const emit = defineEmits<{ back: []; close: [] }>()

const chat = useChatStore()
const friends = useFriendsStore()
const duel = useDuelStore()
const settings = useSettingsStore()
const { t } = useGameText()
const statusText = useFriendStatus()
const list = useTemplateRef<HTMLElement>('list')
const field = useTemplateRef<HTMLTextAreaElement>('field')
const { input } = useTextareaAutosize({ element: field })
const picking = ref(false)

onClickOutside(useTemplateRef<HTMLElement>('emoji'), () => (picking.value = false), {
  ignore: ['.emoji-toggle'],
})

const clock = computed(
  () =>
    new Intl.DateTimeFormat(settings.locale, {
      hour: '2-digit',
      minute: '2-digit',
    }),
)

const hero = computed(() => HERO_IDS.find((id) => id === props.friend.avatar) ?? 'spearman')
const online = computed(() => friends.isOnline(props.friend.id))
const canSend = computed(() => input.value.trim().length > 0 && !chat.sending)

function scrollToEnd() {
  void nextTick(() => list.value?.scrollTo({ top: list.value.scrollHeight }))
}

/* New messages scroll into view; older ones loaded above keep the reader where they were. */
watch(() => chat.messages.at(-1)?.id, scrollToEnd, { immediate: true })

async function showOlder() {
  const el = list.value
  const before = el?.scrollHeight ?? 0
  await chat.loadOlder()
  await nextTick()

  if (el) {
    el.scrollTop += el.scrollHeight - before
  }
}

async function submit() {
  if (!canSend.value) {
    return
  }

  if (await chat.send(input.value)) {
    input.value = ''
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    void submit()
  }
}

/** Puts the emoji where the caret is, as long as the message stays within the limit. */
async function insertEmoji(emoji: string) {
  const el = field.value
  const start = el?.selectionStart ?? input.value.length
  const end = el?.selectionEnd ?? start
  const next = input.value.slice(0, start) + emoji + input.value.slice(end)

  if (next.length > MESSAGE_MAX_LENGTH) {
    return
  }

  input.value = next
  await nextTick()
  el?.focus()
  el?.setSelectionRange(start + emoji.length, start + emoji.length)
}
</script>

<template>
  <section class="chat">
    <header class="head">
      <button
        type="button"
        class="icon-btn back"
        :aria-label="t('chat.toFriends')"
        :title="t('chat.toFriends')"
        @click="emit('back')"
      >
        <ArrowLeft :size="16" />
      </button>

      <button
        type="button"
        class="profile"
        :class="{ online }"
        :aria-label="t('friends.openProfile', { name: friend.name || t('profile.defaultName') })"
        @click="friends.openProfile(friend.id)"
      >
        <span class="avatar">
          <CoachAvatar :hero-id="hero" :size="36" />
          <i class="presence" />
        </span>

        <span class="who">
          <strong class="name">{{ friend.name || t('profile.defaultName') }}</strong>
          <span class="status">{{ statusText(friend.id) }}</span>
        </span>
      </button>

      <button
        v-if="online && !duel.busy"
        type="button"
        class="icon-btn duel"
        :aria-label="t('duel.challengeName', { name: friend.name || t('profile.defaultName') })"
        :title="t('duel.challenge')"
        @click="duel.challenge(friend.id)"
      >
        <Swords :size="16" />
      </button>

      <button
        type="button"
        class="icon-btn"
        :aria-label="t('chatWindow.close')"
        :title="t('chatWindow.close')"
        @click="emit('close')"
      >
        <X :size="16" />
      </button>
    </header>

    <ol ref="list" class="messages" aria-live="polite">
      <li v-if="chat.hasOlder" class="older">
        <button type="button" class="btn ghost" :disabled="chat.loading" @click="showOlder">
          {{ t('chat.older') }}
        </button>
      </li>

      <li v-if="chat.loading && !chat.messages.length" class="note">{{ t('chat.loading') }}</li>
      <li v-else-if="!chat.messages.length" class="note">{{ t('chat.empty') }}</li>

      <li
        v-for="message in chat.messages"
        :key="message.id"
        class="message"
        :class="{ mine: message.sender !== friend.id }"
      >
        <p class="body">{{ message.body }}</p>

        <time class="time" :datetime="message.createdAt">{{
          clock.format(new Date(message.createdAt))
        }}</time>
      </li>
    </ol>

    <div v-if="picking" ref="emoji" class="emoji">
      <EmojiPicker @pick="insertEmoji" />
    </div>

    <form class="composer" @submit.prevent="submit">
      <button
        type="button"
        class="icon-btn emoji-toggle"
        :class="{ active: picking }"
        :aria-label="t('chatWindow.emoji')"
        :aria-expanded="picking"
        :title="t('chatWindow.emoji')"
        @click="picking = !picking"
      >
        <Smile :size="17" />
      </button>

      <textarea
        ref="field"
        v-model="input"
        class="input"
        rows="1"
        :maxlength="MESSAGE_MAX_LENGTH"
        :placeholder="t('chat.placeholder')"
        :aria-label="t('chat.placeholder')"
        @keydown="onKeydown"
      />

      <button type="submit" class="icon-btn send" :disabled="!canSend" :aria-label="t('chat.send')">
        <SendHorizontal :size="17" />
      </button>
    </form>

    <p v-if="chat.failure" class="failure" role="alert">{{ t(`chat.failures.${chat.failure}`) }}</p>

    <p v-else-if="input.length > SHOW_COUNTER_FROM" class="counter">
      {{ input.length }}/{{ MESSAGE_MAX_LENGTH }}
    </p>
  </section>
</template>

<style scoped>
.chat {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.profile {
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

.profile:hover .name {
  color: var(--gold);
}

.emoji {
  position: absolute;
  right: 0;
  bottom: 52px;
  left: 0;
  z-index: 2;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
}

.emoji-toggle {
  flex: none;
  width: var(--control);
  height: var(--control);
  color: var(--chalk-dim);
}

.emoji-toggle.active {
  border-color: var(--gold);
  color: var(--gold);
}

.head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--edge);
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
  background: var(--heal);
}

.who {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.name {
  overflow: hidden;
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status {
  font-size: 11.5px;
  color: var(--chalk-faint);
}

.online .status {
  color: var(--heal);
}

.icon-btn.duel {
  border-color: rgba(244, 197, 91, 0.5);
  color: var(--gold);
}

.messages {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
  margin: 0;
  padding: 2px 2px 4px;
  overflow-y: auto;
  list-style: none;
  scrollbar-width: thin;
}

.older {
  align-self: center;
}

.note {
  margin: auto 0;
  font-size: 13px;
  text-align: center;
  color: var(--chalk-faint);
}

.message {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-self: flex-start;
  max-width: 82%;
  padding: 7px 11px 5px;
  border-radius: 12px 12px 12px 4px;
  background: var(--panel-raised);
  border: 1px solid var(--edge);
}

.message.mine {
  align-self: flex-end;
  border-radius: 12px 12px 4px 12px;
  background: rgba(244, 197, 91, 0.14);
  border-color: rgba(244, 197, 91, 0.3);
}

/* Messages are plain text: line breaks are kept, long words wrap, nothing is ever read as HTML. */
.body {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
  color: var(--chalk);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.time {
  align-self: flex-end;
  font-size: 10.5px;
  color: var(--chalk-faint);
  font-variant-numeric: tabular-nums;
}

/* The field and its buttons share one height; autosize measures without the border, so min-height sets the floor. */
.composer {
  --control: 40px;
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.input {
  flex: 1;
  min-width: 0;
  min-height: var(--control);
  max-height: 120px;
  padding: 9px 12px;
  border-radius: 12px;
  border: 1px solid var(--edge-strong);
  background: #0f1614;
  color: var(--chalk);
  font: 500 15px/1.35 var(--font-ui);
  resize: none;
  /* The field grows with its text up to max-height; past that it scrolls without showing a bar. */
  scrollbar-width: none;
}

.input:focus {
  outline: none;
  border-color: var(--gold);
}

.send {
  flex: none;
  width: var(--control);
  height: var(--control);
  border-color: rgba(244, 197, 91, 0.5);
  color: var(--gold);
}

.send:disabled {
  opacity: 0.45;
  cursor: default;
}

.failure,
.counter {
  margin: -4px 0 0;
  font-size: 12px;
}

.failure {
  color: var(--theirs);
}

.counter {
  text-align: right;
  color: var(--chalk-faint);
}
</style>
