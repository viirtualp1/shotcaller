<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { Ban, Check, ChevronDown, ChevronUp, Copy, Swords, UserPlus, X } from 'lucide-vue-next'
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import {
  formatFriendCode,
  isFriendCode,
  normalizeFriendCode,
  type FriendRequestResult,
} from '@/application/social/friends'
import { HERO_IDS } from '@/content/ids'
import { rankFor } from '@/domain/profile/progression'
import { useFriendStatus } from '../../composables/useFriendStatus'
import { useGameText } from '../../composables/useGameText'
import { useChatStore } from '../../stores/chat'
import { useCloudStore } from '../../stores/cloud'
import { useDuelStore } from '../../stores/duel'
import { useFriendsStore } from '../../stores/friends'
import CoachAvatar from '../profile/CoachAvatar.vue'
import RankMedal from '../profile/RankMedal.vue'

/** Friends, requests and adding by code; shared by the profile page and the friends panel. */
const cloud = useCloudStore()
const friends = useFriendsStore()
const chat = useChatStore()
const duel = useDuelStore()
const { t } = useGameText()
const statusText = useFriendStatus()
const { copy, copied } = useClipboard({ legacy: true })

const adding = ref(false)
const showBlocked = ref(false)
const code = ref('')
const result = ref<FriendRequestResult | 'error' | null>(null)
const sending = ref(false)
const codeInput = useTemplateRef<HTMLInputElement>('codeInput')

const valid = computed(() => isFriendCode(code.value))
const ownCode = computed(() => (friends.card ? formatFriendCode(friends.card.friendCode) : ''))
const succeeded = computed(() => result.value === 'sent' || result.value === 'accepted')

const heroOf = (avatar: string | null) => HERO_IDS.find((id) => id === avatar) ?? 'spearman'
const nameOf = (name: string) => name || t('profile.defaultName')

async function startAdding() {
  adding.value = !adding.value
  result.value = null

  if (adding.value) {
    await nextTick()
    codeInput.value?.focus()
  }
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
</script>

<template>
  <div v-if="!cloud.signedIn" class="gate">
    <p>{{ t('friends.signInHint') }}</p>

    <button type="button" class="btn primary" @click="cloud.signInOpen = true">
      {{ t('friends.signIn') }}
    </button>
  </div>

  <p v-else-if="!friends.card && friends.status !== 'error'" class="muted">{{ t('friends.loading') }}</p>

  <div v-else-if="!friends.card" class="gate">
    <p>{{ t('friends.error') }}</p>

    <button type="button" class="btn" @click="friends.refresh()">{{ t('friends.retry') }}</button>
  </div>

  <div v-else class="friends-list">
    <ul v-if="friends.incoming.length" class="list">
      <li v-for="entry in friends.incoming" :key="entry.id" class="row request">
        <CoachAvatar :hero-id="heroOf(entry.avatar)" :photo="entry.photo" :size="38" />

        <span class="who">
          <strong class="name">{{ nameOf(entry.name) }}</strong>
          <span class="status">{{ t('friends.wantsToBeFriends') }}</span>
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

    <ul v-if="friends.friends.length" class="list">
      <li
        v-for="entry in friends.friends"
        :key="entry.id"
        class="row"
        :class="{ online: friends.isOnline(entry.id) }"
      >
        <button
          type="button"
          class="profile"
          :aria-label="t('friends.openProfile', { name: nameOf(entry.name) })"
          :title="t('friends.openProfile', { name: nameOf(entry.name) })"
          @click="friends.openProfile(entry.id)"
        >
          <RankMedal :tier="rankFor(entry.rating).tier" :stars="rankFor(entry.rating).stars" :size="30" />

          <span class="avatar">
            <CoachAvatar :hero-id="heroOf(entry.avatar)" :photo="entry.photo" :size="38" />
            <i class="presence" />
          </span>
        </button>

        <button
          type="button"
          class="open"
          :aria-label="t('chat.open', { name: nameOf(entry.name) })"
          @click="chat.open(entry.id)"
        >
          <span class="who">
            <strong class="name">{{ nameOf(entry.name) }}</strong>
            <span class="status">{{ statusText(entry.id) }}</span>
          </span>

          <span
            v-if="chat.unreadFrom(entry.id)"
            class="unread"
            :aria-label="t('chat.unread', { n: chat.unreadFrom(entry.id) })"
          >
            {{ chat.unreadFrom(entry.id) }}
          </span>
        </button>

        <button
          v-if="friends.isOnline(entry.id) && !duel.busy"
          type="button"
          class="icon-btn duel"
          :aria-label="t('duel.challengeName', { name: nameOf(entry.name) })"
          :title="t('duel.challenge')"
          @click="duel.challenge(entry.id)"
        >
          <Swords :size="16" />
        </button>
      </li>
    </ul>

    <p v-else class="muted">{{ t('friends.empty') }}</p>

    <ul v-if="friends.outgoing.length" class="list">
      <li v-for="entry in friends.outgoing" :key="entry.id" class="row pending">
        <CoachAvatar :hero-id="heroOf(entry.avatar)" :photo="entry.photo" :size="32" />

        <span class="who">
          <strong class="name">{{ nameOf(entry.name) }}</strong>
          <span class="status">{{ t('friends.outgoing') }}</span>
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

    <form v-if="adding" class="add" @submit.prevent="submit">
      <div class="own">
        <span class="own-label">{{ t('friends.yourCode') }}</span>

        <div class="own-row">
          <strong class="own-code">{{ ownCode }}</strong>

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
      </div>

      <div class="add-row">
        <input
          ref="codeInput"
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

    <button type="button" class="btn block add-toggle" :aria-expanded="adding" @click="startAdding">
      <template v-if="adding"><ChevronUp :size="16" /> {{ t('friends.hideAdding') }}</template>
      <template v-else><UserPlus :size="16" /> {{ t('friends.addFriend') }}</template>
    </button>

    <template v-if="friends.blocked.length">
      <button
        type="button"
        class="blocked-toggle"
        :aria-expanded="showBlocked"
        @click="showBlocked = !showBlocked"
      >
        <Ban :size="13" /> {{ t('friends.blockedCount', { n: friends.blocked.length }) }}
        <ChevronDown :size="13" class="chevron" :class="{ open: showBlocked }" />
      </button>

      <ul v-if="showBlocked" class="list">
        <li v-for="entry in friends.blocked" :key="entry.id" class="row pending">
          <CoachAvatar :hero-id="heroOf(entry.avatar)" :photo="entry.photo" :size="32" />

          <span class="who">
            <strong class="name">{{ nameOf(entry.name) }}</strong>
          </span>

          <button type="button" class="btn ghost small" @click="friends.unblock(entry.id)">
            {{ t('friends.unblock') }}
          </button>
        </li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
.friends-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
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

.gate {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
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
  gap: 8px;
  padding: 7px 8px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--edge);
}

