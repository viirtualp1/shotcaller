/*
 * Taps on the game's own notifications. Phones only let a page show them through this worker, and without a
 * handler here a tap did nothing. The game is brought forward, or opened when it is closed, and told what the
 * tap was about: the page opens that chat, the friends list, or just itself for a duel invite.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = event.notification.data ?? { kind: 'game' }

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      const open = windows.find((client) => new URL(client.url).origin === self.location.origin)
      const client = open ?? (await self.clients.openWindow('/'))
      if (!client) {
        return
      }

      if (open) {
        await client.focus().catch(() => undefined)
      }

      /* A freshly opened page queues this until its script listens for it. */
      client.postMessage({
        type: 'notification-click',
        target,
      })
    })(),
  )
})
