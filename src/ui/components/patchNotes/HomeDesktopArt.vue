<script setup lang="ts">
import {
  BellOff,
  Bot,
  ChevronRight,
  Crown,
  Eye,
  LogOut,
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
} from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { paintMapPicture } from '@/rendering/art/paintMapPicture'
import { laneMapFor } from '@/simulation/map/LaneMap'
import { useSettingsStore } from '../../stores/settings'
import BoardFrame from '../board/BoardFrame.vue'
import DiscordIcon from '../common/DiscordIcon.vue'
import HeroAvatar from '../common/HeroAvatar.vue'
import ModeMap from '../modes/ModeMap.vue'
import CoachAvatar from '../profile/CoachAvatar.vue'
import RankMedal from '../profile/RankMedal.vue'

// Fixed examples from release 9.1, independent of saved matches, accounts and conversations.
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

const QUICK_ICONS = [Bot, Swords, Target] as const

const UNITS = [
  {
    hero: 'blademaster',
    team: 0,
    left: 24,
    top: 13,
  },
  {
    hero: 'oracle',
    team: 0,
    left: 44,
    top: 55,
  },
  {
    hero: 'herald',
    team: 0,
    left: 72,
    top: 85,
  },
  {
    hero: 'butcher',
    team: 1,
    left: 36,
    top: 13,
  },
  {
    hero: 'frostWitch',
    team: 1,
    left: 53,
    top: 46,
  },
  {
    hero: 'stonewright',
    team: 1,
    left: 86,
    top: 72,
  },
] as const

defineProps<{ scene: 'home' | 'chat' | 'career' }>()

const settings = useSettingsStore()

const picture = ref<string | null>(null)

const copy = computed(() =>
  settings.locale === 'ru'
    ? {
        coach: 'Тренер',
        rank: 'Шотколлер',
        level: 'Уровень 6',
        settings: 'Настройки',
        signOut: 'Выйти',
        mode: 'Три линии · против компьютера',
        round: 'Раунд 7 из 20',
        towers: 'Башни 3 : 2',
        continue: 'Продолжить',
        contracts: 'Контракты',
        next: 'Дальше: Первая кровь · 2/3',
        friends: 'Друзья',
        statuses: ['в игре · раунд 4', 'в сети', 'не в сети'],
        addFriend: 'Добавить друга',
        messages: ['Ещё один матч?', 'Давай!'],
        message: 'Сообщение',
        support: 'Обратная связь',
        terms: 'Условия',
        privacy: 'Приватность',
        patch: 'Патч 9.1',
        fresh: 'Новое',
        title: 'Всё под рукой',
        lead: '**Новое главное меню**, построенное вокруг следующего хода. Незаконченный матч идёт первым, с режимом, раундом и башнями: **одно касание** — и ты снова в игре.',
        discord: 'Играй в Discord',
        discordText: 'Запускай матчи прямо в голосовом канале вместе с друзьями.',
        quick: ['Компьютер', 'Онлайн', 'Тренировка'],
        play: 'Играть',
        lanes: {
          top: 'Верх',
          mid: 'Мид',
          bot: 'Низ',
        },
        bases: ['наша база', 'их база'],
      }
    : {
        coach: 'Coach',
        rank: 'The Shotcaller',
        level: 'Level 6',
        settings: 'Settings',
        signOut: 'Sign out',
        mode: 'Three lanes · vs computer',
        round: 'Round 7 of 20',
        towers: 'Towers 3 : 2',
        continue: 'Continue',
        contracts: 'Contracts',
        next: 'Next: First blood · 2/3',
        friends: 'Friends',
        statuses: ['in a match · round 4', 'online', 'offline'],
        addFriend: 'Add a friend',
        messages: ['One more match?', 'Let’s go!'],
        message: 'Message',
        support: 'Feedback & support',
        terms: 'Terms',
        privacy: 'Privacy',
        patch: 'Patch 9.1',
        fresh: 'New',
        title: 'Front and centre',
        lead: 'A **new main menu** built around your next move. An unfinished match comes first, with its mode, round and towers: **one tap** and you are back in.',
        discord: 'Play in Discord',
        discordText: 'Start matches right in a voice channel with your friends.',
        quick: ['Computer', 'Online', 'Training'],
        play: 'Play',
        lanes: {
          top: 'Top',
          mid: 'Mid',
          bot: 'Bot',
        },
        bases: ['our base', 'enemy base'],
      },
)