.row.request {
  border-color: rgba(244, 197, 91, 0.4);
}

.row.pending {
  opacity: 0.75;
}

.profile,
.open {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.profile {
  flex: none;
}

/* The row is a contact: a click opens the conversation. */
.open {
  flex: 1;
  gap: 10px;
  min-width: 0;
  align-self: stretch;
}

.row:has(.open:hover) {
  background: rgba(255, 255, 255, 0.06);
}

.open:hover .name {
  color: var(--gold);
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
  gap: 1px;
  min-width: 0;
}

.name {
  overflow: hidden;
  font-size: 14px;
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

.icon-btn {
  position: relative;
  flex: none;
}

.icon-btn.accept {
  border-color: rgba(127, 224, 180, 0.5);
  color: var(--heal);
}

.icon-btn.duel {
  border-color: rgba(244, 197, 91, 0.5);
  color: var(--gold);
}

.unread {
  flex: none;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--gold);
  color: var(--ink);
  font-size: 11px;
  font-weight: 800;
  line-height: 18px;
  text-align: center;
}

.add-toggle {
  border-style: dashed;
}

.add {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--edge);
}

.own {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.own-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.own-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--chalk-dim);
}

.own-code {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0.12em;
  font-variant-numeric: tabular-nums;
}

.good {
  color: var(--heal);
}

.add-row {
  display: flex;
  gap: 8px;
}

.code-input {
  flex: 1;
  min-width: 0;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid var(--edge-strong);
  background: #0f1614;
  color: var(--chalk);
  font: 700 15px/1.3 var(--font-ui);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.code-input::placeholder {
  color: var(--chalk-faint);
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
  color: var(--heal);
}

.blocked-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  padding: 2px 0;
  border: 0;
  background: none;
  color: var(--chalk-faint);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.chevron {
  transition: rotate 0.15s;
}

.chevron.open {
  rotate: 180deg;
}

.small {
  padding: 5px 10px;
  font-size: 12.5px;
}
</style>
