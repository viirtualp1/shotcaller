/* A live page acknowledges the tap; a cold or suspended page receives it in its launch URL. */
const TAP_ACK_WAIT_MS = 1000

function launchUrl(target) {
  const url = new URL(self.registration.scope)
  url.searchParams.set('notification', target.kind)

  if (target.kind === 'chat') {
    url.searchParams.set('notificationFriend', target.friendId)
  }

  return url.href
}

function deliver(client, target) {
  return new Promise((resolve) => {
    const channel = new MessageChannel()
    const finish = (received) => {
      clearTimeout(timer)
      channel.port1.close()
      channel.port2.close()
      resolve(received)
    }

    const timer = setTimeout(() => finish(false), TAP_ACK_WAIT_MS)
    channel.port1.onmessage = (event) => finish(event.data === 'notification-click-received')

    try {
      client.postMessage(
        {
          type: 'notification-click',
          target,
        },
        [channel.port2],
      )
    } catch {
      finish(false)
    }
  })
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data

  const target =
    data?.kind === 'friends' ||
    data?.kind === 'game' ||
    (data?.kind === 'chat' && typeof data.friendId === 'string' && data.friendId.length > 0)
      ? data
      : { kind: 'game' }

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      const scope = new URL(self.registration.scope)

      const open = windows.find((client) => {
        const url = new URL(client.url)

        return url.origin === scope.origin && url.pathname.startsWith(scope.pathname)
      })

      if (open) {
        try {
          await open.focus()

          if (await deliver(open, target)) {
            return
          }
        } catch {
          /* A suspended mobile window can reject focus; navigation can still wake it. */
        }

        try {
          const navigated = await open.navigate(launchUrl(target))

          if (navigated) {
            await navigated.focus()

            return
          }
        } catch {
          /* The client may have disappeared or stayed suspended. Open the app through its launch URL. */
        }
      }

      const client = await self.clients.openWindow(launchUrl(target))

      if (client) {
        await client.focus().catch(() => undefined)
      }
    })(),
  )
})
