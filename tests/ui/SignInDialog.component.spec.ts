// @vitest-environment happy-dom
import { createApp, nextTick, reactive, type App } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SignInDialog from '@/ui/components/dialogs/SignInDialog.vue'
import { i18n } from '@/ui/i18n'

const cloud = reactive({
  signInOpen: true,
  google: false,
  sendCode: vi.fn(),
  verifyCode: vi.fn(),
})

vi.mock('@/ui/stores/cloud', () => ({ useCloudStore: () => cloud }))
vi.mock('@/ui/composables/useModal', () => ({ useModal: () => undefined }))

let app: App

async function settle() {
  for (let i = 0; i < 5; i++) {
    await nextTick()
  }
}

function field() {
  return document.querySelector<HTMLInputElement>('input[autocomplete="one-time-code"]')!
}

function verifyButton() {
  return document.querySelector<HTMLButtonElement>('button[type="submit"]')!
}

async function setCode(value: string) {
  const input = field()
  input.value = value

  input.dispatchEvent(
    new InputEvent('input', {
      inputType: 'insertReplacementText',
      bubbles: true,
    }),
  )

  await settle()
}

async function submit() {
  document.querySelector('form')!.dispatchEvent(
    new Event('submit', {
      cancelable: true,
      bubbles: true,
    }),
  )

  await settle()
}

async function receiveCode() {
  const email = document.querySelector<HTMLInputElement>('input[type="email"]')!
  email.value = 'coach@example.test'
  email.dispatchEvent(new Event('input', { bubbles: true }))
  await submit()
}

beforeEach(async () => {
  vi.useFakeTimers()
  cloud.signInOpen = true
  cloud.sendCode.mockReset().mockResolvedValue('signIn')
  cloud.verifyCode.mockReset().mockResolvedValue(undefined)
  const root = document.createElement('div')
  document.body.append(root)
  app = createApp(SignInDialog).use(i18n)
  app.mount(root)
  await settle()
})

afterEach(() => {
  app.unmount()
  document.body.replaceChildren()
  vi.useRealTimers()
})

describe('sign-in code flow', () => {
  it.each(['en', 'ru'] as const)(
    'focuses a labelled code field after sending a letter in %s',
    async (locale) => {
      i18n.global.locale.value = locale
      await receiveCode()
      const input = field()
      expect(document.activeElement).toBe(input)
      expect(input.labels![0]!.textContent).toContain(i18n.global.t('cloud.email.code'))
      expect(document.querySelectorAll('.code-cell')).toHaveLength(6)
      expect(verifyButton().disabled).toBe(true)
      expect(cloud.sendCode).toHaveBeenCalledWith('coach@example.test')
    },
  )

  it('accepts complete codes without automatic submission and rejects an incomplete submit', async () => {
    await receiveCode()
    await setCode('01234')
    await submit()
    expect(cloud.verifyCode).not.toHaveBeenCalled()

    for (const code of ['012345', '01234567', '0123456789']) {
      await setCode(code)
      expect(verifyButton().disabled).toBe(false)
      expect(cloud.verifyCode).not.toHaveBeenCalled()
    }

    await submit()
    expect(cloud.verifyCode).toHaveBeenCalledExactlyOnceWith('coach@example.test', '0123456789', 'signIn')
  })

  it('selects a rejected code for retry and clears its error as soon as the code changes', async () => {
    cloud.verifyCode.mockRejectedValueOnce(Object.assign(new Error('Invalid code'), { code: 'otp_expired' }))
    await receiveCode()
    await setCode('012345')
    await submit()
    expect(field().value).toBe('012345')
    expect(document.activeElement).toBe(field())
    expect([field().selectionStart, field().selectionEnd]).toEqual([0, 6])
    expect(field().getAttribute('aria-invalid')).toBe('true')
    const alert = document.querySelector('[role="alert"]')!
    expect(field().getAttribute('aria-describedby')).toContain(alert.id)
    await setCode('654321')
    expect(field().getAttribute('aria-invalid')).toBeNull()
    expect(document.querySelector('[role="alert"]')).toBeNull()
  })

  it('locks editing and prevents duplicate requests while verification is pending', async () => {
    let finish!: () => void
    cloud.verifyCode.mockImplementationOnce(() => new Promise<void>((resolve) => (finish = resolve)))
    await receiveCode()
    await setCode('012345')
    await submit()
    expect(field().readOnly).toBe(true)
    expect(verifyButton().disabled).toBe(true)
    await submit()
    expect(cloud.verifyCode).toHaveBeenCalledTimes(1)
    finish()
    await settle()
    expect(field().readOnly).toBe(false)
    expect(document.activeElement).toBe(field())
  })

  it('clears the old code and restores focus after sending a replacement letter', async () => {
    await receiveCode()
    await setCode('012345')
    await vi.advanceTimersByTimeAsync(60_000)

    const resend = [...document.querySelectorAll('button')].find(
      (button) => button.textContent!.trim() === i18n.global.t('cloud.email.resend'),
    )!

    expect(resend.disabled).toBe(false)
    resend.click()
    await settle()
    expect(cloud.sendCode).toHaveBeenCalledTimes(2)
    expect(field().value).toBe('')
    expect(document.activeElement).toBe(field())
    expect(verifyButton().disabled).toBe(true)
  })
})
