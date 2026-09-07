import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { createHttpClient, RequestError } from '../packages/http/src/index.ts'
let server
let baseURL
before(async () => {
  server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost')
    if (url.pathname === '/slow') {
      setTimeout(() => {
        response.end('{}')
      }, 150)
      return
    }
    if (url.pathname === '/disconnect') {
      request.socket.destroy()
      return
    }
    const status = Number(url.searchParams.get('status') || 200)
    response.writeHead(status, { 'Content-Type': 'application/json' })
    if (url.pathname === '/business') {
      response.end(
        JSON.stringify({ code: 'TOKEN_EXPIRED', message: '登录已过期' }),
      )
      return
    }
    let body = ''
    for await (const chunk of request) body += chunk
    response.end(
      JSON.stringify({
        method: request.method,
        authorization: request.headers.authorization,
        body: body ? JSON.parse(body) : null,
        query: url.searchParams.get('query'),
      }),
    )
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  baseURL = 'http://127.0.0.1:' + server.address().port
})
after(
  () =>
    new Promise((resolve) => {
      server.close(resolve)
      server.closeAllConnections()
    }),
)
test('Axios sends params, JSON body and current token; returns response data', async () => {
  let token = 'first'
  const client = createHttpClient({ baseURL, getAccessToken: () => token })
  assert.equal(
    (await client.get('/', { params: { query: 'ocean' }, proxy: false })).query,
    'ocean',
  )
  token = 'second'
  const response = await client.post('/', { name: '云海' }, { proxy: false })
  assert.equal(response.authorization, 'Bearer second')
  assert.deepEqual(response.body, { name: '云海' })
  for (const method of ['put', 'patch', 'delete'])
    assert.equal(
      (
        await client[method](
          '/',
          ...(method === 'delete'
            ? [{ proxy: false }]
            : [{}, { proxy: false }]),
        )
      ).method,
      method.toUpperCase(),
    )
})
test('HTTP error classification, one event and status-specific subscription', async () => {
  for (const [status, kind] of [
    [400, 'validation'],
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not-found'],
    [408, 'timeout'],
    [409, 'conflict'],
    [422, 'validation'],
    [429, 'rate-limit'],
    [500, 'server'],
    [502, 'server'],
    [503, 'server'],
    [504, 'server'],
    [418, 'http'],
  ]) {
    const client = createHttpClient({ baseURL })
    let count = 0
    let specificCount = 0
    client.onError((error) => {
      count++
      assert.equal(error.status, status)
    })
    const unsubscribe = client.onStatus(status, () => specificCount++)
    await assert.rejects(
      client.get('/', { params: { status }, proxy: false }),
      (error) => error instanceof RequestError && error.kind === kind,
    )
    assert.equal(count, 1)
    assert.equal(specificCount, 1)
    unsubscribe()
    await assert.rejects(
      client.get('/', { params: { status }, proxy: false, silentError: true }),
    )
    assert.equal(count, 1)
    assert.equal(specificCount, 1)
  }
})
test('business codes preserve body contract, reject and emit typed event', async () => {
  const client = createHttpClient({
    baseURL,
    parseBusinessError: (data) =>
      data.code ? { code: data.code, message: data.message } : null,
  })
  let count = 0
  client.onBusinessCode('TOKEN_EXPIRED', () => count++)
  await assert.rejects(
    client.get('/business', { proxy: false }),
    (error) =>
      error.kind === 'business' && error.businessCode === 'TOKEN_EXPIRED',
  )
  assert.equal(count, 1)
})
test('network and timeout failures are distinct; cancellation is silent', async () => {
  const client = createHttpClient({ baseURL, timeout: 30 })
  const kinds = []
  client.onError((error) => kinds.push(error.kind))
  await assert.rejects(
    client.get('/disconnect', { proxy: false }),
    (error) => error.kind === 'network',
  )
  await assert.rejects(
    client.get('/slow', { proxy: false }),
    (error) => error.kind === 'timeout',
  )
  const controller = new AbortController()
  const promise = client.get('/slow', {
    signal: controller.signal,
    proxy: false,
  })
  controller.abort()
  await assert.rejects(promise, (error) => error.kind === 'canceled')
  assert.deepEqual(kinds, ['network', 'timeout'])
})
test('unsubscribe and throwing subscribers do not swallow request failures', async () => {
  const client = createHttpClient({ baseURL })
  let count = 0
  const off = client.onError(() => count++)
  off()
  client.onError(() => {
    throw Error('listener failed')
  })
  await assert.rejects(
    client.get('/', { params: { status: 404 }, proxy: false }),
    (error) => error.kind === 'not-found',
  )
  assert.equal(count, 0)
})
