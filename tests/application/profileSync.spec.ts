import { describe, expect, it } from 'vitest'
import type { CloudProfile, CloudStore } from '@/application/cloud/CloudStore'
import { ConflictLoopError, ProfileSync } from '@/application/cloud/ProfileSync'
import { createProfile, type MatchRecord, type Profile } from '@/domain/profile/Profile'
import { finishedMatch, LOSS, play, WIN } from '../helpers/profile'

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  }
}

/** One account's rows, shared by every device in a test. */
class MemoryCloud implements CloudStore {
  row: CloudProfile | null = null
  readonly matches = new Map<string, MatchRecord>()
  /** Runs once right before the next save, to let another device get in first. */
  beforeSave: (() => unknown) | null = null

  async load() {
    return this.row
  }

  async create(profile: Profile) {
    if (this.row) {
      return 'conflict' as const
    }

    this.row = {
      profile,
      revision: 1,
    }

    return this.row
  }

  async save(profile: Profile, baseRevision: number) {
    const hook = this.beforeSave
    this.beforeSave = null
    await hook?.()

    if (this.row?.revision !== baseRevision) {
      return 'conflict' as const
    }

    this.row = {
      profile,
      revision: baseRevision + 1,
    }

    return this.row
  }

  async addMatches(records: readonly MatchRecord[]) {
    for (const record of records) {
      if (!this.matches.has(record.id)) {
        this.matches.set(record.id, record)
      }
    }
  }
}

class Device {
  readonly storage = memoryStorage()
  readonly sync = new ProfileSync(this.storage, 'sync')
  profile = createProfile('2026-09-27T10:00:00.000Z')

  play(won = true) {
    const { profile, record } = play(this.profile, finishedMatch(won ? WIN : LOSS))
    this.profile = profile
    this.sync.noteMatch(record)
  }

  rename(name: string) {
    this.profile = {
      ...this.profile,
      name,
    }

    this.sync.noteIdentity({
      name,
      avatar: this.profile.avatar,
    })
  }

  async push(cloud: CloudStore, userId = 'coach') {
    const outcome = await this.sync.sync(cloud, userId, () => this.profile)
    if (outcome.kind === 'synced') {
      this.profile = outcome.profile
    }

    return outcome
  }
}

describe('ProfileSync', () => {
  it('uploads the first profile with its matches and empties the queue', async () => {
    const cloud = new MemoryCloud()
    const phone = new Device()
    phone.play()
    phone.play(false)

    const outcome = await phone.push(cloud)
    expect(outcome.kind).toBe('synced')
    expect(cloud.row?.revision).toBe(1)
    expect(cloud.row?.profile.totals.matches).toBe(2)
    expect(cloud.matches.size).toBe(2)

    expect(phone.sync.state).toMatchObject({
      userId: 'coach',
      pending: [],
    })

    expect(phone.sync.hasWork).toBe(false)
  })

  it('lets a fresh device pick up the account’s progress', async () => {
    const cloud = new MemoryCloud()
    const phone = new Device()
    phone.play()
    await phone.push(cloud)

    const laptop = new Device()
    const outcome = await laptop.push(cloud)
    expect(outcome.kind).toBe('synced')
    expect(laptop.profile).toEqual(phone.profile)
  })

  it('adds up matches two devices played offline instead of dropping one side', async () => {
    const cloud = new MemoryCloud()
    const phone = new Device()
    await phone.push(cloud)
    const laptop = new Device()
    await laptop.push(cloud)

    phone.play()
    phone.play()
    laptop.play(false)

    await phone.push(cloud)
    await laptop.push(cloud)
    await phone.push(cloud)

    expect(cloud.row?.profile.totals).toMatchObject({
      matches: 3,
      wins: 2,
      losses: 1,
    })

    expect(cloud.row?.profile.rating).toBe(40)
    expect(phone.profile).toEqual(cloud.row?.profile)
    expect(laptop.profile.totals.matches).toBe(3)
    expect(cloud.matches.size).toBe(3)
  })

  it('replays on top of a save that slipped in between', async () => {
    const cloud = new MemoryCloud()
    const phone = new Device()
    const laptop = new Device()
    await phone.push(cloud)
    await laptop.push(cloud)

    laptop.play()
    phone.play()
    cloud.beforeSave = () => laptop.push(cloud)

    const outcome = await phone.push(cloud)
    expect(outcome.kind).toBe('synced')
    expect(cloud.row?.revision).toBe(3)
    expect(cloud.row?.profile.totals.matches).toBe(2)
  })

  it('keeps a match finished during the save queued and visible', async () => {
    const cloud = new MemoryCloud()
    const phone = new Device()
    phone.play()
    await phone.push(cloud)

    phone.play()
    cloud.beforeSave = () => phone.play(false)
    await phone.push(cloud)

    expect(cloud.row?.profile.totals.matches).toBe(2)
    expect(phone.profile.totals.matches).toBe(3)
    expect(phone.sync.state.pending).toHaveLength(1)

    await phone.push(cloud)
    expect(cloud.row?.profile.totals.matches).toBe(3)
    expect(phone.sync.hasWork).toBe(false)
  })

  it('asks before mixing this device’s progress with another account', async () => {
    const cloud = new MemoryCloud()
    const phone = new Device()
    phone.play()
    await phone.push(cloud, 'coach')

    const guest = new Device()
    guest.play(false)
    guest.play(false)

    const outcome = await guest.push(cloud, 'coach')
    expect(outcome.kind).toBe('conflict')
    expect(cloud.row?.profile.totals.matches).toBe(1)

    const kept = await guest.sync.resolve(cloud, 'coach', 'device', () => guest.profile)
    expect(kept.totals.losses).toBe(2)
    expect(cloud.row?.profile.totals.losses).toBe(2)

    const back = await phone.sync.resolve(cloud, 'coach', 'cloud', () => phone.profile)
    expect(back.totals.losses).toBe(2)
  })

  it('carries a new name over to the account', async () => {
    const cloud = new MemoryCloud()
    const phone = new Device()
    const laptop = new Device()
    phone.play()
    await phone.push(cloud)
    await laptop.push(cloud)

    laptop.rename('Nikita')
    await laptop.push(cloud)
    await phone.push(cloud)

    expect(phone.profile.name).toBe('Nikita')
    expect(laptop.sync.state.identity).toBeNull()
  })

  it('gives up when the cloud keeps changing', async () => {
    const cloud = new MemoryCloud()
    const phone = new Device()
    await phone.push(cloud)
    phone.play()

    const bump = () => {
      cloud.row = {
        ...cloud.row!,
        revision: cloud.row!.revision + 1,
      }

      cloud.beforeSave = bump
    }

    cloud.beforeSave = bump
    await expect(phone.push(cloud)).rejects.toBeInstanceOf(ConflictLoopError)
    expect(phone.sync.state.pending).toHaveLength(1)
  })

  it('starts over when its saved state is unreadable', () => {
    const storage = memoryStorage()
    storage.setItem('sync', '{"userId": 7}')

    expect(new ProfileSync(storage, 'sync').state).toMatchObject({
      userId: null,
      pending: [],
    })
  })
})
