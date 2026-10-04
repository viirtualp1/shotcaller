import { execFileSync } from 'node:child_process'

import { latestNotedVersion, patchDiscordMessage, postDiscordWebhook } from '@/ui/patchNotes/discord'
import { LATEST_PATCH } from '@/ui/patchNotes/notes'

/** The notes file on main before this push. An all-zero SHA is GitHub's "no previous commit". */
function previousVersion() {
  const before = process.env.DISCORD_PATCH_BEFORE?.trim()

  if (!before || /^0+$/.test(before)) {
    return null
  }

  try {
    const source = execFileSync('git', ['show', `${before}:src/ui/patchNotes/notes.ts`], { encoding: 'utf8' })

    return latestNotedVersion(source)
  } catch {
    return null
  }
}

const message = patchDiscordMessage(LATEST_PATCH)
const current = LATEST_PATCH.version

if (process.argv.includes('--print')) {
  console.log(JSON.stringify(message, null, 2))
} else if (!process.env.DISCORD_PATCH_BEFORE && !process.argv.includes('--send')) {
  console.log(`Patch ${current} is ready. Pass --print to preview it, or --send to post it.`)
} else if (previousVersion() === current) {
  console.log(`Patch ${current} was already the latest note. Nothing to post.`)
} else {
  const webhook = process.env.DISCORD_PATCH_WEBHOOK?.trim()

  if (!webhook) {
    console.log(`Patch ${current} is new. Add the DISCORD_PATCH_WEBHOOK secret to post it.`)
  } else {
    await postDiscordWebhook(webhook, message)
    console.log(`Posted patch ${current} to Discord.`)
  }
}
