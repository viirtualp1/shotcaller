import { accountProblem } from './accountProblem'
import type { AccountMode, CloudAccount } from './CloudStore'

export interface EmailAuth {
  ensureAccount(): Promise<CloudAccount>
  sendEmail(email: string, mode: AccountMode): Promise<void>
}

/**
 * One "sign in by email" for the player, whether or not the address is known. A known address gets
 * a sign-in code. An unknown one is linked to this device's account (a guest one is made if needed),
 * so signing up keeps the progress already here. Returns which of the two codes was sent.
 */
export async function sendEmailCode(auth: EmailAuth, email: string): Promise<AccountMode> {
  try {
    await auth.sendEmail(email, 'signIn')

    return 'signIn'
  } catch (error) {
    if (accountProblem(error) !== 'noAccount') {
      throw error
    }
  }

  await auth.ensureAccount()
  await auth.sendEmail(email, 'link')

  return 'link'
}
