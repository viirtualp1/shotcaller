/** What went wrong with signing in or linking an email, in terms the player can act on. */
export type AccountProblem =
  /** Signing in with an email no coach uses yet. */
  | 'noAccount'
  /** Linking an email that already belongs to another coach. */
  | 'emailTaken'
  | 'badCode'
  | 'tooMany'
  | 'invalidEmail'
  /** Supabase's built-in mailer only writes to the project's team until custom SMTP is set up. */
  | 'notAuthorized'
  /** The sign-in method is switched off in the Supabase project. */
  | 'disabled'
  | 'offline'
  | 'unknown'

const BY_CODE: Readonly<Record<string, AccountProblem>> = {
  otp_disabled: 'noAccount',
  signup_disabled: 'noAccount',
  user_not_found: 'noAccount',
  email_exists: 'emailTaken',
  user_already_exists: 'emailTaken',
  identity_already_exists: 'emailTaken',
  otp_expired: 'badCode',
  over_email_send_rate_limit: 'tooMany',
  over_request_rate_limit: 'tooMany',
  email_address_invalid: 'invalidEmail',
  validation_failed: 'invalidEmail',
  email_address_not_authorized: 'notAuthorized',
  email_provider_disabled: 'disabled',
  anonymous_provider_disabled: 'disabled',
  manual_linking_disabled: 'disabled',
  provider_disabled: 'disabled',
}

/** Supabase errors carry a `code`; older servers only a message, so the common ones are matched by text too. */
const BY_MESSAGE: readonly [RegExp, AccountProblem][] = [
  [/signups not allowed/i, 'noAccount'],
  [/already (been )?registered|already exists/i, 'emailTaken'],
  [/expired or is invalid/i, 'badCode'],
  [/rate limit/i, 'tooMany'],
]

export function accountProblem(error: unknown): AccountProblem {
  if (typeof error !== 'object' || error === null) {
    return 'unknown'
  }

  const { code, status, name, message } = error as {
    code?: unknown
    status?: unknown
    name?: unknown
    message?: unknown
  }

  if (typeof code === 'string' && BY_CODE[code]) {
    return BY_CODE[code]
  }

  if (name === 'AuthRetryableFetchError' || status === 0) {
    return 'offline'
  }

  if (status === 429) {
    return 'tooMany'
  }

  const text = typeof message === 'string' ? message : ''
  return BY_MESSAGE.find(([pattern]) => pattern.test(text))?.[1] ?? 'unknown'
}
