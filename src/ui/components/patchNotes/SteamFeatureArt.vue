<script setup lang="ts">
import {
  ArrowRight,
  BadgeCheck,
  ChevronsUp,
  Crown,
  Flag,
  Flame,
  Footprints,
  Globe,
  Link2,
  Medal,
  Mountain,
  Shield,
  Sparkles,
  Star,
  Swords,
  Trophy,
  Users,
} from '@lucide/vue'
import { computed, type Component } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import DiscordIcon from '../common/DiscordIcon.vue'
import HeroAvatar from '../common/HeroAvatar.vue'
import SteamIcon from '../common/SteamIcon.vue'
import ModeMap from '../modes/ModeMap.vue'
import RankMedal from '../profile/RankMedal.vue'

defineProps<{ focus: 'achievements' | 'account' | 'crossplay' | 'window' }>()

/** Pictures for the sixteen 9.2 achievements, rank medals last; a sample coach has nine of these and Strategist. */
const ACHIEVEMENT_ICONS: readonly Component[] = [
  Trophy,
  Footprints,
  Crown,
  Shield,
  Star,
  Users,
  Flame,
  ChevronsUp,
  Link2,
  Sparkles,
  Swords,
  Flag,
  Medal,
  Mountain,
]

const SAMPLE_UNLOCKED = 9

const settings = useSettingsStore()

// Release illustrations are historical examples, not the player's current progress.
const copy = computed(() =>
  settings.locale === 'ru'
    ? {
        sample: 'Пример',
        progress: 'получено',
        web: 'Сайт',
        coach: 'Тренер',
        level: 'Уровень 12',
        ranked: 'Рейтинговый матч · Две линии',
        fullscreen: 'Весь экран',
        window: 'Окно',
        overlay: 'Оверлей Steam',
      }
    : {
        sample: 'Sample',
        progress: 'unlocked',
        web: 'Web',
        coach: 'Coach',
        level: 'Level 12',
        ranked: 'Ranked match · Two lanes',
        fullscreen: 'Full screen',
        window: 'Window',
        overlay: 'Steam overlay',
      },
)
</script>

