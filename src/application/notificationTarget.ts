/** Travels with a notification and survives a cold PWA launch in the URL. */
export type NotificationTarget =
  | { readonly kind: 'chat'; readonly friendId: string }
  | { readonly kind: 'friends' }
  | { readonly kind: 'game' }

export function isNotificationTarget(value: unknown): value is NotificationTarget {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    (value.kind === 'friends' ||
      value.kind === 'game' ||
      (value.kind === 'chat' &&
        'friendId' in value &&
        typeof value.friendId === 'string' &&
        value.friendId.length > 0))
  )
}

/** Consume only notification parameters, preserving sign-in parameters and unrelated URL state. */
export function consumeNotificationTarget(url: URL): NotificationTarget | null {
  const kind = url.searchParams.get('notification')

  if (kind === null) {
    return null
  }

  const target =
    kind === 'chat'
      ? {
          kind,
          friendId: url.searchParams.get('notificationFriend'),
        }
      : { kind }

  url.searchParams.delete('notification')
  url.searchParams.delete('notificationFriend')

  return isNotificationTarget(target) ? target : null
}
