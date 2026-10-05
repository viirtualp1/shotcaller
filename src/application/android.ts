/** What the Google Play app opens (`android/twa-manifest.json`), and the package it reports as the referrer. */
const START_PARAM = 'source'
const START_VALUE = 'twa'
const ANDROID_REFERRER = 'android-app://online.theshotcaller.game'

const SESSION_KEY = 'shotcaller.androidApp'

/** True when the address or referrer comes from the Google Play app. Exported for tests. */
export function isAndroidLaunch(search: string, referrer: string) {
  return new URLSearchParams(search).get(START_PARAM) === START_VALUE || referrer.startsWith(ANDROID_REFERRER)
}

function detect() {
  if (typeof location === 'undefined') {
    return false
  }

  try {
    if (isAndroidLaunch(location.search, document.referrer)) {
      sessionStorage.setItem(SESSION_KEY, '1')

      return true
    }

    return sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return isAndroidLaunch(location.search, document.referrer)
  }
}

/** Read once at startup: navigating inside the game drops the start parameter, the session keeps the answer. */
export const IN_ANDROID_APP = detect()
