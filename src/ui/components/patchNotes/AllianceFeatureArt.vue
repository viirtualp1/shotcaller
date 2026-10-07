<script setup lang="ts">
import { ArrowRight, Coins, Ghost, Moon, ShieldCheck, Shuffle, Sparkles, Swords } from '@lucide/vue'
import { computed } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import HeroAvatar from '../common/HeroAvatar.vue'
import ItemIcon from '../common/ItemIcon.vue'

const props = defineProps<{ focus: 'factions' | 'ghosts' | 'forge' | 'variety' }>()
const settings = useSettingsStore()

const copy = computed(() =>
  settings.locale === 'ru'
    ? {
        pair: 'Собери пару. Найди третьего.',
        faction: 'Легион',
        pairBonus: '−12% урона',
        trioBonus: '−22% урона · 20% отражения',
        search: 'Поиск · 45 с',
        commit: 'Выбери «Сыграть с призраком»',
        ghost: 'Бой с записанным составом',
        rating: 'Половина изменения рейтинга',
        upgrade: 'Следующая покупка — улучшение',
        slot: 'Два предмета → один слот',
        rotation: '15 из 21 героя',
        twist: 'Новый модификатор раунда',
        hard: 'Сложно',
        income: '+2 золота боту за раунд',
      }
    : {
        pair: 'Build a pair. Find the third.',
        faction: 'Legion',
        pairBonus: '−12% damage',
        trioBonus: '−22% damage · 20% reflection',
        search: 'Searching · 45 s',
        commit: 'Choose Play a ghost',
        ghost: 'Fight a saved squad',
        rating: 'Half the rating change',
        upgrade: 'Your next purchase is an upgrade',
        slot: 'Two items → one slot',
        rotation: '15 of 21 heroes',
        twist: 'A new round twist',
        hard: 'Hard',
        income: '+2 gold to the bot each round',
      },
)
</script>

<template>
  <div class="alliance-art" :class="focus">
    <template v-if="props.focus === 'factions'">
      <span class="label">{{ copy.pair }}</span>

      <div class="squad">
        <HeroAvatar hero-id="spearman" :size="56" />

        <span class="link" />

        <HeroAvatar hero-id="herald" :size="56" />

        <span class="link" />

        <HeroAvatar hero-id="sniper" :size="56" />
      </div>

      <div class="steps">
        <span><b>2</b>{{ copy.pairBonus }}</span>

        <ArrowRight :size="18" />

        <span class="third"><b>3</b>{{ copy.trioBonus }}</span>
      </div>
    </template>

    <template v-else-if="props.focus === 'ghosts'">
      <div class="ghost-clock hand">45<span>s</span><Ghost :size="44" /></div>

      <div class="ghost-steps">
        <span><Swords :size="15" />{{ copy.commit }}</span>

        <ArrowRight :size="16" />

        <span>{{ copy.ghost }}</span>
      </div>

      <div class="rating">
        <strong>½ MMR</strong><span>{{ copy.rating }}</span>
      </div>
    </template>

    <template v-else-if="props.focus === 'forge'">
      <span class="label">{{ copy.upgrade }}</span>

      <div class="forge-row">
        <ItemIcon item-id="gloves" :size="50" />

        <span class="hand">+</span>

        <ItemIcon item-id="gloves" :size="50" />

        <ArrowRight :size="24" />

        <span class="upgrade">
          <ItemIcon item-id="gloves+" :size="64" />

          <Sparkles :size="18" />
        </span>
      </div>

      <span class="caption">{{ copy.slot }}</span>
    </template>

    <template v-else>
      <div class="rule-card">
        <Shuffle :size="18" />

        <span>{{ copy.rotation }}</span>

        <span class="rule-portraits">
          <HeroAvatar hero-id="archer" :size="30" />

          <HeroAvatar hero-id="necromancer" :size="30" />

          <HeroAvatar hero-id="stonewright" :size="30" />
        </span>
      </div>

      <div class="rule-card twist">
        <Moon :size="18" />

        <span>{{ copy.twist }}</span>

        <Sparkles :size="20" />
      </div>

      <div class="hard-card">
        <ShieldCheck :size="19" />

        <strong>{{ copy.hard }}</strong>

        <Coins :size="15" />

        <span>{{ copy.income }}</span>
      </div>
    </template>

    <Swords class="watermark" :size="140" :stroke-width="0.5" />
  </div>
</template>

<style scoped>
.alliance-art {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 270px;
  gap: 24px;
  padding: 22px;
  isolation: isolate;
  background: radial-gradient(ellipse at 50% 60%, #d9a44110, transparent 65%);
}
.label {
  font-family: var(--font-hand);
  font-size: 24px;
  color: var(--gold);
  text-align: center;
}
.squad {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}
.link {
  width: 24px;
  border-top: 2px dashed #d9a44177;
}
.steps {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--chalk-dim);
}
.steps span {
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: center;
  font-size: 11px;
}
.steps b {
  font-family: var(--font-hand);
  font-size: 28px;
  color: var(--gold);
}
.third {
  padding: 5px 12px;
  border: 1px solid #d9a44155;
  border-radius: var(--radius);
  background: #d9a4410a;
}
.ghost-clock {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #a2bdd3;
  font-size: 90px;
  line-height: 1;
}
.ghost-clock span {
  font-size: 35px;
}
.ghost-clock svg {
  margin-left: 18px;
  opacity: 0.65;
}
.ghost-steps {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--chalk-dim);
  font-size: 11px;
}
.ghost-steps span {
  display: flex;
  align-items: center;
  gap: 6px;
}
.rating {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.rating strong {
  color: #a2bdd3;
  font-size: 20px;
}
.rating span,
.caption {
  color: var(--chalk-dim);
  font-size: 12px;
  text-align: center;
}
.forge-row {
  display: flex;
  align-items: center;
  gap: 13px;
}
.forge-row > .hand {
  font-size: 32px;
  color: var(--gold);
}
.forge-row > svg {
  color: var(--gold);
}
.upgrade {
  position: relative;
  padding: 10px;
  border: 1px solid #d9a44177;
  border-radius: var(--radius);
  background: #d9a44116;
  box-shadow: 0 0 30px #d9a44118;
}
.upgrade > svg {
  position: absolute;
  top: -10px;
  right: -8px;
  color: var(--gold);
}
.rule-card {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  max-width: 350px;
  padding: 14px;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  background: #182620;
  color: var(--chalk);
  font-size: 12px;
  box-shadow: 5px 7px 0 #0002;
  transform: rotate(-3deg);
}
.rule-card > svg {
  flex: none;
  color: var(--gold);
}
.rule-portraits {
  display: flex;
  gap: 4px;
  margin-left: auto;
}
.twist {
  transform: rotate(3deg);
  margin-top: -9px;
}
.twist > svg:last-child {
  margin-left: auto;
}
.hard-card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--gold);
  font-size: 12px;
}
.hard-card span {
  color: var(--chalk-dim);
  font-size: 11px;
}
.watermark {
  position: absolute;
  z-index: -1;
  bottom: -20px;
  right: -10px;
  color: #d9a44107;
  transform: rotate(-20deg);
}
@media (max-width: 420px) {
  .alliance-art {
    padding: 18px 12px;
    min-height: 250px;
  }
  .forge-row {
    gap: 8px;
  }
  .ghost-steps {
    gap: 8px;
    font-size: 10px;
  }
  .label {
    font-size: 23px;
  }
}
</style>
