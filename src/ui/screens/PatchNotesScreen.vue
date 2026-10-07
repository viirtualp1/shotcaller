<script setup lang="ts">
import {
  ArrowLeft,
  LayoutPanelTop,
  Package,
  ScrollText,
  Sparkles,
  Swords,
  Users,
  WandSparkles,
  Wrench,
  Zap,
} from '@lucide/vue'
import { computed, watch } from 'vue'
import { ABILITY_NAMES } from '@/content/abilities'
import { HERO_IDS, type RoleId } from '@/content/ids'
import { HEROES } from '@/content/heroes'
import { ITEMS } from '@/content/items'
import { ROLES } from '@/content/roles'
import { cssColor } from '@/rendering/theme'
import HeroAvatar from '../components/common/HeroAvatar.vue'
import ItemIcon from '../components/common/ItemIcon.vue'
import ReleaseNotice from '../components/common/ReleaseNotice.vue'
import FeatureCard from '../components/patchNotes/FeatureCard.vue'
import CareerRelease from '../components/patchNotes/CareerRelease.vue'
import MatchmakingRelease from '../components/patchNotes/MatchmakingRelease.vue'
import TrainingRelease from '../components/patchNotes/TrainingRelease.vue'
import PauseRelease from '../components/patchNotes/PauseRelease.vue'
import ForgeRelease from '../components/patchNotes/ForgeRelease.vue'
import HomeRelease from '../components/patchNotes/HomeRelease.vue'
import CrossPlatformRelease from '../components/patchNotes/CrossPlatformRelease.vue'
import HudRelease from '../components/patchNotes/HudRelease.vue'
import PocketRelease from '../components/patchNotes/PocketRelease.vue'
import DossierRelease from '../components/patchNotes/DossierRelease.vue'
import AllianceRelease from '../components/patchNotes/AllianceRelease.vue'
import FactionFieldGuide from '../components/patchNotes/FactionFieldGuide.vue'
import NoteBadge from '../components/patchNotes/NoteBadge.vue'
import NoteLine from '../components/patchNotes/NoteLine.vue'
import PatchPager from '../components/patchNotes/PatchPager.vue'
import PatchPicker from '../components/patchNotes/PatchPicker.vue'
import { useGameText } from '../composables/useGameText'
import { vOpticalAlign } from '../directives/opticalAlign'
import { ADAPTIVE_ICON, ROLE_ICONS } from '../icons'
import type { PatchNote } from '../patchNotes/notes'
import { usePatchNotesStore } from '../stores/patchNotes'
import { useSettingsStore } from '../stores/settings'

const notes = usePatchNotesStore()
const settings = useSettingsStore()
const text = useGameText()
const { t } = text

/** The screen is only mounted while a patch is open. */
const patch = computed(() => notes.patch as PatchNote)

const date = computed(() => {
  const [year = 0, month = 1, day = 1] = patch.value.date.split('-').map(Number)
  return new Intl.DateTimeFormat(settings.locale, { dateStyle: 'long' }).format(
    new Date(year, month - 1, day),
  )
})

const heroesWithRole = (role: RoleId) => HERO_IDS.filter((id) => HEROES[id].role === role)

watch(
  () => patch.value.version,
  () => globalThis.scrollTo({ top: 0 }),
)
</script>

<template>
  <div class="patch-notes">
    <header class="topbar">
      <div class="bar">
        <a href="/" class="btn" @click.prevent="notes.close()">
          <ArrowLeft :size="16" /> {{ t('patchNotes.back') }}
        </a>

        <PatchPicker />
      </div>
    </header>

    <Transition name="fade" mode="out-in">
      <main :key="patch.version" class="page" :class="{ wide: patch.wide }">
        <section class="masthead">
          <ReleaseNotice
            v-if="notes.awaitingUpdate"
            :requested-version="notes.requestedVersion ?? undefined"
          />

          <h1 v-optical-align class="version hand">{{ patch.version }}</h1>
          <NoteLine :text="patch.title" class="headline" />
          <time :datetime="patch.date" class="date">{{ date }}</time>
        </section>

        <CareerRelease v-if="patch.campaign === 'career'" />

        <MatchmakingRelease v-else-if="patch.campaign === 'matchmaking'" />

        <TrainingRelease v-else-if="patch.campaign === 'training'" />

        <PauseRelease v-else-if="patch.campaign === 'pause'" />

        <ForgeRelease v-else-if="patch.campaign === 'forge'" :version="patch.version" />

        <HomeRelease v-else-if="patch.campaign === 'home'" />

        <CrossPlatformRelease v-else-if="patch.campaign === 'crossPlatform'" />

        <HudRelease v-else-if="patch.campaign === 'hud'" />

        <PocketRelease v-else-if="patch.campaign === 'pocket'" />

        <DossierRelease v-else-if="patch.campaign === 'dossier'" />

        <AllianceRelease v-else-if="patch.campaign === 'alliance'" />

        <section v-if="patch.features?.length" id="patch-features" class="section">
          <h2 class="section-title"><Sparkles :size="18" /> {{ t('patchNotes.sections.features') }}</h2>

          <div class="features">
            <FeatureCard
              v-for="(feature, i) in patch.features"
              :key="i"
              :feature="feature"
              :wide="i === 0 && !patch.campaign"
              :class="{ lead: i === 0 && !patch.campaign }"
            />
          </div>
        </section>

        <section v-if="patch.factions?.length" id="patch-factions" class="section">
          <h2 class="section-title"><Users :size="18" /> {{ t('patchNotes.factions') }}</h2>
          <FactionFieldGuide :factions="patch.factions" />
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
                  <component
                    :is="HEROES[entry.id].adaptive ? ADAPTIVE_ICON : ROLE_ICONS[HEROES[entry.id].role]"
                    :size="13"
                  />
                  {{ text.heroRoleName(entry.id) }}
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

        <PatchPager :patch="patch" class="pager" />
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

/* The bar itself stays out of the way of the page scrolling under it; only its buttons take clicks. */
.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  padding-top: env(safe-area-inset-top, 0px);
  pointer-events: none;
}

.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  max-width: 1200px;
  min-height: var(--topbar);
  margin: 0 auto;
  padding: 10px 20px;
}

.bar :deep(.btn) {
  flex: none;
  pointer-events: auto;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
}

.page {
  max-width: calc(var(--page) + 40px);
  margin: 0 auto;
  padding: 0 20px calc(80px + env(safe-area-inset-bottom, 0px));
}

.page.wide {
  --page: 1140px;
}

.masthead {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 48px 0 0;
}

.masthead > :deep(.release-notice) {
  width: 100%;
  margin-bottom: 24px;
}

.kicker {
  color: var(--gold);
}

.version {
  margin: 4px 0 2px;
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

/* After every change, set apart like the pages of a book. */
.pager {
  margin-top: 48px;
  padding-top: 24px;
  border-top: 1px solid var(--edge);
}

.features {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.features .lead {
  grid-column: 1 / -1;
}

@media (max-width: 640px) {
  .features {
    grid-template-columns: minmax(0, 1fr);
  }
}

.section {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 40px;
}

#patch-factions {
  scroll-margin-top: calc(var(--topbar) + env(safe-area-inset-top, 0px));
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
  border-radius: var(--radius);
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
  border-radius: var(--radius);
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
  border-radius: var(--radius);
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
  border-radius: var(--radius);
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
    padding: 8px 16px;
  }

  .page {
    padding-inline: 16px;
  }

  .masthead {
    padding-top: 28px;
  }

  .entry {
    padding: 16px;
  }

  .entry-head {
    flex-wrap: wrap;
  }
}
</style>
