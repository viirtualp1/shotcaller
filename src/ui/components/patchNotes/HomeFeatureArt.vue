<script setup lang="ts">
import {
  ArrowLeft,
  BellOff,
  Bot,
  ChevronRight,
  Crown,
  Eye,
  Info,
  Lock,
  LogOut,
  Play,
  ScrollText,
  Settings,
  Swords,
  Target,
  Trophy,
  User,
  Users,
  X,
} from '@lucide/vue'
import { computed } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import DiscordIcon from '../common/DiscordIcon.vue'
import CoachAvatar from '../profile/CoachAvatar.vue'
import RankMedal from '../profile/RankMedal.vue'
import HomeDesktopArt from './HomeDesktopArt.vue'

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

const BOARD = [
  {
    name: 'Miracle',
    hero: 'shade',
    rating: '1 520',
  },
  {
    name: 'Puppey',
    hero: 'pyromancer',
    rating: '1 480',
  },
  {
    name: 'Dendi',
    hero: 'warden',
    rating: '1 440',
  },
] as const

const TRIALS = [
  {
    xp: 150,
    locked: false,
  },
  {
    xp: 200,
    locked: true,
  },
] as const

const QUICK_ICONS = [Bot, Swords, Target] as const
const TAB_ICONS = [Play, Trophy, Users, User] as const

/**
 * A main menu drawn at a fixed size, like a screenshot: the release introduction scales the whole device,
 * so nothing inside reflows or wraps on a narrow page.
 */
const props = defineProps<{ device: 'desktop' | 'phone'; scene: 'home' | 'chat' | 'career' }>()

const settings = useSettingsStore()

const tab = computed(() => (props.scene === 'career' ? 1 : props.scene === 'chat' ? 2 : 0))

// Historical examples from release 9.1, independent of the player's account and live conversations.
const copy = computed(() =>
  settings.locale === 'ru'
    ? {
        coach: 'Тренер',
        rank: 'Шотколлер',
        level: 'Уровень 6',
        xp: '180 / 450 XP',
        mmr: '1 240',
        best: 'Лучший режим: Три линии',
        settings: 'Настройки',
        signOut: 'Выйти',
        mode: 'Три линии · против компьютера',
        round: 'Раунд 7 из 20',
        towers: 'Башни 3 : 2',
        continue: 'Продолжить',
        quick: ['Компьютер', 'Онлайн', 'Тренировка'],
        contracts: 'Контракты',
        next: 'Дальше: Первая кровь · 2/3',
        patch: 'Патч 9.1',
        fresh: 'Новое',
        title: 'Всё под рукой',
        lead: '**Новое главное меню**, построенное вокруг следующего хода. Незаконченный матч идёт первым.',
        discord: 'Играй в Discord',
        discordText: 'Запускай матчи прямо в голосовом канале вместе с друзьями.',
        board: 'Таблица лидеров',
        modes: ['Три', 'Две', 'Одна'],
        support: 'Обратная связь',
        terms: 'Условия',
        privacy: 'Приватность',
        play: 'Играть',
        friends: 'Друзья',
        statuses: ['в игре · раунд 4', 'в сети', 'не в сети'],
        back: 'Главное меню',
        progress: 'Прогресс тренера',
        career: 'Карьера',
        careerLead: 'Играй, пробуй новые составы и открывай тактические испытания.',
        careerTabs: ['Испытания · 0/4', 'Контракты', 'Достижения'],
        trials: ['Штурм трона', 'Сила связок'],
        trialMeta: ['Уровень 2 · Две линии', 'Уровень 4 · Две линии'],
        reward: 'за первое прохождение',
        locked: 'С уровня 4',
        tabs: ['Игра', 'Карьера', 'Друзья', 'Профиль'],
      }
    : {
        coach: 'Coach',
        rank: 'The Shotcaller',
        level: 'Level 6',
        xp: '180 / 450 XP',
        mmr: '1,240',
        best: 'Best in Three lanes',
        settings: 'Settings',
        signOut: 'Sign out',
        mode: 'Three lanes · vs computer',
        round: 'Round 7 of 20',
        towers: 'Towers 3 : 2',
        continue: 'Continue',
        quick: ['Computer', 'Online', 'Training'],
        contracts: 'Contracts',
        next: 'Next: First blood · 2/3',
        patch: 'Patch 9.1',
        fresh: 'New',
        title: 'Front and centre',
        lead: 'A **new main menu** built around your next move. An unfinished match comes first.',
        discord: 'Play in Discord',
        discordText: 'Start matches right in a voice channel with your friends.',
        board: 'Leaderboard',
        modes: ['Three', 'Two', 'One'],
        support: 'Feedback',
        terms: 'Terms',
        privacy: 'Privacy',
        play: 'Play',
        friends: 'Friends',
        statuses: ['in a match · round 4', 'online', 'offline'],
        back: 'Main menu',
        progress: 'Coach progression',
        career: 'Career',
        careerLead: 'Play, explore new lineups and unlock tactical trials.',
        careerTabs: ['Trials · 0/4', 'Contracts', 'Milestones'],
        trials: ['Throne assault', 'Better together'],
        trialMeta: ['Level 2 · Two lanes', 'Level 4 · Two lanes'],
        reward: 'for your first clear',
        locked: 'Level 4 required',
        tabs: ['Play', 'Career', 'Friends', 'Profile'],
      },
)
</script>

