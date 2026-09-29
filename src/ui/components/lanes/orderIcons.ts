import { ChevronsRight, Shield, Users } from 'lucide-vue-next'
import type { Component } from 'vue'
import type { LaneStance } from '@/content/ids'

export const ORDER_ICONS: Readonly<Record<LaneStance, Component>> = {
  push: ChevronsRight,
  hold: Shield,
  group: Users,
}
