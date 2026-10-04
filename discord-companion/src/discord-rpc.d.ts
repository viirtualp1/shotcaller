declare module 'discord-rpc' {
  import { EventEmitter } from 'node:events'

  export class Client extends EventEmitter {
    constructor(options: { transport: 'ipc' | 'websocket' })

    login(options: { clientId: string }): Promise<Client>

    setActivity(args: {
      details?: string
      state?: string
      startTimestamp?: number | Date
      endTimestamp?: number | Date
      largeImageKey?: string
      largeImageText?: string
      smallImageKey?: string
      smallImageText?: string
      instance?: boolean
    }): Promise<unknown>

    clearActivity(): Promise<unknown>

    destroy(): Promise<void>
  }
}
