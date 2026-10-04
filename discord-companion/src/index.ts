import { loadConfig } from './config.ts'
import { createDiscordConnection } from './discord.ts'
import { PRESENCE_HOST, PRESENCE_PORT } from './protocol.ts'
import { startPresenceServer } from './server.ts'
import { installStartup, uninstallStartup } from './autostart.ts'

function inUse(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'EADDRINUSE'
}

async function main() {
  if (process.argv.includes('--install-startup')) {
    console.log(`Discord companion will start at login: ${installStartup()}`)

    return
  }

  if (process.argv.includes('--uninstall-startup')) {
    console.log(`Removed the login item: ${uninstallStartup()}`)

    return
  }

  const config = loadConfig()
  const discord = createDiscordConnection(config.clientId, config)
  discord.start()

  let server: Awaited<ReturnType<typeof startPresenceServer>>

  try {
    server = await startPresenceServer(discord, { port: PRESENCE_PORT, host: PRESENCE_HOST })
  } catch (error) {
    if (inUse(error)) {
      console.log('Discord companion is already running.')

      return
    }

    throw error
  }

  console.log(`Discord companion listening on ws://${PRESENCE_HOST}:${server.port}`)

  let closing = false

  const shutdown = async () => {
    if (closing) {
      return
    }

    closing = true
    await discord.stop()
    await server.close()
    process.exit(0)
  }

  process.on('SIGINT', () => {
    void shutdown()
  })
  process.on('SIGTERM', () => {
    void shutdown()
  })
  process.on('unhandledRejection', (error) => {
    console.error('Discord companion: unexpected error', error)
  })
}

void main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
