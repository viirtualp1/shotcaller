<script setup lang="ts">
import { Check, MessageCircle, Swords, UserPlus, X } from '@lucide/vue'
import { computed } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useNotificationText } from '../../composables/useNotificationText'
import { useChatStore } from '../../stores/chat'
import { useDuelStore } from '../../stores/duel'
import { useFriendsStore } from '../../stores/friends'
import { useMatchStore } from '../../stores/match'
import { useNotificationsStore, type SocialNotification } from '../../stores/notifications'
import CoachAvatar from '../profile/CoachAvatar.vue'

/** Every social notification in one stack in the bottom-right corner, each with what can be done about it. */
const notifications = useNotificationsStore()
const friends = useFriendsStore()
const chat = useChatStore()
const duel = useDuelStore()
const match = useMatchStore()
const { t } = useGameText()

const { nameOr, coachOf, headline } = useNotificationText()
const outgoingName = computed(() => nameOr(duel.outgoing?.opponent.name))

/** The border colour: friends and messages, duel news, good news or bad news. */
function tone({ notice }: SocialNotification) {
  switch (notice.kind) {
    case 'message':
    case 'friendRequest':
    case 'friendAccepted':
      return 'social'
    case 'duelEnded':
      return notice.won ? 'good' : 'bad'
    case 'duelFailed':
    case 'badBoard':
      return 'bad'
    default:
      return 'duel'
  }
}

const cards = computed(() =>
  notifications.items.map((item) => ({
    item,
    coach: coachOf(item),
    headline: headline(item),
    tone: tone(item),
  })),
)

function openChat(item: SocialNotification, friendId: string) {
  notifications.dismiss(item.id)
  void chat.open(friendId)
}

function answerRequest(item: SocialNotification, coachId: string, accept: boolean) {
  notifications.dismiss(item.id)
  void (accept ? friends.accept(coachId) : friends.decline(coachId))
}

function viewProfile(item: SocialNotification, coachId: string) {
  notifications.dismiss(item.id)
  void friends.openProfile(coachId)
}
</script>

<template>
  <TransitionGroup
    tag="ol"
    name="notification"
    class="notifications"
    :class="{ 'in-match': match.view !== null, 'beside-window': chat.windowOpen }"
    aria-live="polite"
  >
    <li v-if="duel.outgoing" key="outgoing-duel" class="card duel sticky">
      <div class="line">
        <Swords :size="16" class="icon" />

        <span class="text">
          {{ t('duel.waitingFor', { name: outgoingName, s: duel.inviteSecondsLeft(duel.outgoing) }) }}
        </span>
      </div>

      <div class="actions">
        <button type="button" class="btn ghost small" @click="duel.cancelInvite()">
          {{ t('duel.cancel') }}
        </button>
      </div>
    </li>

    <li
      v-for="{ item, coach, headline: title, tone: kind } in cards"
      :key="item.id"
      class="card"
      :class="kind"
    >
      <header class="line">
        <CoachAvatar v-if="coach" :hero-id="coach.hero" :photo="coach.photo" :size="30" />
        <Swords v-else :size="16" class="icon" />

        <span class="text">
          <strong v-if="coach" class="name">{{ coach.name }}</strong>
          <span class="headline">{{ title }}</span>
        </span>

        <button
          type="button"
          class="icon-btn close"
          :aria-label="t('duel.close')"
          @click="notifications.dismiss(item.id)"
        >
          <X :size="14" />
        </button>
      </header>

      <template v-if="item.notice.kind === 'message'">
        <!-- Plain text, cut to three lines; the whole message is one click away. -->
        <p class="body">{{ item.notice.body }}</p>

        <button type="button" class="btn block small" @click="openChat(item, item.notice.friendId)">
          <MessageCircle :size="15" /> {{ t('chatWindow.open') }}
        </button>
      </template>

      <div v-else-if="item.notice.kind === 'friendRequest'" class="actions">
        <button
          type="button"
          class="btn primary small"
          @click="answerRequest(item, item.notice.coach.id, true)"
        >
          <Check :size="15" /> {{ t('friends.accept') }}
        </button>

        <button
          type="button"
          class="btn ghost small"
          @click="answerRequest(item, item.notice.coach.id, false)"
        >
          {{ t('friends.decline') }}
        </button>
      </div>

      <div v-else-if="item.notice.kind === 'friendAccepted'" class="actions">
        <button type="button" class="btn small" @click="openChat(item, item.notice.coach.id)">
          <MessageCircle :size="15" /> {{ t('friends.message') }}
        </button>

        <button type="button" class="btn ghost small" @click="viewProfile(item, item.notice.coach.id)">
          <UserPlus :size="15" /> {{ t('notifications.profile') }}
        </button>
      </div>
    </li>
  </TransitionGroup>
</template>

<style scoped>
.notifications {
  position: fixed;
  right: 16px;
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  z-index: 46;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(320px, calc(100vw - 32px));
  margin: 0;
  padding: 0;
  list-style: none;
  pointer-events: none;
}

/* In a match the corner holds the fight button, so notifications sit above it. */
.notifications.in-match {
  bottom: calc(84px + env(safe-area-inset-bottom, 0px));
}

/* The open friends window takes the corner, so notifications move beside it. */
.notifications.beside-window {
  right: calc(16px + min(380px, 100vw - 32px) + 12px);
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
}

@media (max-width: 760px) {
  .notifications.beside-window {
    right: 16px;
    bottom: auto;
    top: calc(12px + env(safe-area-inset-top, 0px));
  }
}

.card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 14px;
  background: #0f1614;
  border: 1px solid var(--edge-strong);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
  pointer-events: auto;
}

.card.social {
  border-color: rgba(108, 196, 255, 0.45);
}

.card.duel {
  border-color: rgba(244, 197, 91, 0.5);
}

.card.good {
  border-color: var(--heal);
}

.card.bad {
  border-color: rgba(255, 112, 96, 0.6);
}

.line {
  display: flex;
  align-items: center;
  gap: 10px;
}

.icon {
  flex: none;
  color: var(--gold);
}

.text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.name {
  overflow: hidden;
  font-size: 13.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.social .headline {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--ours);
}

.close {
  width: 28px;
  height: 28px;
}

.body {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  font-size: 13.5px;
  line-height: 1.4;
  color: var(--chalk);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.actions {
  display: flex;
  gap: 8px;
}

.small {
  padding: 6px 10px;
  font-size: 12.5px;
}

.notification-enter-active,
.notification-leave-active {
  transition:
    opacity 0.2s ease-out,
    transform 0.2s ease-out;
}

.notification-enter-from,
.notification-leave-to {
  opacity: 0;
  transform: translateX(24px);
}
</style>
