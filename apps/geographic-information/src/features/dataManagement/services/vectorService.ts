import { httpClient } from '../../../services/httpClient'
import type { ApiResult } from '../../../services/apiResult'
import { RequestError } from '@ocean-cloud/http'
import type { HttpResponse } from '@ocean-cloud/http'
import type {
  VectorStyle,
  VectorRenderContext,
  VectorRenderContextInput,
  VectorClusterMembers,
  VersionedVectorFeature,
  VectorFeature,
  VectorStyleSummary,
  VectorStyleDefinition,
  VectorStyleMatch,
  VersionedVectorStyle,
  VectorFeatureCollection,
  VectorLayer,
  VectorLayerPage,
  VectorGroup,
  DatasetVectorStyle,
  EffectiveVectorStyle,
  VersionedVectorGroups,
  VersionedVectorLayer,
  VectorLayerPresentationInput,
} from '../types/vector'

const layerPath = (layerId: string) =>
  `/vector/layers/${encodeURIComponent(layerId)}`
const datasetVectorPath = (dataSetId: string) =>
  `/vector/datasets/${encodeURIComponent(dataSetId)}`

export async function getVectorLayers(
  dataSetId: string,
  current = 1,
  size = 100,
  signal?: AbortSignal,
): Promise<VectorLayerPage> {
  const result = await httpClient.get<ApiResult<VectorLayerPage>>(
    '/vector/layers',
    { params: { dataSetId, current, size }, signal },
  )
  return result.data
}

export async function getVectorFeatures(
  layerId: string,
  bbox: readonly [number, number, number, number],
  cursor?: string,
  signal?: AbortSignal,
): Promise<VectorFeatureCollection> {
  return httpClient.get<VectorFeatureCollection>(
    `${layerPath(layerId)}/features`,
    {
      params: {
        bbox: bbox.join(','),
        limit: 500,
        ...(cursor ? { cursor } : {}),
      },
      signal,
    },
  )
}

export async function getVectorLayer(
  layerId: string,
  signal?: AbortSignal,
): Promise<VersionedVectorLayer> {
  const response = await httpClient.getWithResponse<ApiResult<VectorLayer>>(
    layerPath(layerId),
    { signal, silentError: true },
  )
  const etag = response.headers.get('etag')
  if (!etag) throw new Error('未收到图层版本，请重新加载图层。')
  return { layer: response.data.data, etag }
}

/** 删除图层；要素由服务端一并删除，源文件保持不变。 */
export async function deleteVectorLayer(
  layerId: string,
  etag: string,
): Promise<void> {
  await httpClient.delete(layerPath(layerId), {
    headers: { 'If-Match': etag },
  })
}

export async function getVectorGroups(
  dataSetId: string,
  signal?: AbortSignal,
): Promise<VersionedVectorGroups> {
  const response = await httpClient.getWithResponse<
    ApiResult<readonly VectorGroup[]>
  >(datasetVectorPath(dataSetId) + '/groups', { signal, silentError: true })
  const etag = response.headers.get('etag')
  if (!etag) throw new Error('未收到分类树版本，请重新加载分类树。')
  return { groups: response.data.data, etag }
}

export async function getDatasetVectorStyle(
  dataSetId: string,
  signal?: AbortSignal,
): Promise<DatasetVectorStyle> {
  const result = await httpClient.get<ApiResult<DatasetVectorStyle>>(
    datasetVectorPath(dataSetId) + '/style',
    { signal, silentError: true },
  )
  return result.data
}

export async function updateVectorGroupVisibility(
  dataSetId: string,
  groupId: string,
  enabled: boolean,
  etag: string,
): Promise<void> {
  await httpClient.patch<ApiResult<unknown>>(
    datasetVectorPath(dataSetId) +
      '/groups/' +
      encodeURIComponent(groupId) +
      '/visibility',
    { enabled },
    { headers: { 'If-Match': etag }, silentError: true },
  )
}

export async function updateVectorLayerPresentation(
  layerId: string,
  input: VectorLayerPresentationInput,
  etag: string,
): Promise<VersionedVectorLayer> {
  const response = await httpClient.putWithResponse<ApiResult<VectorLayer>>(
    layerPath(layerId) + '/presentation',
    input,
    { headers: { 'If-Match': etag }, silentError: true },
  )
  const nextEtag = response.headers.get('etag')
  if (!nextEtag) throw new Error('未收到更新后的图层版本，请重新加载图层。')
  return { layer: response.data.data, etag: nextEtag }
}

const stylePath = (layerId: string, styleId?: string) =>
  layerPath(layerId) +
  '/styles' +
  (styleId ? '/' + encodeURIComponent(styleId) : '')

