import { httpClient } from '../../../services/httpClient'
import type { ApiResult } from '../../../services/apiResult'
import { RequestError } from '@ocean-cloud/http'
import type { HttpResponse } from '@ocean-cloud/http'
import type {
  VectorStyle,
  VectorMapDefinition,
  VectorCartographyDefinition,
  CartographyOverride,
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

export async function getVectorMapDefinition(
  dataSetId: string,
  signal?: AbortSignal,
): Promise<VectorMapDefinition> {
  const result = await httpClient.get<ApiResult<VectorMapDefinition>>(
    datasetVectorPath(dataSetId) + '/map-definition',
    { signal, silentError: true },
  )
  return result.data
}
export async function getVectorCartography(
  dataSetId: string,
  signal?: AbortSignal,
) {
  const response = await httpClient.getWithResponse<
    ApiResult<VectorCartographyDefinition>
  >(datasetVectorPath(dataSetId) + '/cartography', {
    signal,
    silentError: true,
  })
  return {
    definition: response.data.data,
    etag: response.headers.get('etag') ?? '',
  }
}
export async function getFeatureCartography(
  dataSetId: string,
  featureIds: readonly string[],
  signal?: AbortSignal,
) {
  const result = await httpClient.post<
    ApiResult<Record<string, CartographyOverride>>
  >(
    datasetVectorPath(dataSetId) + '/feature-cartography/query',
    { featureIds },
    { signal, silentError: true },
  )
  return result.data
}
export async function saveGroupCartography(
  dataSetId: string,
  groupId: string,
  patch: CartographyOverride,
  etag: string,
) {
  await httpClient.put(
    datasetVectorPath(dataSetId) +
      '/groups/' +
      encodeURIComponent(groupId) +
      '/cartography',
    patch,
    { headers: { 'If-Match': etag } },
  )
}
export async function saveFeatureCartography(
  dataSetId: string,
  featureId: string,
  patch: CartographyOverride,
  etag: string,
) {
  await httpClient.put(
    datasetVectorPath(dataSetId) +
      '/features/' +
      encodeURIComponent(featureId) +
      '/cartography',
    patch,
    { headers: { 'If-Match': etag } },
  )
}
export async function deleteFeatureCartography(
  dataSetId: string,
  featureId: string,
  etag: string,
) {
  await httpClient.delete(
    datasetVectorPath(dataSetId) +
      '/features/' +
      encodeURIComponent(featureId) +
      '/cartography',
    { headers: { 'If-Match': etag } },
  )
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
  readonly coordinates: readonly [number, number, number]
  readonly sourceKey: string
  priority: number
}
// OpenLayers 控制的是渲染任务；在HTTP入口单独限制整页的真实在途请求。
const TILE_HTTP_CONCURRENCY = 4
const tileJobs = new Map<string, TileJob>()
const tileQueue: TileJob[] = []
let activeTileRequests = 0
const tileViews = new Map<string, readonly [number, number, number]>()
const sourceKey = (context: VectorMapDefinition) =>
  context.dataSetId + '/' + context.tileVersion
function requestPriority(
  coordinates: readonly [number, number, number],
  view?: readonly [number, number, number],
) {
  return view
    ? Math.abs(coordinates[0] - view[0]) * 1000000 +
        Math.abs(coordinates[1] - view[1]) +
        Math.abs(coordinates[2] - view[2])
    : 0
}
export function prioritizeVectorTileRequests(
  context: VectorMapDefinition,
  z: number,
  x: number,
  y: number,
) {
  const key = sourceKey(context),
    view = [z, x, y] as const
  if (tileViews.size >= 32 && !tileViews.has(key))
    tileViews.delete(tileViews.keys().next().value!)
  tileViews.set(key, view)
  tileQueue.forEach((job) => {
    if (job.sourceKey === key)
      job.priority = requestPriority(job.coordinates, view)
  })
  tileQueue.sort((a, b) => a.priority - b.priority)
}

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
  context: VectorMapDefinition,
  z: number,
  x: number,
  y: number,
  signal?: AbortSignal,
): Promise<ArrayBuffer> {
  const canceled = () => new RequestError('瓦片请求已取消', 'canceled')
  if (signal?.aborted) return Promise.reject(canceled())
  const key =
    context.dataSetId + '/' + context.tileVersion + '/' + z + '/' + x + '/' + y
  let job = tileJobs.get(key)
  if (!job) {
    job = {
      key,
      started: false,
      coordinates: [z, x, y],
      sourceKey: sourceKey(context),
      priority: requestPriority([z, x, y], tileViews.get(sourceKey(context))),
      waiters: new Set(),
      // 已发出的请求等待真实响应后才释放并发槽。中止XHR并不会停止同步JDBC查询。
      load: () =>
        httpClient.get<ArrayBuffer>(
          datasetVectorPath(context.dataSetId) +
            '/tiles/' +
            context.tileVersion +
            '/' +
            z +
            '/' +
            x +
            '/' +
            y +
            '.mvt',
          {
            responseType: 'arraybuffer',
            silentError: true,
            retry: false,
            timeout: 35000,
          },
        ),
    }
    tileJobs.set(key, job)
    tileQueue.push(job)
    tileQueue.sort((a, b) => a.priority - b.priority)
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
