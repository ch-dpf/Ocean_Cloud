export const CHANNEL = 'ocean-cloud:v1'
export type MicroApplicationId = 'resources'
export type BridgeMessage =
  | { channel: typeof CHANNEL; type: 'ready'; appId: MicroApplicationId }
  | { channel: typeof CHANNEL; type: 'navigate'; path: '/' }
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
      return message.appId === 'resources'
    case 'navigate':
      return message.path === '/'
    case 'context':
      return message.theme === 'light' && typeof message.platform === 'string'
    default:
      return false
  }
}
