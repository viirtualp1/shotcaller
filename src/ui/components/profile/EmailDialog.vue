<script setup lang="ts">
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { computed, ref } from 'vue'
import { accountProblem, type AccountProblem } from '@/application/cloud/accountProblem'
import type { AccountMode } from '@/application/cloud/CloudStore'
import { useGameText } from '../../composables/useGameText'
import { useCloudStore } from '../../stores/cloud'

const props = defineProps<{ mode: AccountMode }>()
const open = defineModel<boolean>('open', { required: true })

const cloud = useCloudStore()
const { t } = useGameText()

/** Starts as asked, but can switch: signing in with an unused email offers to link it instead, and back. */
const mode = ref<AccountMode>(props.mode)
const step = ref<'email' | 'code'>('email')
const email = ref('')
const code = ref('')
const busy = ref(false)
const problem = ref<AccountProblem | null>(null)
const rawError = ref('')

const title = computed(() => t(mode.value === 'link' ? 'cloud.email.linkTitle' : 'cloud.email.signInTitle'))
const intro = computed(() => t(mode.value === 'link' ? 'cloud.email.linkText' : 'cloud.email.signInText'))

const failure = computed(() => {
  if (!problem.value) {
    return null
  }

  return problem.value === 'unknown'
    ? t('cloud.email.failed', { reason: rawError.value })
    : t(`cloud.email.problems.${problem.value}`)
})

/** The mode that fixes the problem, if switching would. */
const switchTo = computed<AccountMode | null>(() => {
  if (problem.value === 'noAccount' && mode.value === 'signIn') {
    return 'link'
  }

  return problem.value === 'emailTaken' && mode.value === 'link' ? 'signIn' : null
})

async function run(action: () => Promise<void>) {
  busy.value = true
  problem.value = null

  try {
    await action()
  } catch (error) {
    problem.value = accountProblem(error)
    rawError.value = error instanceof Error ? error.message : ''
  } finally {
    busy.value = false
  }
}

const send = () =>
  run(async () => {
    await cloud.sendEmail(email.value, mode.value)
    step.value = 'code'
  })

const verify = () =>
  run(async () => {
    await cloud.verifyEmail(email.value, code.value, mode.value)
    open.value = false
  })

function switchMode() {
  if (!switchTo.value) {
    return
  }

  mode.value = switchTo.value
  code.value = ''
  step.value = 'email'
  void send()
}
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="overlay" />

      <DialogContent class="sheet email" :aria-describedby="undefined">
        <DialogTitle class="title hand">{{ title }}</DialogTitle>

        <form v-if="step === 'email'" class="form" @submit.prevent="send">
          <p class="intro">{{ intro }}</p>

          <label class="field">
            <span>{{ t('cloud.email.address') }}</span>
            <input v-model="email" type="email" required autocomplete="email" inputmode="email" />
          </label>

          <button type="submit" class="btn primary big block" :disabled="busy">
            {{ t('cloud.email.send') }}
          </button>
        </form>

        <form v-else class="form" @submit.prevent="verify">
          <p class="intro">{{ t('cloud.email.sent', { email }) }}</p>

          <label class="field">
            <span>{{ t('cloud.email.code') }}</span>

            <input
              v-model="code"
              required
              autocomplete="one-time-code"
              inputmode="numeric"
              pattern="[0-9]{6,10}"
              maxlength="10"
              class="code"
            />
          </label>

          <button type="submit" class="btn primary big block" :disabled="busy">
            {{ t('cloud.email.verify') }}
          </button>

          <button type="button" class="btn ghost block" @click="step = 'email'">
            {{ t('cloud.email.back') }}
          </button>
        </form>

        <p v-if="failure" class="failure" role="alert">{{ failure }}</p>

        <button v-if="switchTo" type="button" class="btn block" :disabled="busy" @click="switchMode">
          {{ t(switchTo === 'link' ? 'cloud.email.linkInstead' : 'cloud.email.signInInstead') }}
        </button>

        <DialogClose class="btn ghost block">{{ t('cloud.email.cancel') }}</DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.email {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: min(440px, calc(100vw - 32px));
}

.title {
  font-size: 34px;
  line-height: 1;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.intro {
  margin: 0;
  color: var(--chalk-dim);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--chalk-dim);
}

.field input {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--edge-strong);
  background: #0f1614;
  color: var(--chalk);
  font: 600 16px/1.3 var(--font-ui);
  letter-spacing: normal;
  text-transform: none;
}

.field input:focus {
  outline: none;
  border-color: var(--gold);
}

.code {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.3em !important;
  text-align: center;
}

.failure {
  margin: 0;
  color: var(--theirs);
  font-size: 13px;
}
</style>
