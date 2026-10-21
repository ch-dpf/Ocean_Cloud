import { httpClient } from '../../../services/httpClient'
import type { ApiResult } from '../../../services/apiResult'
import type {
  VectorFeature,
  VectorFeatureCollection,
  VectorFeatureDraft,
  VectorLayer,
  VectorLayerPage,
} from '../types/vector'

const layerPath = (layerId: string) =>
  `/vector/layers/${encodeURIComponent(layerId)}`
const featurePath = (layerId: string, featureId: string) =>
  `${layerPath(layerId)}/features/${encodeURIComponent(featureId)}`

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

export async function getVectorLayer(layerId: string): Promise<VectorLayer> {
  const result = await httpClient.get<ApiResult<VectorLayer>>(layerPath(layerId))
  return result.data
}

export async function getVectorFeatures(
  layerId: string,
  bbox: readonly [number, number, number, number],
  cursor?: string,
  signal?: AbortSignal,
): Promise<VectorFeatureCollection> {
  return httpClient.get<VectorFeatureCollection>(`${layerPath(layerId)}/features`, {
    params: { bbox: bbox.join(','), limit: 500, ...(cursor ? { cursor } : {}) },
    signal,
  })
}

export async function getVectorFeature(
  layerId: string,
  featureId: string,
): Promise<VectorFeature> {
  return httpClient.get<VectorFeature>(featurePath(layerId, featureId))
}

export async function createVectorFeature(
  layerId: string,
  feature: VectorFeatureDraft,
): Promise<VectorFeature> {
  return httpClient.post<VectorFeature>(`${layerPath(layerId)}/features`, feature)
}

export async function updateVectorFeature(
  layerId: string,
  featureId: string,
  version: string | number,
  feature: VectorFeatureDraft,
): Promise<VectorFeature> {
  return httpClient.put<VectorFeature>(featurePath(layerId, featureId), feature, {
    headers: { 'If-Match': `"feature-${featureId}-v${version}"` },
  })
}

export async function deleteVectorFeature(
  layerId: string,
  featureId: string,
  version: string | number,
): Promise<void> {
  await httpClient.delete(featurePath(layerId, featureId), {
    headers: { 'If-Match': `"feature-${featureId}-v${version}"` },
  })
}

export async function deleteVectorLayer(
  layerId: string,
  version: string | number,
): Promise<void> {
  await httpClient.delete(layerPath(layerId), {
    headers: { 'If-Match': `"layer-${layerId}-v${version}"` },
  })
}