function drawBoard() {
  const labels = copy.value
  picture.value = paintMapPicture(
    laneMapFor('threeLanes'),
    {
      laneName: (lane) => labels.lanes[lane],
      baseName: (team) => labels.bases[team]!,
      combatText: () => '',
    },
    700,
  ).toDataURL('image/webp', 0.85)
}

watch(() => settings.locale, drawBoard)

onMounted(drawBoard)
</script>

<template>
  <div class="desktop-home">
    <div class="column left">
      <section class="coach-card">
        <div class="who">
          <CoachAvatar hero-id="warden" :level="6" :size="26" />

          <span class="names"
            ><b>{{ copy.coach }}</b>

            <small>{{ copy.rank }}</small></span
          >

          <RankMedal tier="shotcaller" :size="24" />
        </div>

        <div class="level">
          <span>{{ copy.level }} · <span class="dim">180 / 450 XP</span></span>

          <b>1 240 MMR</b>
        </div>

        <span class="track level-track" />

        <div class="actions">
          <span><Settings :size="9" /> {{ copy.settings }}</span>
          <span><LogOut :size="9" /> {{ copy.signOut }}</span>
        </div>
      </section>

      <section class="resume" :class="{ focused: scene === 'home' }">
        <div class="meta">
          <span>{{ copy.mode }}</span>

          <span>{{ copy.round }}</span>
        </div>

        <div class="score" :aria-label="copy.towers">
          <span class="base ours"
            ><i /><i /><i />

            <span class="throne"><Crown :size="10" /></span
          ></span>

          <small>vs</small>

          <span class="base theirs"
            ><i /><i /><i class="down" />

            <span class="throne"><Crown :size="10" /></span
          ></span>
        </div>

        <span class="continue gold"
          ><Play :size="11" /> {{ copy.continue }}
          <MousePointer2 v-if="scene === 'home'" class="cursor" :size="18" />
        </span>
      </section>

      <section class="contracts" :class="{ focused: scene === 'career' }">
        <b><Trophy :size="10" /> {{ copy.contracts }} <em>2/3</em></b>
        <span class="track" />
        <small class="next">{{ copy.next }} <ChevronRight :size="9" /></small>
        <MousePointer2 v-if="scene === 'career'" class="cursor" :size="18" />
      </section>

      <aside class="friends" :class="{ focused: scene === 'chat' }">
        <div class="contacts">
          <header class="friends-title">
            <b class="hand">{{ copy.friends }}</b>

            <BellOff :size="10" />
          </header>

          <div v-for="(friend, i) in FRIENDS" :key="friend.name" class="friend" :class="{ away: i === 2 }">
            <RankMedal tier="shotcaller" :size="14" />

            <span class="friend-avatar"
              ><HeroAvatar :hero-id="friend.hero" :size="18" />

              <i v-if="i < 2" class="dot"
            /></span>

            <span class="friend-who"
              ><b>{{ friend.name }}</b>

              <small>{{ copy.statuses[i] }}</small></span
            >

            <span class="tools"
              ><User :size="9" /><Swords :size="9" />

              <Eye v-if="i === 0" :size="9" class="watch"
            /></span>
          </div>

          <span class="add-friend"><UserPlus :size="9" /> {{ copy.addFriend }}</span>
        </div>

        <div class="conversation" :class="{ active: scene === 'chat' }">
          <b class="chat-head"><HeroAvatar hero-id="pyromancer" :size="20" /> Ember <span class="dot" /></b>
          <p class="bubble">{{ copy.messages[0] }}</p>
          <p class="bubble mine">{{ copy.messages[1] }}</p>

          <div class="composer">
            <span>{{ copy.message }}…</span><SendHorizontal :size="10" />
          </div>
        </div>
      </aside>

      <footer class="footer">
        <span class="language"
          ><b :class="{ selected: settings.locale === 'ru' }">RU</b>

          <b :class="{ selected: settings.locale === 'en' }">EN</b></span
        >

        <span class="support">{{ copy.support }}</span>

        <span class="legal"
          >{{ copy.terms }} <span>{{ copy.privacy }}</span></span
        >
      </footer>
    </div>

    <BoardFrame class="preview">
      <img v-if="picture" class="map" :src="picture" alt="" />
      <ModeMap v-else mode="threeLanes" :size="350" />

      <span
        v-for="unit in UNITS"
        :key="unit.hero"
        class="unit"
        :class="unit.team === 0 ? 'ours' : 'theirs'"
        :style="{ left: `${unit.left}%`, top: `${unit.top}%` }"
      >
        <HeroAvatar :hero-id="unit.hero" :team="unit.team" :size="17" />
      </span>
    </BoardFrame>

    <div class="column right">
      <section class="patch">
        <span class="eyebrow"
          ><ScrollText :size="9" /> {{ copy.patch }} <b>{{ copy.fresh }}</b></span
        >

        <h3 class="hand">{{ copy.title }}</h3>

        <p>
          <template v-for="(part, i) in copy.lead.split('**')" :key="i"
            ><strong v-if="i % 2">{{ part }}</strong>

            <template v-else>{{ part }}</template></template
          >
        </p>
      </section>

      <section class="discord">
        <DiscordIcon :size="16" />

        <span
          ><b>{{ copy.discord }}</b>

          <small>{{ copy.discordText }}</small></span
        >
      </section>

      <div class="launch">
        <div class="quick">
          <span v-for="(icon, i) in QUICK_ICONS" :key="i" class="tile"
            ><component :is="icon" :size="13" /> {{ copy.quick[i] }}</span
          >
        </div>

        <span class="play gold"><Play :size="15" /> {{ copy.play }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.desktop-home {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px minmax(0, 1fr);
  gap: 12px;
  height: 100%;
  font-size: 8px;
  line-height: 1.35;
}
.column {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  min-height: 0;
}
.coach-card,
.resume,
.contracts,
.friends,
.patch,
.discord {
  position: relative;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  background: #ffffff04;
}
.coach-card {
  display: grid;
  gap: 4px;
  padding: 6px;
  background: linear-gradient(160deg, #273631eb, #18221feb);
}
.who,
.actions,
.score,
.base,
.friends-title,
.friend,
.tools,
.chat-head,
.composer,
.eyebrow,
.discord {
  display: flex;
  align-items: center;
}
.who {
  gap: 7px;
}
.names,
.friend-who {
  flex: 1;
  display: grid;
  min-width: 0;
}
.names b {
  font-size: 11px;
}
small,
.dim {
  color: var(--chalk-dim);
}
small {
  font-size: 7px;
}
.level {
  display: flex;
  justify-content: space-between;
  gap: 3px;
  font-size: 6.5px;
  white-space: nowrap;
}
.level b,
.contracts svg,
em,
.watch,
.composer svg,
.tile svg {
  color: var(--gold);
}
.track {
  display: block;
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--gold) 66%, #ffffff12 66%);
}
.level-track {
  background: linear-gradient(90deg, var(--gold) 40%, #ffffff12 40%);
}
.actions {
  gap: 4px;
}
.actions > span,
.support {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 3px;
  padding: 3px;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  color: var(--chalk-dim);
}
.actions > span {
  flex: 1;
  font-size: 7px;
  white-space: nowrap;
}
.resume {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 5px;
  padding: 6px;
  border-color: #f4c55b70;
  background: #f4c55b0f;
}
.meta {
  display: flex;
  justify-content: space-between;
  gap: 4px;
  font-size: 6px;
  color: var(--chalk-dim);
}
.meta > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.meta > span:last-child {
  flex: none;
}
.score {
  justify-content: space-between;
  gap: 4px;
}
.ours {
  --team: var(--ours);
}
.theirs {
  --team: var(--theirs);
}
.base {
  gap: 3px;
}
.base.theirs {
  flex-direction: row-reverse;
}
.base > i {
  width: 5px;
  height: 5px;
  rotate: 45deg;
  background: var(--team);
}
.base > .down {
  background: transparent;
  border: 1px solid var(--chalk-faint);
}
.throne {
  display: grid;
  place-items: center;
  width: 17px;
  height: 17px;
  border: 1px solid var(--team);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--team) 30%, transparent);
}
.gold {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: var(--radius);
  background: var(--gold);
  color: var(--ink);
  font-weight: 800;
}
.continue {
  position: relative;
  padding: 6px;
  font-size: 10px;
}
.contracts {
  display: grid;
  gap: 4px;
  padding: 6px;
}
.contracts b,
.next {
  display: flex;
  align-items: center;
  gap: 4px;
}
em {
  margin-left: auto;
  font-style: normal;
}
.next {
  justify-content: space-between;
}
.friends {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  min-height: 0;
  overflow: hidden;
  background: #202d28;
}
.contacts,
.conversation {
  grid-area: 1 / 1;
  display: flex;
  flex-direction: column;
  padding: 6px;
  min-height: 0;
}
.friends-title {
  justify-content: space-between;
  padding-bottom: 5px;
  color: var(--chalk-dim);
}
.friends-title b {
  font-size: 16px;
  line-height: 1;
  color: var(--chalk);
}
.friend {
  gap: 4px;
  padding: 2px 0;
  border-top: 1px solid var(--edge);
}
.away {
  opacity: 0.5;
}
.friend-avatar {
  position: relative;
  display: grid;
}
.friend-who small {
  font-size: 6px;
}
.tools {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 2px;
  width: 20px;
  color: var(--chalk-faint);
}
.dot {
  display: block;
  width: 5px;
  height: 5px;
  border: 1px solid #202d28;
  border-radius: 50%;
  background: var(--heal);
}
.friend-avatar .dot {
  position: absolute;
  right: 0;
  bottom: 0;
}
.add-friend {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  margin-top: auto;
  padding-top: 4px;
  color: var(--chalk-dim);
}
.conversation {
  position: relative;
  background: #202d28;
  visibility: hidden;
  opacity: 0;
  translate: 0 8px;
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
  gap: 5px;
  padding-bottom: 5px;
  border-bottom: 1px solid var(--edge);
}
.chat-head .dot {
  margin-left: auto;
}
.bubble {
  width: fit-content;
  max-width: 90%;
  margin: 7px 0 0;
  padding: 5px 6px;
  border-radius: var(--radius);
  background: #ffffff0d;
}
.mine {
  margin-left: auto;
  background: #f4c55b1c;
}
.composer {
  justify-content: space-between;
  margin-top: auto;
  padding: 5px;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  color: var(--chalk-faint);
}
.footer {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 4px;
  font-size: 7px;
}
.language {
  display: flex;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  overflow: hidden;
}
.language b {
  padding: 3px;
  color: var(--chalk-dim);
}
.language .selected {
  background: var(--gold);
  color: var(--ink);
}
.legal {
  grid-column: 1 / -1;
  display: flex;
  gap: 6px;
  color: var(--chalk-faint);
  font-size: 6px;
}
.preview {
  align-self: start;
}
.preview.frame {
  padding: 5px;
}
.preview :deep(.surface) {
  border-radius: var(--radius);
}
.map {
  display: block;
  width: 100%;
  height: 100%;
}
.unit {
  position: absolute;
  display: grid;
  translate: -50% -50%;
  border-radius: 50%;
  box-shadow:
    0 0 0 1px var(--team),
    0 0 12px color-mix(in srgb, var(--team) 35%, transparent);
}
.unit::before {
  content: '';
  position: absolute;
  inset: -5px 0 auto;
  height: 2px;
  background: linear-gradient(90deg, var(--team) 75%, #ffffff18 75%);
}
.patch {
  display: grid;
  gap: 6px;
  padding: 9px;
  background: radial-gradient(ellipse at 100% 0%, #f4c55b1f, transparent 60%), #ffffff04;
}
.eyebrow {
  gap: 4px;
  color: var(--gold);
  font-size: 6px;
  font-weight: 800;
  text-transform: uppercase;
}
.eyebrow b {
  margin-left: auto;
  padding: 2px 4px;
  border-radius: 999px;
  background: var(--gold);
  color: var(--ink);
}
h3 {
  margin: 0;
  font-size: 22px;
  line-height: 1;
}
.patch p {
  margin: 0;
  color: var(--chalk-dim);
  line-height: 1.5;
}
.patch strong {
  color: var(--gold);
}
.discord {
  align-items: flex-start;
  gap: 7px;
  padding: 9px;
  border-color: #5865f28c;
  background: #5865f229;
}
.discord svg {
  flex: none;
  color: #c9cdfb;
}
.discord b {
  display: block;
  margin-bottom: 3px;
  font-size: 10px;
}
.launch {
  display: grid;
  gap: 6px;
  margin-top: auto;
}
.quick {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
}
.tile {
  display: grid;
  justify-items: center;
  gap: 4px;
  padding: 6px 1px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: var(--panel);
  font-size: 6px;
  font-weight: 700;
}
.play {
  padding: 8px;
  font-size: 14px;
}
.focused {
  border-color: #f4c55ba0;
  box-shadow: 0 0 14px #f4c55b12;
}
.cursor {
  position: absolute;
  z-index: 2;
  right: 15%;
  bottom: -8px;
  color: var(--chalk);
  fill: var(--ink);
  filter: drop-shadow(0 3px 4px #000a);
  animation: point 0.9s ease-out both;
}
@keyframes point {
  from {
    opacity: 0;
    translate: 24px 18px;
  }
  70% {
    opacity: 1;
    translate: 0;
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
  .conversation {
    transition: none;
  }
  .cursor {
    animation: none;
  }
}
</style>
