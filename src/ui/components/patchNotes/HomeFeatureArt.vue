<script setup lang="ts">
import {
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
  Users,
  UserPlus,
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

defineProps<{ device: 'desktop' | 'phone'; scene: 'home' | 'chat' | 'career' }>()

const settings = useSettingsStore()

// Historical examples, independent of the player's account and live conversations.
const copy = computed(() =>
  settings.locale === 'ru'
    ? {
        coach: 'Тренер',
        rank: 'Ветеран · 1 240 MMR',
        news: 'Патч 9.1',
        continue: 'Продолжить',
        round: 'Три линии · Раунд 7 из 20',
        quick: ['Компьютер', 'Онлайн', 'Тренировка'],
        contracts: 'Контракты',
        next: 'Первая кровь · 2/3',
        friends: 'Друзья',
        addFriend: 'Добавить друга',
        online: '2 в сети',
        playing: 'В матче · Раунд 4',
        ready: 'В главном меню',
        offline: 'Не в сети',
        chat: 'Сообщение',
        messages: ['Ещё один матч?', 'Давай! Соберу новый отряд.'],
        career: 'Карьера',
        progress: 'Уровень 6 · Следующая цель ждёт',
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
        quick: ['Computer', 'Online', 'Training'],
        contracts: 'Contracts',
        next: 'First blood · 2/3',
        friends: 'Friends',
        addFriend: 'Add a friend',
        online: '2 online',
        playing: 'In a match · Round 4',
        ready: 'In the main menu',
        offline: 'Offline',
        chat: 'Message',
        messages: ['One more match?', 'Let’s go! I’ll try a new squad.'],
        career: 'Career',
        progress: 'Level 6 · Your next goal awaits',
        trials: ['Throne assault', 'Better together', 'Full arsenal'],
        reward: 'for your first clear',
        tabs: ['Play', 'Career', 'Friends', 'Profile'],
      },
)
</script>

<template>
  <div class="device" :class="[device, scene]">
    <div class="screen">
      <div class="top">
        <span class="portrait"><HeroAvatar hero-id="warden" :size="24" /></span>

        <span class="who"
          ><b>{{ copy.coach }}</b>

          <small>{{ copy.rank }}</small></span
        >

        <span class="patch"><ScrollText :size="12" /> {{ copy.news }}</span>
        <Settings :size="14" />
      </div>

      <div class="workspace">
        <h3 v-if="device === 'desktop'" class="hand title">The Shotcaller</h3>

        <div class="main">
          <div class="scene-stack">
            <div class="career-content" :class="{ active: scene === 'career' }">
              <h3 class="hand">{{ copy.career }}</h3>
              <small>{{ copy.progress }}</small>

              <div v-for="(trial, i) in copy.trials" :key="trial" class="trial" :class="{ chosen: i === 2 }">
                <Target :size="18" />

                <span
                  ><b>{{ trial }}</b>

                  <small>+{{ [150, 200, 250][i] }} XP · {{ copy.reward }}</small></span
                >

                <Play :size="12" />
              </div>
            </div>

            <div class="home-content" :class="{ active: scene !== 'career' }">
              <div class="resume">
                <small>{{ copy.round }}</small>

                <div class="teams">
                  <span class="team"
                    ><HeroAvatar
                      v-for="hero in ['blademaster', 'oracle', 'herald'] as const"
                      :key="hero"
                      :hero-id="hero"
                      :size="24"
                  /></span>

                  <small>vs</small>

                  <span class="team"
                    ><HeroAvatar
                      v-for="hero in ['butcher', 'frostWitch', 'stonewright'] as const"
                      :key="hero"
                      :hero-id="hero"
                      :team="1"
                      :size="24"
                  /></span>
                </div>

                <span class="continue"><Play :size="12" /> {{ copy.continue }}</span>
              </div>

              <div class="quick">
                <span v-for="(icon, i) in [Bot, Swords, Target]" :key="i" class="tile"
                  ><component :is="icon" :size="17" /> {{ copy.quick[i] }}</span
                >
              </div>

              <div class="contracts">
                <b><Trophy :size="12" /> {{ copy.contracts }} <em>2/3</em></b>

                <small>{{ copy.next }}</small>

                <span class="progress" />
              </div>
            </div>
          </div>
        </div>

        <div v-if="device === 'desktop'" class="friends">
          <b class="friends-title"
            ><Users :size="14" /> {{ copy.friends }} <small>{{ copy.online }}</small></b
          >

          <div
            v-for="(friend, i) in FRIENDS"
            :key="friend.name"
            class="friend"
            :class="{ highlighted: scene === 'chat' && i === 0 }"
          >
            <HeroAvatar :hero-id="friend.hero" :size="27" />

            <span class="friend-who"
              ><b>{{ friend.name }}</b>

              <small>{{ i === 0 ? copy.playing : i === 1 ? copy.ready : copy.offline }}</small></span
            >

            <Eye v-if="i === 0" :size="14" class="watch" /><MessageCircle v-else :size="13" />
          </div>

          <span class="add-friend"><UserPlus :size="12" /> {{ copy.addFriend }}</span>
        </div>
      </div>

      <Transition name="preview">
        <div v-if="scene === 'chat'" class="conversation">
          <b class="chat-head"><HeroAvatar hero-id="pyromancer" :size="24" /> Ember <span class="dot" /></b>
          <p class="bubble">{{ copy.messages[0] }}</p>
          <p class="bubble mine">{{ copy.messages[1] }}</p>

          <div class="composer">
            <span>{{ copy.chat }}…</span><SendHorizontal :size="14" />
          </div>
        </div>
      </Transition>

      <div v-if="device === 'phone'" class="tabs">
        <span
          v-for="(icon, i) in [Play, Trophy, Users, User]"
          :key="i"
          :class="{ active: i === (scene === 'career' ? 1 : scene === 'chat' ? 2 : 0) }"
          ><component :is="icon" :size="14" />{{ copy.tabs[i] }}<i v-if="i === 2">1</i></span
        >
      </div>

      <MousePointer2 v-if="device === 'desktop'" class="pointer" :class="scene" :size="23" />
      <span v-else class="touch" :class="scene" />
    </div>

    <span v-if="device === 'desktop'" class="stand" />
  </div>
</template>

<style scoped>
.device {
  position: relative;
  width: 100%;
  margin: auto;
}
.screen {
  position: relative;
  overflow: hidden;
  padding: 16px;
  border: 2px solid #ece8dc30;
  border-radius: var(--radius);
  background: linear-gradient(160deg, #23372c, #101c17);
  box-shadow: 0 20px 50px #0005;
  font-size: 10px;
}
.desktop .screen {
  min-height: 320px;
}
.phone {
  width: 250px;
  padding: 8px;
  border: 2px solid #ece8dc40;
  border-radius: 28px;
  background: #0b1310;
}
.phone .screen {
  min-height: 365px;
  padding: 14px 10px 54px;
  border: 0;
  border-radius: 20px;
}
.top {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 22px;
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
  line-height: 1.4;
}
small {
  display: block;
  font-size: 9px;
  color: var(--chalk-dim);
}
.patch {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--gold);
  font-size: 9px;
}
.phone .patch {
  display: none;
}
.workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  align-items: stretch;
  gap: 12px 20px;
}
.title {
  grid-column: 1 / -1;
}
.phone .workspace {
  display: block;
}
.main {
  min-width: 0;
}
h3 {
  margin: 0;
  font-size: 29px;
  line-height: 1;
}
.scene-stack {
  display: grid;
}
.home-content,
.career-content {
  grid-area: 1 / 1;
  visibility: hidden;
  opacity: 0;
  transition: opacity 0.25s;
  display: grid;
  gap: 8px;
}
.home-content.active,
.career-content.active {
  visibility: visible;
  opacity: 1;
}
.friend > :deep(.avatar) {
  flex: 0 0 27px;
  width: 27px;
  height: 27px;
}
.resume {
  display: grid;
  gap: 9px;
  padding: 10px;
  border: 1px solid #f4c55b50;
  border-radius: var(--radius);
  background: #f4c55b0b;
}
.teams,
.team {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 3px;
}
.continue {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 7px;
  border-radius: var(--radius);
  background: var(--gold);
  color: var(--ink);
  font-weight: 800;
}
.quick {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 5px;
}
.tile {
  display: grid;
  justify-items: center;
  gap: 5px;
  padding: 8px 1px;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  background: #ffffff06;
  font-size: 8px;
}
.tile svg,
.watch {
  color: var(--gold);
}
.contracts {
  display: grid;
  gap: 5px;
  padding: 9px;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
}
.contracts b {
  display: flex;
  align-items: center;
  gap: 5px;
}
em {
  margin-left: auto;
  color: var(--gold);
  font-style: normal;
}
.progress {
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--gold) 66%, #ffffff18 66%);
}
.friends {
  display: flex;
  flex-direction: column;
  padding: 10px;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  background: #ffffff04;
}

