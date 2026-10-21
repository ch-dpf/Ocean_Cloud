import { httpClient } from '../../../services/httpClient'
import type { ApiResult } from '../../../services/apiResult'
import type {
  VectorFeatureCollection,
  VectorLayer,
  VectorLayerPage,
} from '../types/vector'

const layerPath = (layerId: string) =>
  `/vector/layers/${encodeURIComponent(layerId)}`

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

export async function getVectorLayer(layerId: string): Promise<VectorLayer> {
  const result = await httpClient.get<ApiResult<VectorLayer>>(
    layerPath(layerId),
  )
  return result.data
}

/** 删除图层；要素由服务端一并删除，源文件保持不变。 */
export async function deleteVectorLayer(
  layerId: string,
  version: string | number,
): Promise<void> {
  await httpClient.delete(layerPath(layerId), {
    headers: { 'If-Match': `"layer-${layerId}-v${version}"` },
  })
}
