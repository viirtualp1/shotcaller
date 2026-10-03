// @vitest-environment happy-dom
import { createApp, h, nextTick, ref, type App } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import EmailCodeInput from '@/ui/components/common/EmailCodeInput.vue'

vi.mock('@vueuse/core', () => ({ useElementSize: () => ({ width: ref(360) }) }))

const apps: App[] = []

function mount(initial = '') {
  const code = ref(initial)
  const disabled = ref(false)
  const invalid = ref(false)
  const root = document.createElement('div')
  document.body.append(root)
  const exposed = ref<InstanceType<typeof EmailCodeInput>>()

  const app = createApp({
    setup: () => () =>
      h(EmailCodeInput, {
        ref: exposed,
        modelValue: code.value,
        'onUpdate:modelValue': (value: string) => {
          code.value = value
        },
        label: 'Code',
        describedBy: 'instructions error',
        disabled: disabled.value,
        invalid: invalid.value,
      }),
  })

  app.mount(root)
  apps.push(app)
  const input = root.querySelector('input')!
  const cells = () => [...root.querySelectorAll('.code-cell')]

  const selected = () =>
    cells().flatMap((cell, index) => (cell.classList.contains('selected') ? [index] : []))

  async function inputValue(value: string, start = value.length, end = start, inputType = 'insertText') {
    input.value = value
    input.setSelectionRange(start, end)

    input.dispatchEvent(
      new InputEvent('input', {
        inputType,
        bubbles: true,
      }),
    )

    await nextTick()
  }

  function paste(value: string) {
    const clipboardData = new DataTransfer()
    clipboardData.setData('text', value)

    const event = new ClipboardEvent('paste', {
      clipboardData,
      cancelable: true,
      bubbles: true,
    })

    input.dispatchEvent(event)

    return event
  }

  function beforeInput(data: string, isComposing = false) {
    const event = new InputEvent('beforeinput', {
      cancelable: true,
      bubbles: true,
      data,
      inputType: 'insertText',
      isComposing,
    })

    input.dispatchEvent(event)

    return event
  }

  function tap(index: number, options: { shiftKey?: boolean; duration?: number; distance?: number } = {}) {
    const x = index * ((360 + 8) / cells().length) + 8

    const down = new PointerEvent('pointerdown', {
      clientX: x,
      clientY: 0,
      bubbles: true,
    })

    Object.defineProperty(down, 'timeStamp', { value: 1 })
    input.dispatchEvent(down)

    const click = new MouseEvent('click', {
      clientX: x + (options.distance ?? 0),
      clientY: 0,
      detail: 1,
      shiftKey: options.shiftKey ?? false,
      bubbles: true,
    })

    Object.defineProperty(click, 'timeStamp', { value: 1 + (options.duration ?? 20) })
    input.dispatchEvent(click)
  }

  return {
    code,
    disabled,
    invalid,
    root,
    input,
    cells,
    selected,
    inputValue,
    paste,
    beforeInput,
    tap,
    exposed,
  }
}

afterEach(() => {
  for (const app of apps.splice(0)) {
    app.unmount()
  }

  document.body.replaceChildren()
})

