<script setup lang="ts">
import { useIntervalFn } from '@vueuse/core'
import { Mail } from '@lucide/vue'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { computed, nextTick, ref, useId, useTemplateRef, watch } from 'vue'
import { accountProblem, type AccountProblem } from '@/application/cloud/accountProblem'
import type { AccountMode } from '@/application/cloud/CloudStore'
import { useGameText } from '../../composables/useGameText'
import { useModal } from '../../composables/useModal'
import { useCloudStore } from '../../stores/cloud'
import EmailCodeInput from '../common/EmailCodeInput.vue'
import { isCompleteEmailCode } from '../common/emailCodeInput'

/** Supabase lets one address get a new code about once a minute. */
const RESEND_AFTER_S = 60

const cloud = useCloudStore()
const { t } = useGameText()
const codeHintId = useId()
const failureId = useId()
const codeInput = useTemplateRef<InstanceType<typeof EmailCodeInput>>('codeInput')

useModal(() => cloud.signInOpen)

const step = ref<'email' | 'code'>('email')
const email = ref('')
const code = ref('')
/** Which code went out: a sign-in one for a known address, a confirmation one for a new address. */
const mode = ref<AccountMode>('signIn')
const busy = ref(false)
const problem = ref<AccountProblem | null>(null)
const rawError = ref('')
const resendIn = ref(0)

const failure = computed(() => {
  if (!problem.value) {
    return null
  }

  return problem.value === 'unknown'
    ? t('cloud.email.failed', { reason: rawError.value })
    : t(`cloud.email.problems.${problem.value}`)
})

const canVerify = computed(() => isCompleteEmailCode(code.value))
const codeDescription = computed(() => (failure.value ? `${codeHintId} ${failureId}` : codeHintId))

async function run(action: () => Promise<void>) {
  if (busy.value) {
    return
  }

  busy.value = true
  problem.value = null

  try {
    await action()
  } catch (error) {
    problem.value = accountProblem(error)
    rawError.value = error instanceof Error ? error.message : ''
  } finally {
    busy.value = false
    await nextTick()

    if (cloud.signInOpen && step.value === 'code') {
      codeInput.value?.focus(problem.value === 'badCode')
    }
  }
}

const send = () =>
  run(async () => {
    mode.value = await cloud.sendCode(email.value)
    step.value = 'code'
    code.value = ''
    resendIn.value = RESEND_AFTER_S
    resume()
  })

function verify() {
  if (!canVerify.value) {
    return
  }

  return run(() => cloud.verifyCode(email.value, code.value, mode.value))
}

const google = () => run(() => cloud.signInWithGoogle())

const { pause, resume } = useIntervalFn(
  () => {
    resendIn.value = Math.max(0, resendIn.value - 1)

    if (resendIn.value === 0) {
      pause()
    }
  },
  1000,
  { immediate: false },
)

watch(
  () => cloud.signInOpen,
  (open) => {
    if (open) {
      step.value = 'email'
      code.value = ''
      problem.value = null
    }
  },
)

watch(code, () => {
  if (problem.value === 'badCode') {
    problem.value = null
  }
})
</script>

<template>
  <DialogRoot v-model:open="cloud.signInOpen">
    <DialogPortal>
      <DialogOverlay class="overlay" />

      <DialogContent class="sheet sign-in">
        <DialogTitle class="title hand">{{ t('cloud.email.title') }}</DialogTitle>

        <form v-if="step === 'email'" class="form" @submit.prevent="send">
          <DialogDescription class="intro">{{ t('cloud.email.text') }}</DialogDescription>

          <label class="field">
            <span>{{ t('cloud.email.address') }}</span>

            <input
              v-model="email"
              type="email"
              required
              autocomplete="email"
              inputmode="email"
              :disabled="busy"
            />
          </label>

          <button type="submit" class="btn primary big block" :disabled="busy">
            <Mail :size="17" /> {{ t('cloud.email.send') }}
          </button>

          <template v-if="cloud.google">
            <span class="or">{{ t('cloud.email.or') }}</span>

            <button type="button" class="btn big block" :disabled="busy" @click="google">
              <span class="g" aria-hidden="true">G</span> {{ t('cloud.signInGoogle') }}
            </button>
          </template>
        </form>

        <form v-else class="form" @submit.prevent="verify">
          <DialogDescription :id="codeHintId" class="intro">
            {{ t(mode === 'link' ? 'cloud.email.sentSignUp' : 'cloud.email.sentSignIn', { email }) }}
            {{ t('cloud.email.codeHint') }}
          </DialogDescription>

          <EmailCodeInput
            ref="codeInput"
            v-model="code"
            :label="t('cloud.email.code')"
            :described-by="codeDescription"
            :invalid="problem === 'badCode'"
            :disabled="busy"
          />

          <button type="submit" class="btn primary big block" :disabled="busy || !canVerify">
            {{ t('cloud.email.verify') }}
          </button>

          <div class="row">
            <button type="button" class="btn ghost" :disabled="busy || resendIn > 0" @click="send">
              {{ resendIn > 0 ? t('cloud.email.resendIn', { s: resendIn }) : t('cloud.email.resend') }}
            </button>

            <button type="button" class="btn ghost" :disabled="busy" @click="step = 'email'">
              {{ t('cloud.email.back') }}
            </button>
          </div>
        </form>

        <p v-if="failure" :id="failureId" class="failure" role="alert">{{ failure }}</p>
        <DialogClose class="btn ghost block">{{ t('cloud.email.cancel') }}</DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.sign-in {
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
  border-radius: var(--radius);
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

.or {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: var(--chalk-faint);
}

.or::before,
.or::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--edge);
}

.row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
}

.g {
  font-weight: 800;
  color: #8ab4f8;
}

.failure {
  margin: 0;
  color: var(--theirs);
  font-size: 13px;
}
</style>
