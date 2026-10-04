<script setup lang="ts">
import { X } from '@lucide/vue'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import {
  isFriendCode,
  normalizeFriendCode,
  formatFriendCode,
  type FriendRequestResult,
} from '@/application/social/friends'
import { useGameText } from '../../composables/useGameText'
import { useModal } from '../../composables/useModal'
import { useFriendsStore } from '../../stores/friends'
import FriendCodeInput from './FriendCodeInput.vue'
import FriendCodeHint from './FriendCodeHint.vue'

const open = defineModel<boolean>('open', { required: true })

const friends = useFriendsStore()
const { t } = useGameText()
useModal(open)

const code = ref('')
const result = ref<FriendRequestResult | 'error' | null>(null)
const sending = ref(false)
const field = useTemplateRef<InstanceType<typeof FriendCodeInput>>('field')

const ownCode = computed(() => (friends.card ? formatFriendCode(friends.card.friendCode) : ''))
const valid = computed(() => isFriendCode(code.value))
const succeeded = computed(() => result.value === 'sent' || result.value === 'accepted')

async function submit() {
  if (!valid.value || sending.value) {
    return
  }

  sending.value = true
  result.value = await friends.add(normalizeFriendCode(code.value))
  sending.value = false

  if (succeeded.value) {
    code.value = ''
  }
}

watch(code, (value) => {
  if (value) {
    result.value = null
  }
})

watch(open, async (shown) => {
  if (!shown) {
    return
  }

  code.value = ''
  result.value = null
  await nextTick()
  field.value?.focus()
})
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="overlay add-overlay" />

      <DialogContent class="sheet add-friend" @open-auto-focus.prevent>
        <header class="head">
          <DialogTitle class="title hand">{{ t('friends.addFriend') }}</DialogTitle>

          <DialogClose class="btn ghost icon" :aria-label="t('friends.close')">
            <X :size="18" />
          </DialogClose>
        </header>

        <FriendCodeHint v-if="ownCode" :code="ownCode" />
        <DialogDescription class="sr">{{ t('friends.codeLabel') }}</DialogDescription>

        <form class="form" @submit.prevent="submit">
          <FriendCodeInput ref="field" v-model="code" :label="t('friends.codeLabel')" :disabled="sending" />

          <button type="submit" class="btn primary block" :disabled="!valid || sending">
            {{ t('friends.sendRequest') }}
          </button>

          <p v-if="result" class="result" :class="{ good: succeeded }" role="status">
            {{ t(`friends.results.${result}`) }}
          </p>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.add-overlay {
  z-index: 70;
}

.add-friend {
  z-index: 71;
  width: min(400px, calc(100vw - 32px));
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.head-title {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.title {
  margin: 0;
  font-size: 28px;
  line-height: 1;
}

.icon {
  width: 36px;
  height: 36px;
  padding: 0;
}

.sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 16px;
}

.result {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--theirs);
}

.result.good {
  color: var(--heal);
}
</style>