describe('segmented email code field', () => {
  it('exposes one labelled text field with native OTP autofill and numeric keyboard hints', () => {
    const { root, input, cells } = mount()
    expect(root.querySelectorAll('input')).toHaveLength(1)
    expect(cells()).toHaveLength(6)
    expect(root.querySelector('label')!.htmlFor).toBe(input.id)
    expect(input.autocomplete).toBe('one-time-code')
    expect(input.inputMode).toBe('numeric')
    expect(input.type).toBe('text')
    expect(input.getAttribute('aria-describedby')).toBe('instructions error')
    expect(input.onkeydown).toBeNull()
  })

  it('normalizes formatted paste without losing the caret or leading zeroes', async () => {
    const { code, input, inputValue } = mount()
    await inputValue(' ０１２-３４５ ', 5)
    expect(code.value).toBe('012345')
    expect(input.value).toBe('012345')
    expect(input.selectionStart).toBe(3)
  })

  it('lets a full code replace the old code from any selected cell', async () => {
    const { input, code, paste, inputValue } = mount('123456')
    input.setSelectionRange(3, 4)
    expect(paste('098-765').defaultPrevented).toBe(false)
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, 6])
    await inputValue('098-765', 7, 7, 'insertFromPaste')
    expect(code.value).toBe('098765')
  })

  it('keeps native partial paste selection and rejects empty or overflowing paste', () => {
    const { input, paste } = mount('0123456789')
    input.setSelectionRange(2, 4)
    expect(paste('98').defaultPrevented).toBe(false)
    expect([input.selectionStart, input.selectionEnd]).toEqual([2, 4])
    expect(paste('abc').defaultPrevented).toBe(true)
    expect(paste('12345678901').defaultPrevented).toBe(true)
    input.setSelectionRange(10, 10)
    expect(paste('1').defaultPrevented).toBe(true)
    expect(input.value).toBe('0123456789')
  })

  it('replaces a tapped digit and selects the next digit for continued corrections', async () => {
    const { code, input, tap, beforeInput, inputValue, selected } = mount('012345')
    input.focus()
    tap(2)
    expect([input.selectionStart, input.selectionEnd]).toEqual([2, 3])
    expect(beforeInput('9').defaultPrevented).toBe(false)
    await inputValue('019345', 3)
    expect(code.value).toBe('019345')
    expect([input.selectionStart, input.selectionEnd]).toEqual([3, 4])
    expect(selected()).toEqual([3])
  })

  it('positions a tap on an empty cell at the end and preserves drag and extended selections', () => {
    const { input, tap } = mount('012')
    tap(5)
    expect([input.selectionStart, input.selectionEnd]).toEqual([3, 3])

    for (const options of [{ shiftKey: true }, { distance: 20 }, { duration: 600 }]) {
      input.setSelectionRange(0, 3)
      tap(1, options)
      expect([input.selectionStart, input.selectionEnd]).toEqual([0, 3])
    }
  })

  it('blocks non-digits and extra typing while allowing replacement at the length limit', () => {
    const { input, beforeInput } = mount('0123456789')
    input.setSelectionRange(10, 10)
    expect(beforeInput('a').defaultPrevented).toBe(true)
    expect(beforeInput('1').defaultPrevented).toBe(true)
    input.setSelectionRange(4, 5)
    expect(beforeInput('１').defaultPrevented).toBe(false)
  })

  it('handles entire autofill values, longer codes, deletion and an external reset', async () => {
    const { code, cells, input, inputValue } = mount()
    await inputValue('01234567', 8, 8, 'insertReplacementText')
    expect(code.value).toBe('01234567')
    expect(cells()).toHaveLength(8)
    await inputValue('0123456789', 10, 10, 'insertReplacementText')
    expect(cells()).toHaveLength(10)
    await inputValue('012345678', 9, 9, 'deleteContentBackward')
    expect(code.value).toBe('012345678')
    await inputValue('', 0, 0, 'deleteContentForward')
    expect(cells()).toHaveLength(6)
    code.value = '987654'
    await nextTick()
    expect(input.value).toBe('987654')
    code.value = ''
    await nextTick()
    expect(input.value).toBe('')
  })

  it('waits for composition to finish before normalizing and publishing a code', async () => {
    const { code, input, beforeInput, inputValue } = mount('012')
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    expect(beforeInput('３', true).defaultPrevented).toBe(false)
    await inputValue('012３')
    expect(code.value).toBe('012')
    expect(input.value).toBe('012３')
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
    await nextTick()
    expect(code.value).toBe('0123')
    expect(input.value).toBe('0123')
  })

  it('preserves focus while busy and exposes error state with select-all recovery', async () => {
    const { input, invalid, disabled, exposed, selected } = mount('012345')
    exposed.value!.focus(true)
    await nextTick()
    expect(selected()).toEqual([0, 1, 2, 3, 4, 5])
    disabled.value = true
    invalid.value = true
    await nextTick()
    expect(input.readOnly).toBe(true)
    expect(input.getAttribute('aria-disabled')).toBe('true')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(input)
  })
})
