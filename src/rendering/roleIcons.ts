import { Castle, Crosshair, HeartHandshake, Sparkles, Swords, Zap } from 'lucide-static'
import { Assets, type Texture } from 'pixi.js'
import { ROLE_IDS, type RoleId } from '@/content/ids'

export type RoleIcons = Readonly<Record<RoleId, Texture>>

/** Same symbols as the HUD role badges (`ui/icons.ts`), so a token and its tooltip look alike. */
const ROLE_SVG: Readonly<Record<RoleId, string>> = {
  carry: Swords,
  support: HeartHandshake,
  mage: Sparkles,
  initiator: Zap,
  pusher: Castle,
  ganker: Crosshair,
}

/** Drawn white at four times the icon size; tokens tint and scale them. */
const RESOLUTION = 4

const dataUrl = (svg: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/currentColor/g, '#ffffff'))}`

let loading: Promise<RoleIcons> | null = null

export function loadRoleIcons() {
  loading ??= Promise.all(
    ROLE_IDS.map(async (role) => {
      const texture = await Assets.load<Texture>({
        alias: `role-icon-${role}`,
        src: dataUrl(ROLE_SVG[role]),
        data: { resolution: RESOLUTION },
      })

      return [role, texture] as const
    }),
  ).then((entries) => Object.fromEntries(entries) as Record<RoleId, Texture>)

  return loading
}
