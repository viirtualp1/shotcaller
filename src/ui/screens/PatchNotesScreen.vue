<script setup lang="ts">
import {
  ArrowLeft,
  LayoutPanelTop,
  Package,
  ScrollText,
  Swords,
  Users,
  WandSparkles,
  Wrench,
  Zap,
} from 'lucide-vue-next'
import { computed, watch, type Component } from 'vue'
import { ABILITY_NAMES } from '@/content/abilities'
import { HERO_IDS, type RoleId } from '@/content/ids'
import { HEROES } from '@/content/heroes'
import { ITEMS } from '@/content/items'
import { ROLES } from '@/content/roles'
import { cssColor } from '@/rendering/theme'
import HeroAvatar from '../components/common/HeroAvatar.vue'
import ItemIcon from '../components/common/ItemIcon.vue'
import NoteBadge from '../components/patchNotes/NoteBadge.vue'
import NoteLine from '../components/patchNotes/NoteLine.vue'
import PatchPicker from '../components/patchNotes/PatchPicker.vue'
import { useGameText } from '../composables/useGameText'
import { ROLE_ICONS } from '../icons'
import type { PatchNote } from '../patchNotes/notes'
import { usePatchNotesStore } from '../stores/patchNotes'
import { useSettingsStore } from '../stores/settings'

type SectionId = 'general' | 'items' | 'roles' | 'heroes' | 'interface' | 'fixes'

const SECTIONS: readonly { id: SectionId; icon: Component }[] = [
  {
    id: 'general',
    icon: ScrollText,
  },
  {
    id: 'items',
    icon: Package,
  },
  {
    id: 'roles',
    icon: Users,
  },
  {
    id: 'heroes',
    icon: Swords,
  },
  {
    id: 'interface',
    icon: LayoutPanelTop,
  },
  {
    id: 'fixes',
    icon: Wrench,
  },
]

const notes = usePatchNotesStore()
const settings = useSettingsStore()
const text = useGameText()
const { t } = text

/** The screen is only mounted while a patch is open. */
const patch = computed(() => notes.patch as PatchNote)
const sections = computed(() => SECTIONS.filter(({ id }) => patch.value[id]?.length))

const date = computed(() => {
  const [year = 0, month = 1, day = 1] = patch.value.date.split('-').map(Number)
  return new Intl.DateTimeFormat(settings.locale, { dateStyle: 'long' }).format(
    new Date(year, month - 1, day),
  )
})

const heroesWithRole = (role: RoleId) => HERO_IDS.filter((id) => HEROES[id].role === role)

function jump(id: SectionId) {
  document.getElementById(`patch-${id}`)?.scrollIntoView({ behavior: 'smooth' })
}

watch(
  () => patch.value.version,
  () => globalThis.scrollTo({ top: 0 }),
)
</script>

