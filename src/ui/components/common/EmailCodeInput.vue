<script setup lang="ts">
import { useElementSize } from '@vueuse/core'
import { computed, ref, useId, useTemplateRef } from 'vue'
import { EMAIL_CODE_MAX_LENGTH, EMAIL_CODE_MIN_LENGTH, emailCodeDigits } from './emailCodeInput'

const CELL_GAP = 8
let pointerStart: { x: number; y: number; time: number } | null = null
let replacementPending = false

const props = defineProps<{
  label: string
  describedBy?: string
  invalid?: boolean
  disabled?: boolean
}>()

const code = defineModel<string>({ required: true })

const id = useId()
const input = useTemplateRef<HTMLInputElement>('input')
const slots = useTemplateRef<HTMLElement>('slots')
const { width } = useElementSize(slots)

const focused = ref(false)
const composing = ref(false)
const draft = ref('')

const selection = ref({
  start: 0,
  end: 0,
})

const value = computed(() => (composing.value ? draft.value : code.value))
const digits = computed(() => emailCodeDigits(value.value).slice(0, EMAIL_CODE_MAX_LENGTH))
const cellCount = computed(() => Math.max(EMAIL_CODE_MIN_LENGTH, digits.value.length))
const cellWidth = computed(() => (width.value - CELL_GAP * (cellCount.value - 1)) / cellCount.value)

function readSelection() {
  selection.value = {
    start: input.value?.selectionStart ?? 0,
    end: input.value?.selectionEnd ?? 0,
  }
}

function focus(selectAll = false) {
  input.value?.focus()

  if (selectAll) {
    input.value?.select()
  }

  readSelection()
}

function isActive(index: number) {
  if (!focused.value) {
    return false
  }

  const { start, end } = selection.value
  return start === end ? index === Math.min(start, cellCount.value - 1) : index >= start && index < end
}

function onFocus() {
  focused.value = true
  readSelection()
}

function onPointerDown(event: PointerEvent) {
  pointerStart = {
    x: event.clientX,
    y: event.clientY,
    time: event.timeStamp,
  }
}

function onClick(event: MouseEvent) {
  const start = pointerStart
  pointerStart = null

  // A short tap replaces one digit. Preserve native drag, shift-click and long-press selection.
  if (
    !start ||
    event.detail !== 1 ||
    event.shiftKey ||
    event.timeStamp - start.time > 400 ||
    Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6 ||
    props.disabled
  ) {
    readSelection()

    return
  }

  const left = slots.value!.getBoundingClientRect().left

  const index = Math.min(
    digits.value.length,
    Math.max(0, Math.floor((event.clientX - left) / (cellWidth.value + CELL_GAP))),
  )

  input.value?.setSelectionRange(index, Math.min(index + 1, digits.value.length))
  readSelection()
}

function onBeforeInput(event: InputEvent) {
  readSelection()
  replacementPending = false

  if (composing.value || event.isComposing || event.inputType !== 'insertText' || !event.data) {
    return
  }

  const inserted = emailCodeDigits(event.data)
  const { start, end } = selection.value

  if (!inserted || code.value.length - (end - start) + inserted.length > EMAIL_CODE_MAX_LENGTH) {
    event.preventDefault()

    return
  }

  replacementPending = inserted.length === 1 && end - start === 1
}

function onInput(event: Event) {
  const field = input.value!

  if (composing.value || (event as InputEvent).isComposing) {
    draft.value = field.value

    return
  }

  const previous = code.value
  const replaceNext = replacementPending
  replacementPending = false
  const next = emailCodeDigits(field.value).slice(0, EMAIL_CODE_MAX_LENGTH)
  const start = emailCodeDigits(field.value.slice(0, field.selectionStart ?? 0)).length
  const end = emailCodeDigits(field.value.slice(0, field.selectionEnd ?? 0)).length

  if (field.value !== next) {
    field.value = next
    field.setSelectionRange(Math.min(start, next.length), Math.min(end, next.length))
  }

  // Continue replacing digits after a tap, without inserting extra digits into the middle of a code.
  if (
    (event as InputEvent).inputType === 'insertText' &&
    replaceNext &&
    next.length === previous.length &&
    start < next.length
  ) {
    field.setSelectionRange(start, start + 1)
  }

  code.value = next
  readSelection()
}

