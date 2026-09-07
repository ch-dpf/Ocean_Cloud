import test from 'node:test'
import assert from 'node:assert/strict'
import { CHANNEL, isBridgeMessage } from '../packages/bridge/src/index.ts'
test('accepts valid lifecycle, context and navigation messages', () => {
  for (const message of [
    { channel: CHANNEL, type: 'ready', appId: 'resources' },
    {
      channel: CHANNEL,
      type: 'context',
      theme: 'light',
      platform: 'Ocean_Cloud',
    },
    { channel: CHANNEL, type: 'navigate', path: '/' },
  ])
    assert.equal(isBridgeMessage(message), true)
})
test('rejects unknown channels, apps, unsafe routes and malformed payloads', () => {
  for (const message of [
    null,
    1,
    [],
    {},
    { channel: 'wrong', type: 'ready', appId: 'resources' },
    { channel: CHANNEL, type: 'ready', appId: 'unknown' },
    { channel: CHANNEL, type: 'navigate', path: 'https://example.com' },
    { channel: CHANNEL, type: 'context', theme: 'light', platform: {} },
    { channel: CHANNEL, type: 'unknown' },
  ])
    assert.equal(isBridgeMessage(message), false)
})