function versionedStyle(
  response: HttpResponse<ApiResult<VectorStyle>>,
): VersionedVectorStyle {
  const etag = response.headers.get('etag')
  if (!etag)
    throw new Error('未收到样式版本，请检查服务及代理是否传递 ETag 响应头。')
  return { style: response.data.data, etag }
}

export async function getVectorStyles(
  layerId: string,
  signal?: AbortSignal,
): Promise<readonly VectorStyleSummary[]> {
  const result = await httpClient.get<ApiResult<readonly VectorStyleSummary[]>>(
    stylePath(layerId),
    { signal, silentError: true },
  )
  return result.data
}

export async function getVectorStyle(
  layerId: string,
  styleId: string,
  signal?: AbortSignal,
): Promise<VersionedVectorStyle> {
  return versionedStyle(
    await httpClient.getWithResponse<ApiResult<VectorStyle>>(
      stylePath(layerId, styleId),
      { signal, silentError: true },
    ),
  )
}

export async function getEffectiveVectorStyle(
  layerId: string,
  signal?: AbortSignal,
): Promise<EffectiveVectorStyle> {
  const result = await httpClient.get<ApiResult<EffectiveVectorStyle>>(
    layerPath(layerId) + '/default-style',
    { signal, silentError: true },
  )
  return result.data
}

export async function saveVectorStyle(
  layerId: string,
  body: { readonly name: string; readonly definition: VectorStyleDefinition },
  existing: VersionedVectorStyle | null,
  signal?: AbortSignal,
): Promise<VersionedVectorStyle> {
  const options = {
    signal,
    silentError: true,
    ...(existing ? { headers: { 'If-Match': existing.etag } } : {}),
  }
  return versionedStyle(
    existing
      ? await httpClient.putWithResponse<ApiResult<VectorStyle>>(
          stylePath(layerId, existing.style.styleId),
          body,
          options,
        )
      : await httpClient.postWithResponse<ApiResult<VectorStyle>>(
          stylePath(layerId),
          body,
          options,
        ),
  )
}

export async function setDefaultVectorStyle(
  layerId: string,
  target: VersionedVectorStyle,
  signal?: AbortSignal,
): Promise<VersionedVectorStyle> {
  return versionedStyle(
    await httpClient.putWithResponse<ApiResult<VectorStyle>>(
      stylePath(layerId, target.style.styleId) + '/default',
      undefined,
      { signal, silentError: true, headers: { 'If-Match': target.etag } },
    ),
  )
}

export async function deleteVectorStyle(
  layerId: string,
  target: VersionedVectorStyle,
  signal?: AbortSignal,
): Promise<void> {
  await httpClient.delete(stylePath(layerId, target.style.styleId), {
    signal,
    silentError: true,
    headers: { 'If-Match': target.etag },
  })
}

export async function matchSavedVectorStyle(
  layerId: string,
  styleId: string,
  featureId: string,
  zoom: number,
  signal?: AbortSignal,
): Promise<VectorStyleMatch> {
  const result = await httpClient.post<ApiResult<VectorStyleMatch>>(
    stylePath(layerId, styleId) + '/match',
    { featureId, zoom },
    { signal, silentError: true },
  )
  return result.data
}

export async function createVectorRenderContext(
  dataSetId: string,
  input: VectorRenderContextInput,
  signal?: AbortSignal,
): Promise<VectorRenderContext> {
  const result = await httpClient.post<ApiResult<VectorRenderContext>>(
    datasetVectorPath(dataSetId) + '/render-contexts',
    input,
    { signal, silentError: true },
  )
  return result.data
}

interface TileWaiter {
  readonly resolve: (data: ArrayBuffer) => void
  readonly reject: (cause: unknown) => void
  readonly signal?: AbortSignal
  readonly cancel: () => void
}
interface TileJob {
  readonly key: string
  readonly load: () => Promise<ArrayBuffer>
  readonly waiters: Set<TileWaiter>
  started: boolean
}
// OpenLayers 控制的是渲染任务；在HTTP入口单独限制整页的真实在途请求。
const TILE_HTTP_CONCURRENCY = 2
const tileJobs = new Map<string, TileJob>()
const tileQueue: TileJob[] = []
let activeTileRequests = 0

