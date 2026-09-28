import {
  Castle,
  Crosshair,
  Crown,
  Droplets,
  Footprints,
  Gem,
  HandMetal,
  Heart,
  HeartHandshake,
  HeartPulse,
  Shield,
  ShieldAlert,
  Sparkles,
  Sword,
  Swords,
  WandSparkles,
  Zap,
} from 'lucide-vue-next'
import type { Component } from 'vue'
import type { ItemId, RoleId } from '@/content/ids'

export const ITEM_ICONS: Readonly<Record<ItemId, Component>> = {
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
}

export const ROLE_ICONS: Readonly<Record<RoleId, Component>> = {
  carry: Swords,
  support: HeartHandshake,
  mage: Sparkles,
  initiator: Zap,
  pusher: Castle,
  ganker: Crosshair,
}