<template>
  <div class="steam-art">
    <span class="sample">{{ copy.sample }}</span>

    <div v-if="focus === 'achievements'" class="achievements">
      <div class="grid">
        <span
          v-for="(icon, i) in ACHIEVEMENT_ICONS"
          :key="i"
          class="tile"
          :class="{ unlocked: i < SAMPLE_UNLOCKED }"
        >
          <component :is="icon" :size="20" />
        </span>

        <span class="tile medal unlocked">
          <RankMedal tier="strategist" :stars="1" :size="30" />
        </span>

        <span class="tile medal">
          <RankMedal tier="shotcaller" :size="30" dim />
        </span>
      </div>

      <p class="count">
        <b>{{ SAMPLE_UNLOCKED + 1 }}</b> / 16 <span>{{ copy.progress }}</span>
      </p>
    </div>

    <div v-else-if="focus === 'account'" class="account">
      <ul class="sources">
        <li><Globe :size="16" /> {{ copy.web }}</li>
        <li><DiscordIcon :size="16" /> Discord</li>
        <li class="steam"><SteamIcon :size="16" /> Steam</li>
      </ul>

      <ArrowRight :size="22" class="arrow" />

      <article class="coach">
        <HeroAvatar hero-id="archer" :stars="3" :size="54" class="portrait" />
        <strong>{{ copy.coach }}</strong>

        <span class="rank">
          <RankMedal tier="strategist" :stars="3" :size="28" />
          {{ copy.level }} · 1 240 MMR
        </span>

        <span class="linked"><BadgeCheck :size="13" /> Steam</span>
      </article>
    </div>

    <div v-else-if="focus === 'crossplay'" class="crossplay">
      <div class="sides">
        <article class="side">
          <span class="platform"><Globe :size="13" /> {{ copy.web }}</span>
          <HeroAvatar hero-id="pyromancer" :team="1" :size="50" />
          <span class="mmr"><RankMedal tier="strategist" :stars="2" :size="24" /> 1 180</span>
        </article>

        <span class="vs hand">VS</span>

        <article class="side steam">
          <span class="platform"><SteamIcon :size="13" /> Steam</span>
          <HeroAvatar hero-id="warden" :team="0" :size="50" />
          <span class="mmr"><RankMedal tier="strategist" :stars="3" :size="24" /> 1 240</span>
        </article>
      </div>

      <p class="ranked"><Swords :size="13" /> {{ copy.ranked }}</p>
    </div>

    <div v-else class="window">
      <div class="monitor">
        <ModeMap mode="threeLanes" :size="104" />
      </div>

      <i class="stand" />

      <div class="keys">
        <span><kbd>F11</kbd> {{ copy.fullscreen }} ⇄ {{ copy.window }}</span>
        <span><kbd>Alt</kbd>+<kbd>Enter</kbd></span>
        <span><kbd>Shift</kbd>+<kbd>Tab</kbd> {{ copy.overlay }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.steam-art {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  padding: 26px 18px 18px;
}

.sample {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 2px 7px;
  border-radius: var(--radius);
  background: #ffffff10;
  color: var(--chalk-faint);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.achievements {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, 44px);
  gap: 8px;
}

.tile {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: #ffffff06;
  color: var(--chalk-faint);
  opacity: 0.55;
}

.tile.unlocked {
  border-color: #f4c55b80;
  background: linear-gradient(145deg, #f4c55b2e, #f4c55b0c);
  color: var(--gold);
  opacity: 1;
  box-shadow: 0 0 16px #f4c55b1f;
}

.count {
  margin: 0;
  font-size: 13px;
  color: var(--chalk-dim);
}

.count b {
  color: var(--gold);
  font-size: 18px;
}

.count span {
  margin-left: 4px;
  font-size: 11px;
  color: var(--chalk-faint);
}

.account {
  display: flex;
  align-items: center;
  gap: 14px;
}

.sources {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.sources li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: #ffffff08;
  color: var(--chalk-dim);
  font-size: 12px;
  font-weight: 700;
}

.sources li.steam {
  border-color: #6cc4ff66;
  color: var(--ours);
}

.arrow {
  flex: none;
  color: var(--gold);
}

.coach {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 16px;
  border: 1px solid #f4c55b55;
  border-radius: var(--radius);
  background: var(--panel);
  box-shadow: 0 14px 30px #0006;
}

/* The stars sit on the rim of the portrait, half over it, rather than below it. */
.portrait {
  margin-bottom: 6px;
}

.portrait :deep(.stars) {
  bottom: calc(var(--size) * -0.16);
}

.coach strong {
  font-size: 15px;
}

.rank {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--chalk-dim);
  white-space: nowrap;
}

.linked {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 700;
  color: var(--ours);
}

.crossplay {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.sides {
  display: flex;
  align-items: center;
  gap: 16px;
}

.side {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 108px;
  padding: 12px 14px;
  border: 1px solid #ff706055;
  border-radius: var(--radius);
  background: var(--panel);
  box-shadow: 0 12px 26px #0006;
}

.side.steam {
  border-color: #6cc4ff66;
}

.platform {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 800;
  color: var(--chalk-dim);
}

.side.steam .platform {
  color: var(--ours);
}

.mmr {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 800;
  color: var(--chalk);
}

.vs {
  font-size: 34px;
  color: var(--gold);
}

.ranked {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 11px;
  color: var(--chalk-faint);
}

.window {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.monitor {
  display: grid;
  place-items: center;
  width: 220px;
  height: 136px;
  border: 6px solid #0b1310;
  border-radius: var(--radius);
  background: var(--board);
  box-shadow:
    0 0 0 1px #f4c55b40,
    0 16px 30px #0008;
}

.stand {
  width: 44px;
  height: 14px;
  background: linear-gradient(#0b1310, #17201c);
  clip-path: polygon(20% 0, 80% 0, 100% 100%, 0 100%);
}

.keys {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 14px;
  margin-top: 14px;
  font-size: 11px;
  color: var(--chalk-dim);
}

kbd {
  display: inline-block;
  min-width: 24px;
  padding: 2px 6px;
  border: 1px solid var(--edge-strong);
  border-bottom-width: 2px;
  border-radius: var(--radius);
  background: #ffffff0a;
  color: var(--chalk);
  font-family: var(--font-ui);
  font-size: 11px;
  font-weight: 700;
  text-align: center;
}

@media (max-width: 380px) {
  .grid {
    grid-template-columns: repeat(4, 38px);
  }

  .tile {
    width: 38px;
    height: 38px;
  }

  .account {
    gap: 8px;
  }

  .sources li {
    padding: 6px 8px;
    font-size: 11px;
  }

  .coach {
    padding: 12px 10px;
  }

  .sides {
    gap: 8px;
  }

  .side {
    min-width: 0;
    padding: 10px;
  }
}
</style>
