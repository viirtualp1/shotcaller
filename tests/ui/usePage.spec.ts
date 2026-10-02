import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePage } from '@/ui/composables/usePage'

vi.mock('@vueuse/core', () => ({ useEventListener: vi.fn() }))

const location = { pathname: '/', hash: '' }

const history = {
  pushState: vi.fn((_state: unknown, _title: string, url: string) => go(url)),
  replaceState: vi.fn((_state: unknown, _title: string, url: string) => go(url)),
}

function go(url: string) {
  const [path, hash = ''] = url.split('#')
  location.pathname = path!
  location.hash = hash ? `#${hash}` : ''
}

const profilePage = () =>
  usePage(
    (path) => (/^\/profile\/?$/.test(path) ? 'profile' : null),
    () => '/profile/',
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
    expect(history.pushState).toHaveBeenLastCalledWith(null, '', '/profile/')
    expect(location.hash).toBe('')

    page.state.value = 'profile'
    page.close()
    expect(history.pushState).toHaveBeenLastCalledWith(null, '', '/')
    expect(page.state.value).toBeNull()
  })

  it('reads the page from the path, with or without the trailing slash', () => {
    go('/profile')

    expect(profilePage().state.value).toBe('profile')
  })

  it('moves a link saved with a hash to the same page at its path', () => {
    go('/#/profile')

    const page = profilePage()

    expect(page.state.value).toBe('profile')
    expect(history.replaceState).toHaveBeenCalledWith(null, '', '/profile')
    expect(location.hash).toBe('')
  })
})
