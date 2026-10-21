import { httpClient } from '../../../services/httpClient'
import type { ApiResult } from '../../../services/apiResult'
import type { VectorFeatureCollection, VectorLayerPage } from '../types/vector'

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