<template>
  <div class="device" :class="device">
    <div class="bezel">
      <div class="screen">
        <HomeDesktopArt v-if="device === 'desktop'" :scene="scene" />

        <template v-else>
          <!-- Every scene stays mounted, so the phone keeps its size while one fades into the next. -->
          <div class="pages">
            <div class="page" :class="{ active: scene !== 'career', dim: scene === 'chat' }">
              <section class="coach">
                <div class="who">
                  <CoachAvatar hero-id="warden" :level="6" :size="26" />

                  <span class="names">
                    <b>{{ copy.coach }}</b>
                    <small>{{ copy.rank }}</small>
                  </span>

                  <span class="rank-side">
                    <b>{{ copy.mmr }} <span>MMR</span></b>
                    <small>{{ copy.best }}</small>
                    <span class="track" />
                  </span>

                  <RankMedal tier="shotcaller" :size="22" />
                </div>

                <div class="level">
                  <span
                    >{{ copy.level }} · <span class="dim">{{ copy.xp }}</span></span
                  >
                </div>

                <span class="track level-track" />

                <div class="actions">
                  <span><Settings :size="8" /> {{ copy.settings }}</span>
                  <span><LogOut :size="8" /> {{ copy.signOut }}</span>
                </div>
              </section>

              <section class="resume">
                <div class="meta">
                  <span>{{ copy.mode }}</span>
                  <span>{{ copy.round }}</span>
                </div>

                <div class="score" :aria-label="copy.towers">
                  <span class="base ours"
                    ><i /><i /><i />

                    <span class="throne"><Crown :size="8" /></span
                  ></span>

                  <small>vs</small>

                  <span class="base theirs"
                    ><i /><i /><i class="down" />

                    <span class="throne"><Crown :size="8" /></span
                  ></span>
                </div>

                <span class="continue"><Play :size="9" /> {{ copy.continue }}</span>
              </section>

              <section class="contracts">
                <b><Trophy :size="9" /> {{ copy.contracts }} <em>2/3</em></b>
                <span class="track" />
                <small class="next">{{ copy.next }} <ChevronRight :size="8" /></small>
              </section>

              <section class="patch">
                <span class="eyebrow"
                  ><ScrollText :size="8" /> {{ copy.patch }} <b>{{ copy.fresh }}</b></span
                >

                <h3 class="hand">{{ copy.title }}</h3>

                <p>
                  <template v-for="(part, i) in copy.lead.split('**')" :key="i">
                    <strong v-if="i % 2">{{ part }}</strong>
                    <template v-else>{{ part }}</template>
                  </template>
                </p>
              </section>

              <section class="discord">
                <DiscordIcon :size="14" />

                <span>
                  <b>{{ copy.discord }}</b>
                  <small>{{ copy.discordText }}</small>
                </span>
              </section>

              <section class="board">
                <header class="board-head">
                  <b><Trophy :size="8" /> {{ copy.board }}</b>

                  <span class="lanes">
                    <b v-for="(mode, i) in copy.modes" :key="mode" :class="{ on: i === 0 }">{{ mode }}</b>
                  </span>
                </header>

                <div v-for="(coach, i) in BOARD" :key="coach.name" class="standing">
                  <em>{{ i + 1 }}</em>
                  <CoachAvatar :hero-id="coach.hero" :size="12" />
                  <span>{{ coach.name }}</span>
                  <strong>{{ coach.rating }}</strong>
                </div>
              </section>

              <footer class="footer">
                <span class="language">
                  <b :class="{ selected: settings.locale === 'ru' }">RU</b>
                  <b :class="{ selected: settings.locale === 'en' }">EN</b>
                </span>

                <span class="support">{{ copy.support }}</span>

                <span class="legal"
                  >{{ copy.terms }} <span>{{ copy.privacy }}</span></span
                >
              </footer>

              <div class="launch">
                <div class="quick">
                  <span v-for="(icon, i) in QUICK_ICONS" :key="i" class="tile">
                    <component :is="icon" :size="11" /> {{ copy.quick[i] }}
                  </span>
                </div>

                <span class="play"><Play :size="11" /> {{ copy.play }}</span>
              </div>
            </div>

            <div class="page career" :class="{ active: scene === 'career' }">
              <span class="back"><ArrowLeft :size="9" /> {{ copy.back }}</span>

              <section class="coach">
                <div class="who">
                  <CoachAvatar hero-id="warden" :level="6" :size="26" />

                  <span class="names">
                    <b>{{ copy.coach }}</b>
                    <small>{{ copy.level }} · {{ copy.xp }}</small>
                  </span>
                </div>

                <span class="track level-track" />

                <div class="rank-row">
                  <RankMedal tier="shotcaller" :size="18" />
                  <b>{{ copy.rank }}</b>
                  <em>{{ copy.mmr }}</em>
                </div>
              </section>

              <section class="career-card">
                <span class="eyebrow"><Trophy :size="8" /> {{ copy.progress }}</span>
                <h3 class="hand">{{ copy.career }}</h3>
                <p>{{ copy.careerLead }}</p>

                <div class="career-tabs">
                  <b>{{ copy.careerTabs[0] }}</b>
                  <span>{{ copy.careerTabs[1] }}</span>
                  <span>{{ copy.careerTabs[2] }}</span>
                </div>

                <article v-for="(trial, i) in TRIALS" :key="copy.trials[i]" class="trial">
                  <small>{{ copy.trialMeta[i] }} <Lock v-if="trial.locked" :size="8" /></small>
                  <b>{{ copy.trials[i] }}</b>
                  <em v-if="!trial.locked">+{{ trial.xp }} XP {{ copy.reward }}</em>
                  <span v-if="trial.locked" class="locked"><Lock :size="8" /> {{ copy.locked }}</span>
                  <span v-else class="go"><Play :size="8" /> {{ copy.play }}</span>
                </article>
              </section>
            </div>

            <aside class="sheet" :class="{ active: scene === 'chat' }">
              <header class="sheet-head">
                <b class="hand">{{ copy.friends }}</b>
                <span class="tools"><BellOff :size="10" /><X :size="10" /></span>
              </header>

              <div
                v-for="(friend, i) in FRIENDS"
                :key="friend.name"
                class="friend"
                :class="{ away: i === 2 }"
              >
                <RankMedal tier="shotcaller" :size="14" />

                <span class="avatar">
                  <CoachAvatar :hero-id="friend.hero" :size="18" />
                  <i v-if="i < 2" class="dot" />
                </span>

                <span class="friend-who">
                  <b>{{ friend.name }}</b>
                  <small>{{ copy.statuses[i] }}</small>
                </span>

                <span class="tools">
                  <Info :size="9" />
                  <Swords v-if="i === 1" :size="9" />
                  <Eye v-if="i === 0" :size="9" class="watch" />
                </span>
              </div>
            </aside>
          </div>

          <nav class="tabs">
            <span v-for="(icon, i) in TAB_ICONS" :key="i" :class="{ active: i === tab }">
              <component :is="icon" :size="12" />
              {{ copy.tabs[i] }}
              <i v-if="i === 2 && scene !== 'chat'">1</i>
            </span>
          </nav>
        </template>
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
  padding: 8px 8px 0;
  border-radius: 26px;
  background: var(--board-deep);
}
.pages {
  position: relative;
  flex: 1;
  display: grid;
  min-height: 0;
}
.page {
  position: relative;
  grid-area: 1 / 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  visibility: hidden;
  opacity: 0;
  transition:
    opacity 0.35s,
    visibility 0.35s;
}
.page.active {
  visibility: visible;
  opacity: 1;
}
.page.dim::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(8, 12, 11, 0.62);
}
.coach,
.resume,
.contracts,
.patch,
.discord,
.board,
.career-card,
.trial {
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  background: #ffffff06;
}
.coach {
  display: grid;
  gap: 3px;
  padding: 4px;
  background: linear-gradient(160deg, #273631eb, #18221feb);
}
.who,
.actions,
.score,
.base,
.rank-row,
.sheet-head,
.friend,
.tools,
.eyebrow,
.discord,
.footer,
.language,
.next,
.career-tabs,
.trial small,
.locked,
.go {
  display: flex;
  align-items: center;
}
.who {
  gap: 6px;
}
.rank-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  min-width: 0;
}
.rank-side b {
  color: var(--gold);
  font-size: 9px;
  line-height: 1;
  white-space: nowrap;
}
.rank-side b span,
.rank-side small {
  font-size: 6px;
}
.rank-side small:first-of-type {
  color: var(--gold);
}
.rank-side .track {
  width: 52px;
  background: var(--gold);
}
.names,
.friend-who {
  flex: 1;
  display: grid;
  min-width: 0;
}
.names b,
.friend-who b {
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
small,
.dim {
  color: var(--chalk-dim);
}
small {
  font-size: 7px;
}
.level,
.rank-row {
  justify-content: space-between;
  gap: 4px;
  font-size: 7px;
  white-space: nowrap;
}
.level > span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.level b,
.rank-row em {
  flex: none;
}
.level b,
.contracts svg,
.eyebrow,
em,
.watch,
.tile svg,
.play svg,
.continue svg {
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
.support,
.back,
.language b {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 3px;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
}
.actions > span,
.back {
  flex: 1;
  padding: 3px;
  color: var(--chalk-dim);
  font-size: 7px;
  white-space: nowrap;
}
.back {
  flex: none;
  align-self: flex-start;
  padding: 3px 6px;
}
.resume {
  display: grid;
  gap: 3px;
  padding: 4px;
  border-color: #f4c55b70;
  background: #f4c55b0f;
}
.meta {
  display: flex;
  justify-content: space-between;
  gap: 4px;
  font-size: 6.5px;
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
  width: 14px;
  height: 14px;
  border: 1px solid var(--team);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--team) 30%, transparent);
}
.continue,
.play,
.go {
  justify-content: center;
  gap: 4px;
  border-radius: var(--radius);
  background: var(--gold);
  color: var(--ink);
  font-weight: 800;
}
.continue,
.play {
  padding: 4px;
  font-size: 9px;
}
.continue svg,
.play svg,
.go svg {
  color: var(--ink);
}
.contracts,
.patch,
.discord,
.career-card {
  display: grid;
  gap: 2px;
  padding: 4px;
}
.contracts b,
.eyebrow {
  gap: 4px;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
em {
  margin-left: auto;
  font-style: normal;
}
.next {
  justify-content: space-between;
}
.patch {
  background:
    radial-gradient(ellipse at 100% 0%, rgba(244, 197, 91, 0.12), transparent 60%), rgba(255, 255, 255, 0.03);
}
.patch h3,
.career-card h3,
.sheet-head b {
  margin: 0;
  font-size: 16px;
  line-height: 1;
}
.eyebrow b {
  margin-left: auto;
  padding: 1px 4px;
  border-radius: 999px;
  background: var(--gold);
  color: var(--ink);
  font-size: 6px;
  letter-spacing: 0;
  text-transform: uppercase;
}
.patch p,
.career-card p,
.discord small {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  color: var(--chalk-dim);
  font-size: 7px;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}
.patch p strong {
  color: var(--gold);
}
.patch p {
  display: none;
}
.discord {
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 6px;
  border-color: rgba(88, 101, 242, 0.55);
  background: rgba(88, 101, 242, 0.16);
}
.discord b {
  font-size: 9px;
}
.discord small {
  display: none;
}
.board {
  display: grid;
  gap: 2px;
  padding: 3px 5px;
}
.board-head,
.standing,
.lanes {
  display: flex;
  align-items: center;
}
.board-head {
  justify-content: space-between;
  gap: 4px;
  min-height: 0;
}
.board-head > b {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--gold);
  font-size: 8px;
}
.lanes {
  gap: 2px;
  padding: 1px;
  border-radius: var(--radius);
  background: rgba(0, 0, 0, 0.25);
}
.lanes b {
  padding: 1px 3px;
  border-radius: var(--radius);
  color: var(--chalk-dim);
  font-size: 6px;
}
.lanes b.on {
  background: var(--panel-raised);
  color: var(--chalk);
}
.standing {
  gap: 3px;
  height: 16px;
  min-width: 0;
}
.standing em {
  width: 8px;
  color: var(--gold);
  font-style: normal;
  font-weight: 800;
}
.standing span {
  flex: 1;
  overflow: hidden;
  font-size: 8px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.standing strong {
  font-size: 7px;
  font-variant-numeric: tabular-nums;
}
.footer {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 4px;
}
.language {
  gap: 2px;
}
.language b {
  padding: 2px 4px;
  color: var(--chalk-dim);
  font-size: 7px;
}
.language .selected {
  background: var(--gold);
  color: var(--ink);
}
.support {
  padding: 2px 4px;
  color: var(--chalk-dim);
  font-size: 7px;
}
.legal {
  grid-column: 1 / -1;
  color: var(--chalk-faint);
  font-size: 6.5px;
}
.legal span {
  margin-left: 6px;
}
.launch {
  display: grid;
  gap: 4px;
  margin-top: auto;
  padding-top: 4px;
}
.quick {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
}
.tile {
  display: grid;
  justify-items: center;
  gap: 2px;
  padding: 4px 2px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: var(--panel);
  font-size: 7px;
  font-weight: 700;
  text-align: center;
}
.career-tabs {
  gap: 3px;
  padding: 2px;
  border-radius: var(--radius);
  background: #00000030;
}
.career-tabs b,
.career-tabs span {
  padding: 2px 4px;
  border-radius: var(--radius);
  font-size: 6.5px;
  white-space: nowrap;
}
.career-tabs b {
  background: var(--panel);
}
.trial {
  display: grid;
  gap: 2px;
  padding: 5px;
}
.trial small {
  justify-content: space-between;
}
.trial b {
  font-size: 9px;
}
.trial em {
  margin: 0;
  font-size: 7px;
}
.locked,
.go {
  justify-self: start;
  gap: 3px;
  margin-top: 2px;
  padding: 2px 5px;
  font-size: 7px;
}
.locked {
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  color: var(--chalk-dim);
}
.sheet {
  position: absolute;
  z-index: 2;
  inset: 10px 0 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-width: 100%;
  min-width: 0;
  padding: 8px;
  overflow: hidden;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  background: var(--panel);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55);
  visibility: hidden;
  opacity: 0;
  translate: 0 8px;
  transition:
    opacity 0.35s,
    translate 0.35s,
    visibility 0.35s;
}
.sheet.active {
  visibility: visible;
  opacity: 1;
  translate: 0;
}
.sheet-head {
  justify-content: space-between;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--edge);
}
.tools {
  flex: none;
  gap: 6px;
  color: var(--chalk-faint);
}
.friend {
  min-width: 0;
  gap: 5px;
  padding: 6px 0;
  border-top: 1px solid var(--edge);
}
.friend-who small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.avatar {
  position: relative;
  display: grid;
}
.dot {
  position: absolute;
  right: -1px;
  bottom: -1px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--heal);
  box-shadow: 0 0 0 1px var(--panel);
}
.away {
  opacity: 0.55;
}
.tabs {
  display: flex;
  justify-content: space-around;
  margin: 6px -8px 0;
  padding: 6px 4px 8px;
  border-top: 1px solid var(--edge-strong);
  border-radius: var(--radius) var(--radius) 0 0;
  background: rgba(15, 22, 20, 0.96);
  color: var(--chalk-faint);
}
.tabs > span {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 40px;
  font-size: 7px;
  font-weight: 700;
  transition: color 0.3s;
}
.tabs .active {
  color: var(--gold);
}
.tabs i {
  position: absolute;
  top: -3px;
  right: 2px;
  display: grid;
  place-items: center;
  min-width: 10px;
  height: 10px;
  padding: 0 2px;
  border-radius: 999px;
  background: var(--gold);
  color: var(--ink);
  font-size: 6px;
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
@media (prefers-reduced-motion: reduce) {
  .page,
  .sheet,
  .tabs > span {
    transition: none;
  }
}
</style>
