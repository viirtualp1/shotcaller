import {
  Amphora,
  Castle,
  Crosshair,
  Crown,
  Droplets,
  Flag,
  Flame,
  Footprints,
  Gem,
  Ghost,
  HandMetal,
  Heart,
  HeartHandshake,
  HeartPulse,
  Link2,
  Orbit,
  PawPrint,
  Repeat2,
  ScrollText,
  Shield,
  ShieldAlert,
  Skull,
  Sparkles,
  Sword,
  Swords,
  VenetianMask,
  WandSparkles,
  Zap,
} from '@lucide/vue'
import type { Component } from 'vue'
import type { FactionId, RoleId, ShopItemId } from '@/content/ids'

/** An upgraded item keeps the icon of the item it was made from. */
export const ITEM_ICONS: Readonly<Record<ShopItemId, Component>> = {
  broadsword: Sword,
  gloves: HandMetal,
  chainmail: Shield,
  vitality: Heart,
  boots: Footprints,
  staff: WandSparkles,
  chalice: HeartPulse,
  manaStone: Gem,
  vampireFang: Droplets,
  thornMail: ShieldAlert,
  aegis: Crown,
  soulJar: Amphora,
  soulbond: Link2,
  echoShard: Repeat2,
  townPortal: ScrollText,
  cursedBlade: Skull,
}

export const ROLE_ICONS: Readonly<Record<RoleId, Component>> = {
  carry: Swords,
  support: HeartHandshake,
  mage: Sparkles,
  initiator: Zap,
  pusher: Castle,
  ganker: Crosshair,
}

export const FACTION_ICONS: Readonly<Record<FactionId, Component>> = {
  legion: Flag,
  wildkin: PawPrint,
  arcanum: Orbit,
  grave: Ghost,
  hearth: Flame,
}

/** Shown for an adaptive hero wherever no lane has given it a role yet. */
export const ADAPTIVE_ICON: Component = VenetianMask
