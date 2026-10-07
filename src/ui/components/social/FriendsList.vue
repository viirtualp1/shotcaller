<script setup lang="ts">
import { Ban, Check, ChevronDown, Cloud, Info, Swords, Trophy, Users, X } from '@lucide/vue'
import { computed, ref } from 'vue'
import { HERO_IDS } from '@/content/ids'
import { rankFor } from '@/domain/profile/progression'
import { useFriendStatus } from '../../composables/useFriendStatus'
import { useGameText } from '../../composables/useGameText'
import { useChatStore } from '../../stores/chat'
import { useCloudStore } from '../../stores/cloud'
import { useDuelStore } from '../../stores/duel'
import { useFriendsStore } from '../../stores/friends'
import CoachAvatar from '../profile/CoachAvatar.vue'
import PresenceDot from './PresenceDot.vue'
import WatchLiveButton from './WatchLiveButton.vue'
import RankMedal from '../profile/RankMedal.vue'

/** Friends and requests, shared by the profile page and the friends panel. */
defineProps<{ contained?: boolean }>()

const cloud = useCloudStore()
const friends = useFriendsStore()
const chat = useChatStore()
const duel = useDuelStore()
const { t } = useGameText()
const statusText = useFriendStatus()

const showBlocked = ref(false)

/** With nobody to list yet, the list says so instead of a blank panel. */
const alone = computed(() => !friends.friends.length && !friends.incoming.length)

const heroOf = (avatar: string | null) => HERO_IDS.find((id) => id === avatar) ?? 'spearman'
const nameOf = (name: string) => name || t('profile.defaultName')
</script>

<template>
  <div v-if="!cloud.signedIn" class="gate pitch">
    <p class="pitch-title">{{ t('friends.pitch.title') }}</p>

    <ul class="perks">
      <li>
        <Users :size="18" aria-hidden="true" />
        <span>{{ t('friends.pitch.friends') }}</span>
      </li>

      <li>
        <Trophy :size="18" aria-hidden="true" />
        <span>{{ t('friends.pitch.ranked') }}</span>
      </li>

      <li>
        <Cloud :size="18" aria-hidden="true" />
        <span>{{ t('friends.pitch.cloud') }}</span>
      </li>
    </ul>

    <button type="button" class="btn primary" @click="cloud.signInOpen = true">
      {{ t('friends.signIn') }}
    </button>
  </div>

  <div v-else-if="!friends.card && friends.status !== 'error'" class="bones" role="status">
    <p class="sr-only">{{ t('friends.loading') }}</p>

    <div v-for="row in 5" :key="row" class="bone-row">
      <span class="bone round bone-medal" />
      <span class="bone round bone-avatar" />

      <span class="bone-lines">
        <span class="bone bone-name" />
        <span class="bone bone-status" />
      </span>

      <span class="bone bone-icon" />
      <span class="bone bone-icon" />
    </div>
  </div>

  <div v-else-if="!friends.card" class="gate">
    <p>{{ t('friends.error') }}</p>

    <button type="button" class="btn" @click="friends.refresh()">{{ t('friends.retry') }}</button>
  </div>

  <div v-else class="friends-list" :class="{ contained }">
    <div class="contacts">
      <section v-if="friends.incoming.length" class="group">
        <h3 class="section">{{ t('friends.incoming') }}</h3>

        <ul class="list">
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
      </section>

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
            :aria-label="t('chat.open', { name: nameOf(entry.name) })"
            @click="chat.open(entry.id)"
          >
            <RankMedal :tier="rankFor(entry.rating).tier" :stars="rankFor(entry.rating).stars" :size="30" />

            <span class="avatar">
              <CoachAvatar :hero-id="heroOf(entry.avatar)" :photo="entry.photo" :size="38" />
              <PresenceDot :friend-id="entry.id" />
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
            type="button"
            class="icon-btn"
            :aria-label="t('friends.openProfile', { name: nameOf(entry.name) })"
            :title="t('friends.openProfile', { name: nameOf(entry.name) })"
            @click="friends.openProfile(entry.id)"
          >
            <Info :size="16" />
          </button>

          <button
            v-if="friends.isOnline(entry.id) && friends.statusOf(entry.id)?.activity !== 'duel' && !duel.busy"
            type="button"
            class="icon-btn duel"
            :aria-label="t('duel.challengeName', { name: nameOf(entry.name) })"
            :title="t('duel.challenge')"
            @click="duel.challenge(entry.id)"
          >
            <Swords :size="16" />
          </button>

          <WatchLiveButton :friend-id="entry.id" :name="nameOf(entry.name)" icon-only />
        </li>
      </ul>

      <p v-if="alone" class="muted">{{ t('friends.empty') }}</p>

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
  </div>
</template>

<style scoped>
.friends-list,
.contacts {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.friends-list.contained {
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.contained .contacts {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-gutter: stable;
}

.contacts > * {
  flex-shrink: 0;
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

.bones {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bone-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.03);
}

.bone-medal {
  width: 30px;
  height: 30px;
}

.bone-avatar {
  width: 38px;
  height: 38px;
}

.bone-lines {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.bone-name {
  width: 58%;
  height: 12px;
}

.bone-row:nth-of-type(3n + 1) .bone-name {
  width: 72%;
}

.bone-row:nth-of-type(3n) .bone-name {
  width: 44%;
}

.bone-status {
  width: 34%;
  height: 9px;
}

.bone-icon {
  flex: none;
  width: 36px;
  height: 36px;
}

.gate {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 100%;
  text-align: center;
}

.pitch {
  gap: 16px;
  padding: 8px 4px;
}

.pitch-title {
  margin: 0;
  font-family: var(--font-hand);
  font-size: 24px;
  color: var(--gold);
}

.perks {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
  text-align: left;
}

.perks li {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--chalk);
  font-size: 13px;
}

.perks svg {
  flex: none;
  color: var(--gold);
}

.group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--gold);
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
  border-radius: var(--radius);
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
