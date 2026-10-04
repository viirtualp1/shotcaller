<script setup lang="ts">
import {
  BatteryFull,
  Bot,
  Eye,
  MessageCircle,
  MousePointer2,
  Play,
  ScrollText,
  SendHorizontal,
  Settings,
  Swords,
  Target,
  Trophy,
  User,
  UserPlus,
  Users,
  Wifi,
} from '@lucide/vue'
import { computed } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import HeroAvatar from '../common/HeroAvatar.vue'

const FRIENDS = [
  {
    name: 'Ember',
    hero: 'pyromancer',
  },
  {
    name: 'River',
    hero: 'oracle',
  },
  {
    name: 'Oak',
    hero: 'warden',
  },
] as const

const OURS = ['blademaster', 'oracle', 'herald'] as const
const THEIRS = ['butcher', 'frostWitch', 'stonewright'] as const
const TRIAL_XP = [150, 200, 250] as const
const QUICK_ICONS = [Bot, Swords, Target] as const
const TAB_ICONS = [Play, Trophy, Users, User] as const

/**
 * A main menu drawn at a fixed size, like a screenshot: the release introduction scales the whole device,
 * so nothing inside reflows or wraps on a narrow page.
 */
const props = defineProps<{ device: 'desktop' | 'phone'; scene: 'home' | 'chat' | 'career' }>()

const settings = useSettingsStore()

const avatar = computed(() => (props.device === 'desktop' ? 26 : 21))
const tab = computed(() => (props.scene === 'career' ? 1 : props.scene === 'chat' ? 2 : 0))

// Historical examples, independent of the player's account and live conversations.
const copy = computed(() =>
  settings.locale === 'ru'
    ? {
        coach: 'Тренер',
        rank: 'Ветеран · 1 240 MMR',
        news: 'Патч 9.1',
        continue: 'Продолжить',
        round: 'Три линии · Раунд 7 из 20',
        towers: 'Башни 3 : 2',
        quick: ['Компьютер', 'Онлайн', 'Тренировка'],
        contracts: 'Контракты',
        next: 'Первая кровь · 2/3',
        friends: 'Друзья',
        addFriend: 'Добавить друга',
        online: '2 в сети',
        statuses: ['В матче · Раунд 4', 'В главном меню', 'Не в сети'],
        chat: 'Сообщение',
        messages: ['Ещё один матч?', 'Давай! Соберу новый отряд.'],
        career: 'Карьера',
        level: 'Уровень 6',
        trials: ['Штурм трона', 'Сила связок', 'Полный арсенал'],
        reward: 'за первое прохождение',
        tabs: ['Игра', 'Карьера', 'Друзья', 'Профиль'],
      }
    : {
        coach: 'Coach',
        rank: 'Veteran · 1,240 MMR',
        news: 'Patch 9.1',
        continue: 'Continue',
        round: 'Three lanes · Round 7 of 20',
        towers: 'Towers 3 : 2',
        quick: ['Computer', 'Online', 'Training'],
        contracts: 'Contracts',
        next: 'First blood · 2/3',
        friends: 'Friends',
        addFriend: 'Add a friend',
        online: '2 online',
        statuses: ['In a match · Round 4', 'In the main menu', 'Offline'],
        chat: 'Message',
        messages: ['One more match?', 'Let’s go! I’ll try a new squad.'],
        career: 'Career',
        level: 'Level 6',
        trials: ['Throne assault', 'Better together', 'Full arsenal'],
        reward: 'for your first clear',
        tabs: ['Play', 'Career', 'Friends', 'Profile'],
      },
)
</script>

