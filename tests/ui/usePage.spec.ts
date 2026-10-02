import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePage } from '@/ui/composables/usePage'

vi.mock('@vueuse/core', () => ({
  useEventListener: vi.fn(),
}))

const location = {
  pathname: '/',
  search: '',
  hash: '',
}

const history = {
  pushState: vi.fn((_state: unknown, _title: string, url: string) => go(url)),
  replaceState: vi.fn((_state: unknown, _title: string, url: string) => go(url)),
}

function go(url: string) {
  const { pathname, search, hash } = new URL(url, 'https://theshotcaller.online')
  location.pathname = pathname
  location.search = search
  location.hash = hash
}

const profilePage = () =>
  usePage(
    (path) => (/^\/profile\/?$/.test(path) ? 'profile' : null),
    () => '/profile',
  )

describe('app pages addressed by path', () => {
  beforeEach(() => {
    go('/')
    vi.stubGlobal('location', location)
    vi.stubGlobal('history', history)
    vi.stubGlobal('dispatchEvent', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('opens and closes a page with plain paths', () => {
    const page = profilePage()
    expect(page.state.value).toBeNull()

    page.open('profile')
    expect(history.pushState).toHaveBeenLastCalledWith(null, '', '/profile')
    expect(location.hash).toBe('')

    page.state.value = 'profile'
    page.close()
    expect(history.pushState).toHaveBeenLastCalledWith(null, '', '/')
    expect(page.state.value).toBeNull()
  })

  it('drops a trailing slash and keeps the query, such as a sign-in code', () => {
    go('/profile/?code=abc')

    expect(profilePage().state.value).toBe('profile')
    expect(history.replaceState).toHaveBeenLastCalledWith(null, '', '/profile?code=abc')
  })

  it('leaves the address of another page alone', () => {
    go('/patches/8.7')

    expect(profilePage().state.value).toBeNull()
    expect(history.replaceState).not.toHaveBeenCalled()
  })

  it('moves a link saved with a hash to the same page at its path', () => {
    go('/#/profile')

    const page = profilePage()

    expect(page.state.value).toBe('profile')
    expect(history.replaceState).toHaveBeenCalledWith(null, '', '/profile')
    expect(location.hash).toBe('')
  })
})
