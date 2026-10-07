<script setup lang="ts">
import { computed } from 'vue'
import { Translation } from 'vue-i18n'
import { ROLE_SIGNATURES } from '@/content/heroes'
import type { AbilityId, RoleId } from '@/content/ids'
import { tunedParams, type TalentChoice } from '@/content/talents'
import { abilityValueKind } from '../../abilityValueKinds'
import { useGameText } from '../../composables/useGameText'
import AbilityValue from './AbilityValue.vue'

const props = withDefaults(
  defineProps<{
    abilityId: AbilityId
    basePower: number
    power: number
    baseHealPower: number
    healPower: number
    role?: RoleId
    talents?: readonly TalentChoice[]
  }>(),
  {
    role: undefined,
    talents: () => [],
  },
)

const text = useGameText()

const borrowed = computed(() =>
  props.abilityId === 'mimic' && props.role ? ROLE_SIGNATURES[props.role] : null,
)

const boost = computed(() => {
  const tuned = tunedParams('mimic', props.talents)

  return tuned.power * tuned.borrowed
})

const keypath = computed(() => (borrowed.value ? 'abilities.mimicAs' : `abilities.${props.abilityId}`))

const values = computed(() =>
  text.abilityValues(
    props.abilityId,
    props.basePower,
    props.power,
    props.baseHealPower,
    props.healPower,
    props.talents,
  ),
)

const signatures = computed(() =>
  props.abilityId === 'mimic' && !props.role
    ? Object.fromEntries(Object.entries(ROLE_SIGNATURES).map(([role, id]) => [role, text.abilityName(id)]))
    : {},
)
</script>

<template>
  <Translation :keypath="keypath" scope="global" tag="span" class="description">
    <template v-for="(value, key) in values" :key="key" #[key]>
      <AbilityValue :kind="abilityValueKind(props.abilityId, key)" v-bind="value" />
    </template>

    <template v-for="(name, roleId) in signatures" :key="roleId" #[roleId]>{{ name }}</template>

    <template v-if="borrowed" #ability>{{ text.abilityName(borrowed) }}</template>

    <template v-if="borrowed" #effect>
      <AbilityDescription
        :ability-id="borrowed"
        :base-power="basePower * boost"
        :power="power * boost"
        :base-heal-power="baseHealPower * boost"
        :heal-power="healPower * boost"
      />
    </template>
  </Translation>
</template>

<style scoped>
.description {
  white-space: pre-line;
}
</style>
