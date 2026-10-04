<script setup lang="ts">
import { computed, ref, useId, useTemplateRef } from 'vue'

const LENGTH = 8
const GROUP = 4

const props = defineProps<{
  label: string
  disabled?: boolean
}>()

const code = defineModel<string>({ required: true })

const id = useId()
const input = useTemplateRef<HTMLInputElement>('input')
const slots = useTemplateRef<HTMLElement>('slots')
const focused = ref(false)
const caret = ref(0)

const chars = computed(() => sanitize(code.value))

function sanitize(value: string) {
  return value
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[^A-HJ-NP-Z2-9]/g, '')
    .slice(0, LENGTH)
}

function readCaret() {
  caret.value = input.value?.selectionStart ?? chars.value.length
}

function focus() {
  input.value?.focus()
  readCaret()
}

function onFocus() {
  focused.value = true
  readCaret()
}

function onInput(event: Event) {
  const field = event.target as HTMLInputElement
  const next = sanitize(field.value)
  const at = sanitize(field.value.slice(0, field.selectionStart ?? next.length)).length

  code.value = next
  field.value = next
  field.setSelectionRange(at, at)
  caret.value = at
}

function onBeforeInput(event: InputEvent) {
  if (props.disabled || event.inputType !== 'insertText' || !event.data) {
    return
  }

  const inserted = sanitize(event.data)
  const start = input.value?.selectionStart ?? 0
  const end = input.value?.selectionEnd ?? 0
  const nextLength = chars.value.length - (end - start) + inserted.length

  if (!inserted || nextLength > LENGTH) {
    event.preventDefault()
  }
}

function onPaste(event: ClipboardEvent) {
  const pasted = sanitize(event.clipboardData?.getData('text') ?? '')

  if (!pasted) {
    event.preventDefault()

    return
  }

  event.preventDefault()
  code.value = pasted
  caret.value = pasted.length
  input.value?.setSelectionRange(pasted.length, pasted.length)
}

function onClick(event: MouseEvent) {
  const cells = [...(slots.value?.querySelectorAll<HTMLElement>('.cell') ?? [])]
  const hit = cells.findIndex((cell) => event.clientX <= cell.getBoundingClientRect().right)
  const index = Math.min(hit < 0 ? cells.length - 1 : hit, chars.value.length)

  input.value?.setSelectionRange(index, index)
  caret.value = index
}

function isActive(index: number) {
  return focused.value && index === Math.min(caret.value, LENGTH - 1)
}

defineExpose({ focus })
</script>

<template>
  <div class="code">
    <label class="sr" :for="id">{{ label }}</label>

    <div ref="slots" class="slots">
      <template v-for="group in 2" :key="group">
        <span v-if="group === 2" class="dash" aria-hidden="true">-</span>

        <span
          v-for="cell in GROUP"
          :key="`${group}-${cell}`"
          class="cell"
          :class="{
            filled: !!chars[(group - 1) * GROUP + cell - 1],
            active: isActive((group - 1) * GROUP + cell - 1),
          }"
          aria-hidden="true"
        >
          {{ chars[(group - 1) * GROUP + cell - 1] }}
        </span>
      </template>

      <input
        :id="id"
        ref="input"
        :value="chars"
        class="field"
        type="text"
        maxlength="17"
        autocomplete="off"
        autocapitalize="characters"
        spellcheck="false"
        :disabled="disabled"
        @focus="onFocus"
        @blur="focused = false"
        @click="onClick"
        @keyup="readCaret"
        @select="readCaret"
        @beforeinput="onBeforeInput"
        @input="onInput"
        @paste="onPaste"
      />
    </div>
  </div>
</template>

<style scoped>
.code {
  min-width: 0;
}

.sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.slots {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}

.cell {
  display: grid;
  flex: 1;
  place-items: center;
  height: 48px;
  min-width: 0;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  background: #0f1614;
  color: var(--chalk);
  font:
    700 18px/1 Consolas,
    'Courier New',
    monospace;
}

.cell.filled {
  border-color: var(--chalk-faint);
}

.cell.active {
  border-color: var(--gold);
  box-shadow: inset 0 0 0 1px var(--gold);
}

.dash {
  flex: none;
  color: var(--chalk-faint);
  font:
    700 18px/1 Consolas,
    'Courier New',
    monospace;
}

.field {
  position: absolute;
  inset: 0;
  width: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  opacity: 0;
  cursor: text;
}

.field:disabled {
  cursor: default;
}
</style>
