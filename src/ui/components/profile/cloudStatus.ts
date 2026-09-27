import { CloudAlert, CloudCheck, CloudOff, CloudUpload, RotateCw } from 'lucide-vue-next'
import type { Component } from 'vue'
import type { CloudStatus } from '../../stores/cloud'

export const CLOUD_ICONS: Readonly<Record<CloudStatus, Component>> = {
  off: CloudOff,
  local: CloudUpload,
  syncing: RotateCw,
  synced: CloudCheck,
  offline: CloudOff,
  error: CloudAlert,
}

/** Just enough of the address to recognise it: `ni•••@mail.ru`. */
export function maskEmail(email: string) {
  const [name = '', domain = ''] = email.split('@')
  return `${name.slice(0, 2)}•••@${domain}`
}
