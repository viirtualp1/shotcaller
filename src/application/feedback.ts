import { z } from 'zod'

export const FEEDBACK_KINDS = ['bug', 'balance', 'idea', 'other'] as const

export const FEEDBACK_LIMITS = {
  subjectMin: 2,
  messageMin: 10,
  subject: 120,
  message: 4000,
  email: 254,
} as const

export const feedbackSchema = z.object({
  id: z.uuid(),
  kind: z.enum(FEEDBACK_KINDS),
  subject: z.string().trim().min(FEEDBACK_LIMITS.subjectMin).max(FEEDBACK_LIMITS.subject),
  message: z.string().trim().min(FEEDBACK_LIMITS.messageMin).max(FEEDBACK_LIMITS.message),
  email: z.union([z.literal(''), z.email().max(FEEDBACK_LIMITS.email)]),
  locale: z.enum(['en', 'ru']),
  version: z.string().min(1).max(20),
})

export type Feedback = z.infer<typeof feedbackSchema>

export type FeedbackFailure = 'failed' | 'rateLimit'

export function feedbackFailure(error: unknown): FeedbackFailure {
  return typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    error.message === 'feedback_rate_limit'
    ? 'rateLimit'
    : 'failed'
}
