/** Local, read-only analytics. Never import this script into the application. */
const key = process.env.POSTHOG_QUERY_API_KEY
const projectId = process.env.POSTHOG_PROJECT_ID
const host = process.env.POSTHOG_QUERY_HOST ?? 'https://us.posthog.com'
const query = process.argv[2]?.trim()

if (!key || !projectId || !/^\d+$/.test(projectId)) {
  throw new Error('Set POSTHOG_QUERY_API_KEY and the numeric POSTHOG_PROJECT_ID in .env.posthog.local')
}

if (!query) {
  throw new Error('Pass a HogQL query as the first argument')
}

const endpoint = new URL(`/api/projects/${projectId}/query/`, host)
if (endpoint.protocol !== 'https:') {
  throw new Error('PostHog queries require HTTPS')
}

const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: {
      kind: 'HogQLQuery',
      query,
    },
  }),
  signal: AbortSignal.timeout(30_000),
})

if (!response.ok) {
  const error: unknown = await response.json().catch(() => null)
  const detail = typeof error === 'object' && error !== null && 'detail' in error ? String(error.detail) : ''
  const safeDetail = detail.replaceAll(key, '[redacted]')

  throw new Error(`PostHog query failed with HTTP ${response.status}${safeDetail ? `: ${safeDetail}` : ''}`)
}

const result: unknown = await response.json()
const rows = typeof result === 'object' && result !== null && 'results' in result ? result.results : result
const columns = typeof result === 'object' && result !== null && 'columns' in result ? result.columns : null
console.log(
  JSON.stringify(
    {
      columns,
      results: rows,
    },
    null,
    2,
  ),
)

export {}