<template>
  <div class="patch-notes">
    <header class="topbar">
      <div class="bar">
        <button type="button" class="btn ghost back" @click="notes.close()">
          <ArrowLeft :size="16" /> {{ t('patchNotes.back') }}
        </button>

        <nav class="jump" :aria-label="t('patchNotes.jump')">
          <button
            v-for="section in sections"
            :key="section.id"
            type="button"
            class="chip"
            @click="jump(section.id)"
          >
            <component :is="section.icon" :size="14" />
            {{ t(`patchNotes.nav.${section.id}`) }}
          </button>
        </nav>

        <PatchPicker class="picker" />
      </div>
    </header>

    <Transition name="fade" mode="out-in">
      <main :key="patch.version" class="page">
        <section class="masthead">
          <h1 class="version hand">{{ patch.version }}</h1>
          <NoteLine :text="patch.title" class="headline" />
          <time :datetime="patch.date" class="date">{{ date }}</time>
        </section>

        <section v-if="patch.general?.length" id="patch-general" class="section">
          <h2 class="section-title"><ScrollText :size="18" /> {{ t('patchNotes.sections.general') }}</h2>

          <ul class="bullets">
            <li v-for="(line, i) in patch.general" :key="i"><NoteLine :text="line" /></li>
          </ul>
        </section>

        <section v-if="patch.items?.length" id="patch-items" class="section">
          <h2 class="section-title"><Package :size="18" /> {{ t('patchNotes.sections.items') }}</h2>

          <article v-for="entry in patch.items" :key="entry.id" class="entry">
            <header class="entry-head">
              <ItemIcon :item-id="entry.id" :size="46" />

              <div class="entry-name">
                <h3>{{ text.itemName(entry.id) }}</h3>
                <span class="meta"><span class="coin" /> {{ ITEMS[entry.id].cost }}</span>
              </div>

              <NoteBadge v-if="entry.badge" :badge="entry.badge" class="entry-badge" />
            </header>

            <ul class="bullets">
              <li v-for="(line, i) in entry.changes" :key="i"><NoteLine :text="line" /></li>
            </ul>
          </article>
        </section>

        <section v-if="patch.roles?.length" id="patch-roles" class="section">
          <h2 class="section-title"><Users :size="18" /> {{ t('patchNotes.sections.roles') }}</h2>

          <article
            v-for="entry in patch.roles"
            :key="entry.id"
            class="entry"
            :style="{ '--accent': cssColor(ROLES[entry.id].color) }"
          >
            <header class="entry-head">
              <span class="role-icon">
                <component :is="ROLE_ICONS[entry.id]" :size="24" />
              </span>

              <div class="entry-name">
                <h3>{{ text.roleName(entry.id) }}</h3>

                <span class="roster" :aria-label="t('patchNotes.roleHeroes')">
                  <span v-for="heroId in heroesWithRole(entry.id)" :key="heroId" class="roster-hero">
                    <HeroAvatar :hero-id="heroId" :size="20" />
                    {{ text.heroName(heroId) }}
                  </span>
                </span>
              </div>

              <NoteBadge v-if="entry.badge" :badge="entry.badge" class="entry-badge" />
            </header>

            <ul class="bullets">
              <li v-for="(line, i) in entry.changes" :key="i"><NoteLine :text="line" /></li>
            </ul>
          </article>
        </section>

        <section v-if="patch.heroes?.length" id="patch-heroes" class="section">
          <h2 class="section-title"><Swords :size="18" /> {{ t('patchNotes.sections.heroes') }}</h2>

          <article
            v-for="entry in patch.heroes"
            :key="entry.id"
            class="entry hero"
            :style="{ '--accent': cssColor(HEROES[entry.id].color) }"
          >
            <header class="entry-head">
              <HeroAvatar :hero-id="entry.id" :size="52" />

              <div class="entry-name">
                <h3>{{ text.heroName(entry.id) }}</h3>

                <span class="meta role" :style="{ color: cssColor(ROLES[HEROES[entry.id].role].color) }">
                  <component :is="ROLE_ICONS[HEROES[entry.id].role]" :size="13" />
                  {{ text.roleName(HEROES[entry.id].role) }}
                </span>
              </div>

              <NoteBadge v-if="entry.badge" :badge="entry.badge" class="entry-badge" />
            </header>

            <ul v-if="entry.changes.length" class="bullets">
              <li v-for="(line, i) in entry.changes" :key="i"><NoteLine :text="line" /></li>
            </ul>

            <div
              v-for="(ability, a) in entry.abilities"
              :key="ability.kind === 'ability' ? ability.id : a"
              class="ability"
            >
              <header class="ability-head">
                <span class="ability-icon">
                  <WandSparkles v-if="ability.kind === 'ability'" :size="16" />
                  <Zap v-else :size="16" />
                </span>

                <h4>
                  <template v-if="ability.kind === 'ability'">{{ ABILITY_NAMES[ability.id] }}</template>
                  <NoteLine v-else :text="ability.name" />
                </h4>

                <NoteBadge v-if="ability.badge" :badge="ability.badge" class="entry-badge" />
              </header>

              <ul class="bullets">
                <li v-for="(line, i) in ability.changes" :key="i"><NoteLine :text="line" /></li>
              </ul>
            </div>
          </article>
        </section>

        <section v-if="patch.interface?.length" id="patch-interface" class="section">
          <h2 class="section-title">
            <LayoutPanelTop :size="18" /> {{ t('patchNotes.sections.interface') }}
          </h2>

          <ul class="bullets">
            <li v-for="(line, i) in patch.interface" :key="i"><NoteLine :text="line" /></li>
          </ul>
        </section>

        <section v-if="patch.fixes?.length" id="patch-fixes" class="section">
          <h2 class="section-title"><Wrench :size="18" /> {{ t('patchNotes.sections.fixes') }}</h2>

          <ul class="bullets">
            <li v-for="(line, i) in patch.fixes" :key="i"><NoteLine :text="line" /></li>
          </ul>
        </section>
      </main>
    </Transition>
  </div>
