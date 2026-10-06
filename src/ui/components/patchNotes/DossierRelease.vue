<script setup lang="ts">
import { ScanEye, Undo2 } from '@lucide/vue'
import { computed } from 'vue'
import type { HeroId } from '@/content/ids'
import type { RankTier } from '@/content/profile'
import { useSettingsStore } from '../../stores/settings'
import HeroAvatar from '../common/HeroAvatar.vue'
import RankMedal from '../profile/RankMedal.vue'

interface Row {
  readonly name: string
  readonly hero: HeroId
  readonly mmr: number
}

// A fixed 9.5 example: three coaches on the leaderboard and the profile of the first, apart from real accounts.
const ROWS: readonly Row[] = [
  {
    name: 'NightOwl',
    hero: 'sniper',
    mmr: 2140,
  },
  {
    name: 'Brickwall',
    hero: 'giant',
    mmr: 2085,
  },
  {
    name: 'Mira',
    hero: 'oracle',
    mmr: 1990,
  },
]

const PICKS: readonly { hero: HeroId; stars: 1 | 2 }[] = [
  {
    hero: 'giant',
    stars: 2,
  },
  {
    hero: 'pyromancer',
    stars: 2,
  },
  {
    hero: 'acolyte',
    stars: 1,
  },
  {
    hero: 'sniper',
    stars: 2,
  },
]

const TIER: RankTier = 'strategist'

const settings = useSettingsStore()

const copy = computed(() =>
  settings.locale === 'ru'
    ? {
        eyebrow: '9.5 / Досье тренера',
        title: 'Его почерк —\nтвой следующий ход.',
        intro:
          'Тренеры из таблицы лидеров теперь могут открыть свой профиль — читай его, разбирай и забирай лучшее.',
        board: 'Таблица лидеров',
        tags: ['Ломает трон', 'Соло-мид'],
        heroes: 'Побеждает на них',
      }
    : {
        eyebrow: '9.5 / Coach dossiers',
        title: 'Their playbook.\nYour next move.',
        intro:
          'Coaches on the leaderboard can now open their profiles: read them, take them apart, borrow the best.',
        board: 'Leaderboard',
        tags: ['Throne breaker', 'Solo mid'],
        heroes: 'Wins with',
      },
)
</script>

<template>
  <section class="campaign" aria-labelledby="dossier-release-title">
    <div class="words">
      <p class="eyebrow"><ScanEye :size="16" /> {{ copy.eyebrow }}</p>
      <h2 id="dossier-release-title" class="hand">{{ copy.title }}</h2>
      <p class="intro">{{ copy.intro }}</p>
    </div>

    <figure class="scene" aria-hidden="true">
      <div class="board">
        <span class="label">{{ copy.board }}</span>

        <ol>
          <li v-for="(row, index) in ROWS" :key="row.name" :class="{ picked: index === 0 }">
            <b>{{ index + 1 }}</b>
            <HeroAvatar :hero-id="row.hero" :size="28" />
            <span class="name">{{ row.name }}</span>
            <span class="mmr">{{ row.mmr }}</span>
          </li>
        </ol>
      </div>

      <Undo2 class="arrow" :size="44" />

      <div class="card">
        <header>
          <HeroAvatar hero-id="sniper" :size="44" />

          <div>
            <strong>{{ ROWS[0]!.name }}</strong>
            <span>{{ ROWS[0]!.mmr }} MMR</span>
          </div>

          <RankMedal :tier="TIER" :stars="3" :size="38" />
        </header>

        <ul class="tags">
          <li v-for="tag in copy.tags" :key="tag">{{ tag }}</li>
        </ul>

        <span class="label">{{ copy.heroes }}</span>

        <div class="picks">
          <HeroAvatar
            v-for="pick in PICKS"
            :key="pick.hero"
            :hero-id="pick.hero"
            :stars="pick.stars"
            :size="34"
          />
        </div>
      </div>
    </figure>
  </section>
</template>

<style scoped>
.campaign {
  display: grid;
  margin-top: 34px;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
  align-items: center;
  gap: 40px;
  margin-bottom: 36px;
  padding: 44px;
  overflow: hidden;
  border: 1px solid #f4c55b40;
  border-radius: var(--radius);
  background:
    radial-gradient(ellipse at 80% 30%, rgba(141, 186, 132, 0.12), transparent 60%),
    radial-gradient(ellipse at 0 100%, rgba(244, 197, 91, 0.08), transparent 55%), #14211b;
  box-shadow: 0 24px 70px #0004;
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--gold);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

h2 {
  margin: 20px 0 18px;
  font-size: clamp(40px, 5.2vw, 66px);
  line-height: 0.98;
  white-space: pre-line;
}

.intro {
  max-width: 400px;
  margin: 0;
  color: var(--chalk-dim);
  font-size: 15px;
  line-height: 1.7;
}

/* The leaderboard in the back, the opened profile in front of it, joined by a chalk arrow. */
.scene {
  position: relative;
  min-height: 330px;
  margin: 0;
}

.label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--chalk-faint);
}

.board {
  position: absolute;
  top: 18px;
  left: 0;
  display: grid;
  gap: 10px;
  width: 250px;
  padding: 16px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: #17221ccc;
  rotate: -3deg;
  opacity: 0.85;
}

.board ol {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.board li {
  display: grid;
  grid-template-columns: 14px auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: var(--radius);
  font-size: 13px;
}

.board li.picked {
  border-color: var(--gold);
  background: rgba(244, 197, 91, 0.08);
}

.board b {
  color: var(--chalk-faint);
}

.board .picked b,
.mmr {
  color: var(--gold);
}

.name {
  overflow: hidden;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mmr {
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.arrow {
  position: absolute;
  top: 120px;
  left: 232px;
  color: var(--gold);
  rotate: 200deg;
  scale: -1 1;
}

.card {
  position: absolute;
  right: 0;
  bottom: 0;
  display: grid;
  gap: 12px;
  width: 270px;
  padding: 18px;
  border: 1px solid #f4c55b66;
  border-radius: var(--radius);
  background: linear-gradient(160deg, #233225, #16211b);
  box-shadow: 0 20px 44px #0007;
  rotate: 2deg;
}

.card header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card header div {
  display: grid;
  flex: 1;
  gap: 2px;
}

.card header strong {
  font-size: 17px;
}

.card header span {
  font-size: 12px;
  color: var(--gold);
  font-weight: 700;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.tags li {
  padding: 3px 9px;
  border: 1px solid rgba(244, 197, 91, 0.4);
  border-radius: var(--radius);
  background: rgba(244, 197, 91, 0.08);
  color: var(--gold);
  font-size: 11px;
  font-weight: 700;
}

.picks {
  display: flex;
  gap: 8px;
  margin-top: -4px;
}

@media (max-width: 820px) {
  .campaign {
    grid-template-columns: 1fr;
    gap: 24px;
    padding: 28px 22px;
  }

  .scene {
    min-height: 360px;
    max-width: 420px;
    width: 100%;
    margin-inline: auto;
  }
}

@media (max-width: 440px) {
  .board {
    width: 220px;
  }

  .card {
    width: 250px;
  }

  .arrow {
    left: 196px;
  }
}
</style>