<template>
  <div class="device" :class="device">
    <div class="bezel">
      <div class="screen">
        <div v-if="device === 'phone'" class="status">
          <b>9:41</b>
          <span class="notch" />
          <span class="signal"><Wifi :size="11" /><BatteryFull :size="13" /></span>
        </div>

        <header class="top">
          <span class="portrait"><HeroAvatar hero-id="warden" :size="device === 'desktop' ? 28 : 24" /></span>

          <span class="who"
            ><b>{{ copy.coach }}</b>

            <small>{{ copy.rank }}</small></span
          >

          <span v-if="device === 'desktop'" class="chip"><ScrollText :size="13" /> {{ copy.news }}</span>
          <Settings :size="15" class="faint" />
        </header>

        <div class="body">
          <div class="main">
            <!-- Every scene stays in place, so the screen keeps its size while one fades into the next. -->
            <section
              class="scene"
              :class="{ active: scene === 'home' || (device === 'desktop' && scene === 'chat') }"
            >
              <h3 class="hand">The Shotcaller</h3>

              <div class="resume">
                <div class="resume-head">
                  <small>{{ copy.round }}</small>
                  <small class="towers">{{ copy.towers }}</small>
                </div>

                <div class="teams">
                  <span class="team"
                    ><HeroAvatar v-for="hero in OURS" :key="hero" :hero-id="hero" :size="avatar"
                  /></span>

                  <small>vs</small>

                  <span class="team"
                    ><HeroAvatar v-for="hero in THEIRS" :key="hero" :hero-id="hero" :team="1" :size="avatar"
                  /></span>
                </div>

                <span class="continue">
                  <Play :size="13" /> {{ copy.continue }}

                  <MousePointer2 v-if="device === 'desktop' && scene === 'home'" class="cursor" :size="22" />
                </span>
              </div>

              <div class="quick">
                <span v-for="(icon, i) in QUICK_ICONS" :key="i" class="tile"
                  ><component :is="icon" :size="device === 'desktop' ? 18 : 16" /> {{ copy.quick[i] }}</span
                >
              </div>

              <div class="contracts">
                <b><Trophy :size="13" /> {{ copy.contracts }} <em>2/3</em></b>

                <small>{{ copy.next }}</small>

                <span class="progress" />
              </div>
            </section>

            <section class="scene career" :class="{ active: scene === 'career' }">
              <h3 class="hand">{{ copy.career }}</h3>

              <div class="level">
                <small>{{ copy.level }}</small>
                <span class="progress" />
              </div>

              <div v-for="(trial, i) in copy.trials" :key="trial" class="trial" :class="{ chosen: i === 2 }">
                <Target :size="device === 'desktop' ? 18 : 16" />

                <span
                  ><b>{{ trial }}</b>

                  <small>+{{ TRIAL_XP[i] }} XP · {{ copy.reward }}</small></span
                >

                <Play :size="12" class="go" />

                <MousePointer2
                  v-if="device === 'desktop' && scene === 'career' && i === 2"
                  class="cursor"
                  :size="22"
                />
              </div>
            </section>

            <section v-if="device === 'phone'" class="scene chat" :class="{ active: scene === 'chat' }">
              <h3 class="hand">{{ copy.friends }}</h3>

              <div v-for="(friend, i) in FRIENDS.slice(0, 2)" :key="friend.name" class="friend">
                <HeroAvatar :hero-id="friend.hero" :size="26" />

                <span class="friend-who"
                  ><b>{{ friend.name }}</b>

                  <small>{{ copy.statuses[i] }}</small></span
                >

                <Eye v-if="i === 0" :size="15" class="watch" />

                <MessageCircle v-else :size="14" class="faint" />
              </div>

              <div class="messages">
                <b class="chat-head"
                  ><HeroAvatar hero-id="pyromancer" :size="22" />

                  Ember <span class="dot"
                /></b>

                <p class="bubble">{{ copy.messages[0] }}</p>
                <p class="bubble mine">{{ copy.messages[1] }}</p>

                <div class="composer">
                  <span>{{ copy.chat }}…</span><SendHorizontal :size="14" />
                </div>
              </div>
            </section>
          </div>

          <aside v-if="device === 'desktop'" class="friends">
            <b class="friends-title"
              ><Users :size="14" /> {{ copy.friends }} <small>{{ copy.online }}</small></b
            >

            <div
              v-for="(friend, i) in FRIENDS"
              :key="friend.name"
              class="friend"
              :class="{ highlighted: scene === 'chat' && i === 0, away: i === 2 }"
            >
              <HeroAvatar :hero-id="friend.hero" :size="30" />

              <span class="friend-who"
                ><b>{{ friend.name }}</b>

                <small>{{ copy.statuses[i] }}</small></span
              >

              <span v-if="i === 0" class="watch"
                ><Eye :size="15" />

                <MousePointer2 v-if="scene === 'chat'" class="cursor" :size="22"
              /></span>

              <MessageCircle v-else :size="14" class="faint" />
            </div>

            <span class="add-friend"><UserPlus :size="13" /> {{ copy.addFriend }}</span>

            <div class="conversation" :class="{ active: scene === 'chat' }">
              <b class="chat-head"
                ><HeroAvatar hero-id="pyromancer" :size="22" />

                Ember <span class="dot"
              /></b>

              <p class="bubble">{{ copy.messages[0] }}</p>
              <p class="bubble mine">{{ copy.messages[1] }}</p>
            </div>
          </aside>
        </div>

        <nav v-if="device === 'phone'" class="tabs">
          <span v-for="(icon, i) in TAB_ICONS" :key="i" :class="{ active: i === tab }"
            ><component :is="icon" :size="16" />

            {{ copy.tabs[i] }}<i v-if="i === 2 && scene !== 'chat'">1</i></span
          >
        </nav>
      </div>
    </div>

    <span v-if="device === 'desktop'" class="stand" />
  </div>