</template>

<style scoped>
.patch-notes {
  --page: 880px;
  --topbar: 64px;
  min-height: 100%;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(19, 27, 24, 0.86);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--edge);
}

.bar {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 1200px;
  min-height: var(--topbar);
  margin: 0 auto;
  padding: 10px 20px;
}

.back {
  flex: none;
}

.jump {
  display: flex;
  flex: 1;
  justify-content: safe center;
  gap: 4px;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
  padding: 6px 10px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--chalk-dim);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.chip:hover {
  background: var(--panel-raised);
  color: var(--chalk);
}

.picker {
  flex: none;
}

.page {
  max-width: calc(var(--page) + 40px);
  margin: 0 auto;
  padding: 0 20px calc(80px + env(safe-area-inset-bottom, 0px));
}

.masthead {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 48px 0 0;
}

.kicker {
  color: var(--gold);
}

/* Caveat digits carry a wide left bearing; pull them back so the ink lines up with the headline. */
.version {
  margin: 4px 0 2px -0.13em;
  font-size: clamp(96px, 18vw, 168px);
  line-height: 0.85;
  color: var(--gold);
  text-shadow:
    0 0 1px rgba(244, 197, 91, 0.6),
    0 10px 40px rgba(244, 197, 91, 0.18);
}

.headline {
  font-size: clamp(24px, 3.4vw, 32px);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.01em;
}

.date {
  margin-top: 8px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--chalk-faint);
}

.section {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 40px;
  scroll-margin-top: calc(var(--topbar) + 8px);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--chalk);
}

.section-title svg {
  color: var(--gold);
}

.section-title::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, var(--edge-strong), transparent);
}

.entry {
  --accent: var(--gold);
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px 20px;
  border-radius: 14px;
  border: 1px solid var(--edge);
  background: linear-gradient(180deg, var(--panel), rgba(31, 43, 39, 0.6));
  overflow: hidden;
}

.entry::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: var(--accent);
  opacity: 0.8;
}

.entry.hero {
  background:
    radial-gradient(
      ellipse 60% 120% at 0% 0%,
      color-mix(in srgb, var(--accent) 16%, transparent),
      transparent 70%
    ),
    linear-gradient(180deg, var(--panel), rgba(31, 43, 39, 0.6));
}

.entry-head {
  display: flex;
  align-items: center;
  gap: 14px;
}

.entry-name {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.entry-name h3 {
  font-size: 19px;
  font-weight: 800;
  line-height: 1.1;
}

.meta {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--chalk-dim);
}

.entry-badge {
  margin-left: auto;
  align-self: flex-start;
}

.role-icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 55%, transparent);
  color: var(--accent);
}

.roster {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
}

.roster-hero {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--chalk-dim);
}

.roster-hero :deep(.disc) {
  box-shadow: none;
}

.bullets {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 15px;
  line-height: 1.55;
}

.bullets li {
  position: relative;
  padding-left: 20px;
}

.bullets li::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 0.66em;
  width: 6px;
  height: 6px;
  rotate: 45deg;
  background: var(--chalk-faint);
}

.ability {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 2px;
  padding: 14px 16px;
  border-radius: 10px;
  background: rgba(10, 15, 13, 0.35);
  border: 1px solid var(--edge);
}

.ability-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ability-icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent) 22%, transparent);
  color: var(--accent);
}

.ability-head h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
}

.ability-kind {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--chalk-faint);
}

@media (max-width: 720px) {
  .bar {
    flex-wrap: wrap;
    padding: 8px 16px;
  }

  .jump {
    order: 1;
    flex-basis: 100%;
    justify-content: flex-start;
    margin: 0 -16px;
    padding: 0 12px;
  }

  .picker {
    margin-left: auto;
  }

  .page {
    padding-inline: 16px;
  }

  .masthead {
    padding-top: 28px;
  }

  .section {
    scroll-margin-top: 112px;
  }

  .entry {
    padding: 16px;
  }

  .entry-head {
    flex-wrap: wrap;
  }
}
</style>