.add-friend {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 5px;
  margin-top: auto;
  padding: 6px;
  border: 1px dashed var(--edge-strong);
  border-radius: var(--radius);
  font-size: 8px;
}
.friends-title {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 10px;
}
.friends-title small {
  margin-left: auto;
  font-size: 8px;
}
.friend {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 3px;
  border-top: 1px solid var(--edge);
}
.friend-who {
  flex: 1;
  min-width: 0;
}
.friend small {
  font-size: 8px;
}
.highlighted {
  color: var(--gold);
}
.tabs {
  display: flex;
  justify-content: space-around;
  gap: 5px;
  margin-top: 14px;
  color: var(--chalk-faint);
}
.tabs > span {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
}
.tabs .active {
  color: var(--gold);
}
.tabs i {
  display: grid;
  place-items: center;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--gold);
  color: var(--ink);
  font-size: 8px;
  font-style: normal;
}
.phone .tabs {
  position: absolute;
  inset: auto 0 0;
  margin: 0;
  padding: 10px 3px;
  border-top: 1px solid var(--edge-strong);
  background: #0e1915;
}
.phone .tabs > span {
  flex-direction: column;
  gap: 3px;
  font-size: 8px;
}
.phone .tabs i {
  position: absolute;
  top: -3px;
  right: 0;
}
.conversation {
  position: absolute;
  right: 12px;
  bottom: 12px;
  width: 200px;
  padding: 12px;
  border: 1px solid #f4c55b60;
  border-radius: var(--radius);
  background: #1f2b27;
  box-shadow: 0 12px 40px #0009;
}
.phone .conversation {
  inset: 56px 10px 50px;
  width: auto;
  display: flex;
  flex-direction: column;
}
.chat-head {
  display: flex;
  align-items: center;
  gap: 7px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--edge);
}
.dot {
  width: 5px;
  height: 5px;
  margin-left: auto;
  border-radius: 50%;
  background: var(--heal);
}
.bubble {
  width: fit-content;
  max-width: 90%;
  padding: 8px;
  margin: 12px 0;
  border-radius: var(--radius);
  background: #ffffff0b;
}
.mine {
  margin-left: auto;
  background: #f4c55b18;
}
.composer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 5px;
  padding: 8px;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  color: var(--chalk-faint);
}
.phone .composer {
  margin-top: auto;
}
.composer svg {
  color: var(--gold);
}
.trial {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 8px;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  background: #ffffff05;
}
.trial span {
  flex: 1;
}
.trial small {
  margin-top: 5px;
  font-size: 8px;
}
.chosen {
  border-color: #f4c55b70;
  color: var(--gold);
}
.stand {
  display: block;
  width: 45%;
  height: 12px;
  margin: auto;
  border-bottom: 3px solid #ece8dc40;
  background: linear-gradient(90deg, transparent 42%, #ece8dc25 42% 58%, transparent 58%);
}
.pointer {
  position: absolute;
  z-index: 2;
  color: var(--chalk);
  fill: var(--ink);
  transition:
    left 0.6s,
    top 0.6s;
  filter: drop-shadow(0 2px 3px #0008);
}
.pointer.home {
  left: 27%;
  top: 58%;
}
.pointer.chat {
  left: 88%;
  top: 41%;
}
.pointer.career {
  left: 37%;
  top: 91%;
}
.touch {
  position: absolute;
  z-index: 2;
  width: 28px;
  height: 28px;
  border: 2px solid var(--gold);
  border-radius: 50%;
  box-shadow: 0 0 0 6px #f4c55b14;
  transition:
    left 0.6s,
    top 0.6s;
}
.touch.home {
  left: 45%;
  top: 44%;
}
.touch.chat {
  left: 60%;
  top: 89%;
}
.touch.career {
  left: 35%;
  top: 89%;
}
.preview-enter-active,
.preview-leave-active {
  transition:
    opacity 0.25s,
    translate 0.25s;
}
.preview-enter-from {
  opacity: 0;
  translate: 0 6px;
}
.preview-leave-to {
  opacity: 0;
  translate: 0 -6px;
}
@media (max-width: 440px) {
  .desktop .screen {
    padding: 12px 9px;
    min-height: 303px;
  }
  .desktop .workspace {
    gap: 10px 8px;
  }
  .desktop h3 {
    font-size: 24px;
  }
  .desktop .team {
    gap: 0;
  }
  .desktop .team :deep(.avatar) {
    width: 19px !important;
    height: 19px !important;
  }
  .desktop .friends {
    padding: 7px;
  }
  .desktop .friends-title small {
    display: none;
  }
  .desktop .friend small {
    font-size: 7px;
  }
  .desktop .patch {
    display: none;
  }
  .desktop .tile {
    font-size: 7px;
  }
}
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition: none !important;
  }
}
</style>
