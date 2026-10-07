const VERSION = /^\d+\.\d+\.\d+$/

/** A failed/offline check is unknown, never evidence that the client is current. */
export async function fetchReleaseVersion(signal?: AbortSignal): Promise<string | null> {
  try {
    const response = await fetch('/release.json', {
      cache: 'no-store',
      signal,
    })

    if (!response.ok) {
      return null
    }

    const release: unknown = await response.json()
    if (
      typeof release !== 'object' ||
      release === null ||
      !('version' in release) ||
      typeof release.version !== 'string' ||
      !VERSION.test(release.version)
    ) {
      return null
    }

    return release.version
  } catch {
    return null
  }
}