function onPaste(event: ClipboardEvent) {
  readSelection()
  replacementPending = false

  if (!event.clipboardData) {
    return
  }

  const pasted = emailCodeDigits(event.clipboardData.getData('text'))
  const { start, end } = selection.value
  const partialLength = code.value.length - (end - start) + pasted.length

  if (
    !pasted ||
    pasted.length > EMAIL_CODE_MAX_LENGTH ||
    (pasted.length < EMAIL_CODE_MIN_LENGTH && partialLength > EMAIL_CODE_MAX_LENGTH)
  ) {
    event.preventDefault()

    return
  }

  // Let the browser perform the paste so regular clipboard operations retain their undo history.
  if (pasted.length >= EMAIL_CODE_MIN_LENGTH) {
    input.value?.select()
  }

  readSelection()
}

function onCompositionStart() {
  draft.value = input.value!.value
  composing.value = true
}

function onCompositionEnd(event: CompositionEvent) {
  composing.value = false
  onInput(event)
}

defineExpose({ focus })
</script>

<template>
  <label class="code-field" :for="id">
    <span class="code-label">{{ label }}</span>

    <div
      ref="slots"
      class="code-slots"
      :class="{ invalid, disabled }"
      :style="{ '--cell-count': cellCount, '--cell-width': `${Math.max(0, cellWidth)}px` }"
    >
      <div class="code-cells" aria-hidden="true">
        <span
          v-for="(_, index) in cellCount"
          :key="index"
          class="code-cell"
          :class="{
            filled: !!digits[index],
            active: isActive(index),
            selected: focused && index >= selection.start && index < selection.end,
          }"
        >
          {{ digits[index] }}
          <span v-if="!digits[index] && isActive(index)" class="code-caret" />
        </span>
      </div>

      <!-- One real text field preserves OTP autofill, a single tab stop and native selection/editing. -->
      <input
        :id="id"
        ref="input"
        :value="value"
        :readonly="disabled"
        :aria-disabled="disabled || undefined"
        :aria-invalid="invalid || undefined"
        :aria-describedby="describedBy"
        type="text"
        name="one-time-code"
        autocomplete="one-time-code"
        inputmode="numeric"
        enterkeyhint="done"
        pattern="[0-9]{6,10}"
        required
        spellcheck="false"
        autocapitalize="off"
        class="code-input"
        @focus="onFocus"
        @blur="focused = false"
        @pointerdown="onPointerDown"
        @click="onClick"
        @select="readSelection"
        @keyup="readSelection"
        @beforeinput="onBeforeInput"
        @input="onInput"
        @paste="onPaste"
        @compositionstart="onCompositionStart"
        @compositionend="onCompositionEnd"
      />
    </div>
  </label>
</template>

<style scoped>
.code-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.code-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--chalk-dim);
}

.code-slots {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius);
  font:
    600 clamp(16px, calc(var(--cell-width) * 0.6), 28px) / 1.2 Consolas,
    'Courier New',
    monospace;
}

.code-cells {
  display: grid;
  grid-template-columns: repeat(var(--cell-count), minmax(0, 1fr));
  gap: 8px;
  pointer-events: none;
}

.code-cell {
  display: grid;
  place-items: center;
  height: 56px;
  min-width: 0;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  background: #0f1614;
  color: var(--chalk);
}

.code-cell.filled {
  border-color: var(--chalk-faint);
}

.code-cell.active {
  border-color: var(--gold);
  box-shadow: inset 0 0 0 1px var(--gold);
}

.code-cell.selected {
  background: var(--gold-soft);
  color: var(--gold);
}

.invalid .code-cell {
  border-color: var(--theirs);
}

.disabled {
  opacity: 0.6;
}

.code-caret {
  height: 1em;
  width: 2px;
  background: var(--gold);
}

.code-input {
  position: absolute;
  inset: 0;
  width: calc(100% + 8px + (var(--cell-width) - 1ch) / 2);
  height: 100%;
  margin: 0;
  padding: 0 0 0 calc((var(--cell-width) - 1ch) / 2);
  border: 0;
  border-radius: var(--radius);
  outline: none;
  background: transparent;
  color: transparent;
  caret-color: transparent;
  font: inherit;
  letter-spacing: calc(var(--cell-width) + 8px - 1ch);
}

.code-input::selection {
  background: transparent;
}
</style>
