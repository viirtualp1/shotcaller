<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { Check, Copy, MessageCircle, Swords, UserPlus, X } from 'lucide-vue-next'
import { computed } from 'vue'
import { formatFriendCode } from '@/application/social/friends'
import { HERO_IDS } from '@/content/ids'
import { rankFor } from '@/domain/profile/progression'
import { useGameText } from '../../composables/useGameText'
import { useChatStore } from '../../stores/chat'
import { useCloudStore } from '../../stores/cloud'
import { useDuelStore } from '../../stores/duel'
import { useFriendsStore } from '../../stores/friends'
import HudPanel from '../common/HudPanel.vue'
import CoachAvatar from '../profile/CoachAvatar.vue'

/** The friends list on the profile page; adding, blocking and chatting happen in the friends panel. */
const cloud = useCloudStore()
const friends = useFriendsStore()
const chat = useChatStore()
const duel = useDuelStore()
const { t } = useGameText()
const { copy, copied } = useClipboard({ legacy: true })

const ownCode = computed(() => (friends.card ? formatFriendCode(friends.card.friendCode) : ''))

const meta = computed(() =>
  friends.friends.length
    ? t('friends.onlineOf', {
        n: friends.onlineCount,
        total: friends.friends.length,
      })
    : '',
)

const heroOf = (avatar: string | null) => HERO_IDS.find((id) => id === avatar) ?? 'spearman'
const nameOf = (name: string) => name || t('profile.defaultName')

function openChat(id: string) {
  friends.open = true
  void chat.open(id)
}
</script>

<template>
  <HudPanel :title="t('friends.title')" :meta="meta" class="panel">
    <template v-if="cloud.signedIn && friends.card" #actions>
      <button type="button" class="btn ghost manage" @click="friends.open = true">
        <UserPlus :size="15" /> {{ t('friends.manage') }}
      </button>
    </template>

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

    <template v-else>
      <div class="code-row">
        <span class="code-label">{{ t('friends.yourCode') }}</span>
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

      <ul v-if="friends.incoming.length" class="list requests">
        <li v-for="entry in friends.incoming" :key="entry.id" class="row request">
          <CoachAvatar :hero-id="heroOf(entry.avatar)" :size="36" />

          <span class="who">
            <strong class="name">{{ nameOf(entry.name) }}</strong>
            <span class="meta">{{ t('friends.wantsToBeFriends') }}</span>
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

      <div class="scroll">
        <ul v-if="friends.friends.length" class="list">
          <li
            v-for="entry in friends.friends"
            :key="entry.id"
            class="row"
            :class="{ online: friends.isOnline(entry.id) }"
          >
            <button
              type="button"
              class="open"
              :aria-label="t('chat.open', { name: nameOf(entry.name) })"
              @click="openChat(entry.id)"
            >
              <span class="avatar">
                <CoachAvatar :hero-id="heroOf(entry.avatar)" :size="36" />
                <i class="presence" />
              </span>

              <span class="who">
                <strong class="name">{{ nameOf(entry.name) }}</strong>

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
              :aria-label="t('duel.challengeName', { name: nameOf(entry.name) })"
              :title="t('duel.challenge')"
              @click="duel.invite(entry.id)"
            >
              <Swords :size="16" />
            </button>
          </li>
        </ul>

        <div v-else class="empty">
          <p>{{ t('friends.empty') }}</p>

          <button type="button" class="btn" @click="friends.open = true">
            <UserPlus :size="15" /> {{ t('friends.addTitle') }}
          </button>
        </div>
      </div>
    </template>
  </HudPanel>
</template>

<style scoped>
.panel {
  gap: 12px;
  padding: 16px 18px;
}

.manage {
  margin-left: 8px;
  min-height: 30px;
  padding: 4px 10px;
  font-size: 12px;
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

.gate,
.empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}

.code-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px 8px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--edge);
}

.code-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--chalk-faint);
}

.code {
  margin-left: auto;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: 0.12em;
  font-variant-numeric: tabular-nums;
}

.good {
  color: #7fe0b4;
}

.scroll {
  min-height: 0;
  max-height: 420px;
  overflow-y: auto;
  scrollbar-width: thin;
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

.row.request {
  border-color: rgba(244, 197, 91, 0.35);
  background: rgba(244, 197, 91, 0.06);
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

.icon-btn.accept {
  border-color: rgba(127, 224, 180, 0.5);
  color: #7fe0b4;
}

.icon-btn.duel {
  border-color: rgba(244, 197, 91, 0.5);
  color: var(--gold);
}
</style>
