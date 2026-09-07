export const CHANNEL = 'ocean-cloud:v1'
export const MICRO_APPLICATION_IDS = [
  'resources',
  'geographic-information',
  'marine-information',
] as const
export type MicroApplicationId = (typeof MICRO_APPLICATION_IDS)[number]
export type BridgeMessage =
  | { channel: typeof CHANNEL; type: 'ready'; appId: MicroApplicationId }
  | { channel: typeof CHANNEL; type: 'navigate'; path: '/' | '/applications' }
  | {
      channel: typeof CHANNEL
      type: 'context'
      theme: 'light'
      platform: string
    }
export function isBridgeMessage(value: unknown): value is BridgeMessage {
  if (!value || typeof value !== 'object') return false
  const message = value as Record<string, unknown>
  if (message.channel !== CHANNEL) return false
  switch (message.type) {
    case 'ready':
      return MICRO_APPLICATION_IDS.some((appId) => appId === message.appId)
    case 'navigate':
      return message.path === '/' || message.path === '/applications'
    case 'context':
      return message.theme === 'light' && typeof message.platform === 'string'
    default:
      return false
  }
}