function pumpTileRequests() {
  while (activeTileRequests < TILE_HTTP_CONCURRENCY && tileQueue.length) {
    const job = tileQueue.shift()!
    if (!job.waiters.size) continue
    job.started = true
    activeTileRequests++
    const finish = (outcome: { data: ArrayBuffer } | { error: unknown }) => {
      tileJobs.delete(job.key)
      activeTileRequests--
      for (const waiter of job.waiters) {
        waiter.signal?.removeEventListener('abort', waiter.cancel)
        if ('data' in outcome) waiter.resolve(outcome.data)
        else waiter.reject(outcome.error)
      }
      job.waiters.clear()
      pumpTileRequests()
    }
    void job.load().then(
      (data) => finish({ data }),
      (error) => finish({ error }),
    )
  }
}
export function getVectorTile(
  context: VectorRenderContext,
  z: number,
  x: number,
  y: number,
  signal?: AbortSignal,
): Promise<ArrayBuffer> {
  const canceled = () => new RequestError('瓦片请求已取消', 'canceled')
  if (signal?.aborted) return Promise.reject(canceled())
  const key =
    context.dataSetId + '/' + context.contextId + '/' + z + '/' + x + '/' + y
  let job = tileJobs.get(key)
  if (!job) {
    job = {
      key,
      started: false,
      waiters: new Set(),
      // 已发出的请求等待真实响应后才释放并发槽。中止XHR并不会停止同步JDBC查询。
      load: () =>
        httpClient.get<ArrayBuffer>(
          datasetVectorPath(context.dataSetId) +
            '/tiles/' +
            z +
            '/' +
            x +
            '/' +
            y +
            '.mvt',
          {
            params: { contextId: context.contextId },
            responseType: 'arraybuffer',
            silentError: true,
            retry: false,
            timeout: 35000,
          },
        ),
    }
    tileJobs.set(key, job)
    tileQueue.push(job)
  }
  const current = job
  return new Promise((resolve, reject) => {
    const cancel = () => {
      current.waiters.delete(waiter)
      signal?.removeEventListener('abort', cancel)
      reject(canceled())
      if (!current.started && !current.waiters.size) {
        if (tileJobs.get(key) === current) tileJobs.delete(key)
        const index = tileQueue.indexOf(current)
        if (index >= 0) tileQueue.splice(index, 1)
      }
    }
    const waiter: TileWaiter = { resolve, reject, signal, cancel }
    current.waiters.add(waiter)
    signal?.addEventListener('abort', cancel, { once: true })
    pumpTileRequests()
  })
}
export async function getVectorClusterMembers(
  hit: {
    readonly dataSetId: string
    readonly kind: 'cluster'
    readonly clusterId: string
    readonly contextId: string
  },
  cursor?: string,
  signal?: AbortSignal,
): Promise<VectorClusterMembers> {
  const result = await httpClient.get<ApiResult<VectorClusterMembers>>(
    datasetVectorPath(hit.dataSetId) +
      '/clusters/' +
      encodeURIComponent(hit.clusterId) +
      '/features',
    {
      params: {
        contextId: hit.contextId,
        limit: 50,
        ...(cursor ? { cursor } : {}),
      },
      signal,
      silentError: true,
    },
  )
  return result.data
}
function versionedFeature(
  response: HttpResponse<VectorFeature>,
): VersionedVectorFeature {
  const etag = response.headers.get('etag')
  if (!etag) throw new Error('未收到要素版本，请重新加载要素。')
  return { feature: response.data, etag }
}
export async function getVectorFeature(
  layerId: string,
  featureId: string,
  signal?: AbortSignal,
): Promise<VersionedVectorFeature> {
  return versionedFeature(
    await httpClient.getWithResponse<VectorFeature>(
      layerPath(layerId) + '/features/' + encodeURIComponent(featureId),
      { signal, silentError: true },
    ),
  )
}
export async function updateVectorFeature(
  existing: VersionedVectorFeature,
  draft: VectorFeature,
  signal?: AbortSignal,
): Promise<VersionedVectorFeature> {
  return versionedFeature(
    await httpClient.putWithResponse<VectorFeature>(
      layerPath(existing.feature.layerId) +
        '/features/' +
        encodeURIComponent(existing.feature.id),
      {
        type: 'Feature',
        id: existing.feature.id,
        geometry: draft.geometry,
        properties: draft.properties,
      },
      {
        headers: {
          'If-Match': existing.etag,
          'Content-Type': 'application/geo+json',
        },
        signal,
        silentError: true,
      },
    ),
  )
}
export async function deleteVectorFeature(
  existing: VersionedVectorFeature,
  signal?: AbortSignal,
): Promise<void> {
  await httpClient.delete(
    layerPath(existing.feature.layerId) +
      '/features/' +
      encodeURIComponent(existing.feature.id),
    { headers: { 'If-Match': existing.etag }, signal, silentError: true },
  )
}