</template>

<style scoped>
.device {
  position: relative;
  font-size: 12px;
  line-height: 1.35;
  color: var(--chalk);
}
.desktop {
  width: 700px;
}
.phone {
  width: 248px;
  font-size: 11px;
}
.bezel {
  padding: 10px;
  border: 2px solid #ece8dc30;
  border-radius: 16px;
  background: #0b1310;
  box-shadow:
    0 30px 70px #0008,
    inset 0 0 0 1px #ffffff08;
}
.phone .bezel {
  padding: 8px;
  border-color: #ece8dc40;
  border-radius: 34px;
}
.screen {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 400px;
  padding: 14px 18px 16px;
  border-radius: var(--radius);
  background:
    radial-gradient(ellipse at 20% 0%, #f4c55b14, transparent 55%), linear-gradient(160deg, #23372c, #101c17);
}
.phone .screen {
  height: 492px;
  padding: 8px 12px 0;
  border-radius: 26px;
}
.status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 20px;
  margin: 0 6px 8px;
  font-size: 10px;
}
.notch {
  width: 62px;
  height: 16px;
  border-radius: 999px;
  background: #0b1310;
}
.signal {
  display: flex;
  align-items: center;
  gap: 4px;
}
.top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.portrait {
  display: grid;
  overflow: hidden;
  border: 1px solid var(--gold);
  border-radius: 50%;
}
.who {
  flex: 1;
  display: grid;
  line-height: 1.3;
}
small {
  display: block;
  font-size: 0.85em;
  color: var(--chalk-dim);
}
.chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  border: 1px solid #f4c55b50;
  border-radius: var(--radius);
  color: var(--gold);
  font-size: 11px;
  font-weight: 700;
}
.faint {
  flex: none;
  color: var(--chalk-faint);
}
.body {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 218px;
  gap: 18px;
  min-height: 0;
}
.phone .body {
  grid-template-columns: minmax(0, 1fr);
}
.main {
  display: grid;
  min-width: 0;
}
.scene {
  grid-area: 1 / 1;
  display: flex;
  flex-direction: column;
  gap: 9px;
  min-width: 0;
  visibility: hidden;
  opacity: 0;
  translate: 0 8px;
  transition:
    opacity 0.35s,
    translate 0.35s,
    visibility 0.35s;
}
.scene.active {
  visibility: visible;
  opacity: 1;
  translate: 0;
}
h3 {
  margin: 0 0 2px;
  font-size: 30px;
  line-height: 1;
}
.phone h3 {
  font-size: 25px;
}
.resume {
  display: grid;
  gap: 10px;
  padding: 11px 12px;
  border: 1px solid #f4c55b55;
  border-radius: var(--radius);
  background: #f4c55b0d;
}
.resume-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.towers {
  color: var(--gold);
}
.phone .towers {
  display: none;
}
.teams,
.team {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}
.phone .team {
  gap: 2px;
}
.continue {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  border-radius: var(--radius);
  background: var(--gold);
  color: var(--ink);
  font-weight: 800;
}
.quick {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
}
.tile {
  display: grid;
  justify-items: center;
  gap: 5px;
  padding: 10px 2px 9px;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  background: #ffffff06;
  font-size: 0.9em;
  font-weight: 600;
}
.tile svg {
  color: var(--gold);
}
.contracts,
.level {
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
}
.level {
  padding: 0 0 6px;
  border: 0;
}
.contracts b {
  display: flex;
  align-items: center;
  gap: 6px;
}
em {
  margin-left: auto;
  color: var(--gold);
  font-style: normal;
}
.progress {
  height: 4px;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--gold) 66%, #ffffff18 66%);
}
.level .progress {
  background: linear-gradient(90deg, var(--gold) 40%, #ffffff18 40%);
}
.trial {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  background: #ffffff05;
}
.trial span {
  flex: 1;
  min-width: 0;
}
.trial small {
  margin-top: 3px;
}
.trial .go {
  color: var(--chalk-faint);
}
.chosen {
  border-color: #f4c55b80;
  background: #f4c55b10;
  color: var(--gold);
}
.chosen .go {
  color: var(--gold);
}
.friends {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 12px;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  background: #ffffff05;
}
.friends-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}
.friends-title small {
  margin-left: auto;
  color: var(--heal);
}
.friend {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 4px;
  border-top: 1px solid var(--edge);
  transition: color 0.3s;
}
.friend.away {
  opacity: 0.6;
}
.friend-who {
  flex: 1;
  min-width: 0;
}
.highlighted {
  color: var(--gold);
}
.watch {
  position: relative;
  display: grid;
  color: var(--gold);
}
.add-friend {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  margin-top: auto;
  padding: 8px;
  border: 1px dashed var(--edge-strong);
  border-radius: var(--radius);
  color: var(--chalk-dim);
}
.conversation {
  position: absolute;
  inset: auto 8px 8px;
  padding: 10px;
  border: 1px solid #f4c55b60;
  border-radius: var(--radius);
  background: #1f2b27;
  box-shadow: 0 -10px 30px #0008;
  visibility: hidden;
  opacity: 0;
  translate: 0 14px;
  transition:
    opacity 0.35s,
    translate 0.35s,
    visibility 0.35s;
}
.conversation.active {
  visibility: visible;
  opacity: 1;
  translate: 0;
}
.chat-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--edge);
}
.dot {
  width: 6px;
  height: 6px;
  margin-left: auto;
  border-radius: 50%;
  background: var(--heal);
}
.bubble {
  width: fit-content;
  max-width: 88%;
  margin: 8px 0 0;
  padding: 7px 9px;
  border-radius: var(--radius);
  background: #ffffff0d;
}
.mine {
  margin-left: auto;
  background: #f4c55b1c;
}
.phone .chat {
  height: 100%;
  gap: 6px;
  padding-bottom: 62px;
}
.messages {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 10px;
  border: 1px solid #f4c55b50;
  border-radius: var(--radius);
  background: #1f2b27;
}
.messages .chat-head + .bubble {
  margin-top: auto;
}
.chat .friend {
  padding: 6px 2px;
}
.composer {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  padding: 9px 10px;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  color: var(--chalk-faint);
}
.composer svg {
  color: var(--gold);
}
.tabs {
  position: absolute;
  inset: auto 0 0;
  display: flex;
  justify-content: space-around;
  padding: 9px 4px 14px;
  border-top: 1px solid var(--edge-strong);
  background: #0e1915;
  color: var(--chalk-faint);
}
.tabs > span {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  min-width: 48px;
  font-size: 10px;
  transition: color 0.3s;
}
.tabs .active {
  color: var(--gold);
}
.tabs i {
  position: absolute;
  top: -4px;
  right: 8px;
  display: grid;
  place-items: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--gold);
  color: var(--ink);
  font-size: 9px;
  font-style: normal;
  font-weight: 800;
}
.stand {
  position: relative;
  display: block;
  height: 40px;
}
.stand::before,
.stand::after {
  content: '';
  position: absolute;
  left: 50%;
  translate: -50% 0;
}
.stand::before {
  top: 0;
  width: 84px;
  height: 34px;
  background: linear-gradient(180deg, #070c0a, #1a2721);
  clip-path: polygon(22% 0, 78% 0, 90% 100%, 10% 100%);
}
.stand::after {
  bottom: 0;
  width: 220px;
  height: 7px;
  border-radius: 999px;
  background: linear-gradient(90deg, #ece8dc10, #ece8dc30, #ece8dc10);
}
/* The pointer appears on what the scene is about, and presses it once. */
.cursor {
  position: absolute;
  z-index: 2;
  right: 18%;
  bottom: -12px;
  color: var(--chalk);
  fill: var(--ink);
  filter: drop-shadow(0 3px 4px #000a);
  animation: point 0.9s ease-out both;
}
.trial .cursor {
  right: 14px;
  bottom: -10px;
}
.watch .cursor {
  right: -12px;
  bottom: -16px;
}
@keyframes point {
  from {
    opacity: 0;
    translate: 40px 30px;
  }
  70% {
    opacity: 1;
    translate: 0 0;
    scale: 1;
  }
  85% {
    scale: 0.85;
  }
  to {
    opacity: 1;
    scale: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .scene,
  .conversation,
  .friend,
  .tabs > span {
    transition: none;
  }
  .cursor {
    animation: none;
  }
}
</style>
