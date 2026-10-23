import type { FeatureLike } from 'ol/Feature.js'
import { RequestError } from '@ocean-cloud/http'
import View from 'ol/View.js'
import { createXYZ } from 'ol/tilegrid.js'
import { fromLonLat, get as getProjection } from 'ol/proj.js'
import VectorLayer from 'ol/layer/Vector.js'
import type VectorSource from 'ol/source/Vector.js'
import type Feature from 'ol/Feature.js'
import type Geometry from 'ol/geom/Geometry.js'
import OlMap from 'ol/Map.js'
import TileState from 'ol/TileState.js'
import type Tile from 'ol/VectorTile.js'
import MVT from 'ol/format/MVT.js'
import VectorTileLayer from 'ol/layer/VectorTile.js'
import type RenderFeature from 'ol/render/Feature.js'
import VectorTileSource from 'ol/source/VectorTile.js'
import {
  getVectorTile,
  getFeatureCartography,
  prioritizeVectorTileRequests,
} from '../../services/vectorService'
import type {
  VectorMapDefinition,
  VectorFeature,
  VectorTileHit,
} from '../../types/vector'
import {
  createVectorStyleFunction,
  readVectorTileHit,
  createVectorTileStyleFunction,
  type VectorRenderSettings,
} from './vectorMapStyle'

export interface VectorTileChannel {
  readonly layer: VectorTileLayer
  prioritize: (extent: number[], resolution: number) => void
  refreshCartography: () => void
  retryFailed: () => void
  dispose: () => void
}
/** 同一数据版本复用source；仅卸载/数据版本变化时取消请求。 */
export function createVectorTileChannel(
  context: VectorMapDefinition,
  settings: { current: VectorRenderSettings },
  onPending: (delta: number) => void,
  onError: (cause: unknown) => void,
): VectorTileChannel {
  const format = new MVT({ layers: ['features'] })
  const grid = createXYZ({
    tileSize: context.tileSize,
    maxZoom: context.nativeMaxZoom,
  })
  const pending = new Map<AbortController, Tile<RenderFeature>>()
  let disposed = false
  const reportedErrors = new Set<string>()
  const loadedTiles = new Map<string, WeakRef<Tile<RenderFeature>>>()
  const failedTiles = new Set<Tile<RenderFeature>>()
  let styleController = new AbortController()
  let styleCache = settings.current.featureOverrides
  const styleQueue: {
    ids: string[]
    cache: NonNullable<VectorRenderSettings['featureOverrides']>
  }[] = []
  const queuedIds = new Set<string>()
  let styleRequests = 0
  const pumpStyles = () => {
    while (!disposed && styleRequests < 4 && styleQueue.length) {
      const job = styleQueue.shift()!
      if (job.cache !== settings.current.featureOverrides) continue
      styleRequests++
      void getFeatureCartography(
        context.dataSetId,
        job.ids,
        styleController.signal,
      )
        .then((result) => {
          if (disposed || job.cache !== settings.current.featureOverrides)
            return
          job.ids.forEach((id) => job.cache.set(id, result[id] ?? null))
          if (job.cache.size > 65536) {
            const retained = new Set<string>()
            for (const [key, reference] of loadedTiles) {
              const features = reference.deref()?.getFeatures()
              if (!features) {
                loadedTiles.delete(key)
                continue
              }
              features.forEach((feature) =>
                retained.add(String(feature.get('_vector_feature_id'))),
              )
            }
            for (const id of job.cache.keys())
              if (!retained.has(id)) job.cache.delete(id)
          }
          layer.changed()
        })
        .catch((cause) => {
          if (
            !disposed &&
            job.cache === settings.current.featureOverrides &&
            !styleController.signal.aborted
          )
            onError(cause)
        })
        .finally(() => {
          styleRequests--
          if (job.cache === styleCache)
            job.ids.forEach((id) => queuedIds.delete(id))
          pumpStyles()
        })
    }
  }
  const hydrateStyles = (incomingIds?: readonly string[]) => {
    const config = settings.current.cartography
    const overrides = settings.current.featureOverrides
    if (!config?.hasFeatureOverrides || !overrides) return
    if (styleCache !== overrides) {
      styleController.abort()
      styleController = new AbortController()
      styleCache = overrides
      styleQueue.length = 0
      queuedIds.clear()
    }
    const needed = new Set(incomingIds)
    if (!incomingIds)
      for (const [key, reference] of loadedTiles) {
        const features = reference.deref()?.getFeatures()
        if (!features) {
          loadedTiles.delete(key)
          continue
        }
        features.forEach((feature) =>
          needed.add(String(feature.get('_vector_feature_id'))),
        )
      }
    const missing = [...needed].filter(
      (id) => !overrides.has(id) && !queuedIds.has(id),
    )
    missing.forEach((id) => queuedIds.add(id))
    for (let i = 0; i < missing.length; i += 256)
      styleQueue.push({ ids: missing.slice(i, i + 256), cache: overrides })
    pumpStyles()
  }
  const source = new VectorTileSource({
    format,
    tileGrid: grid,
    maxZoom: context.nativeMaxZoom,
    wrapX: false,
    transition: 200,
    tileUrlFunction: (coord) => {
      if (!coord || coord[0] > context.nativeMaxZoom) return undefined
      return context.tileVersion + '/' + coord.join('/')
    },
    tileLoadFunction: (baseTile) => {
      const tile = baseTile as Tile<RenderFeature>
      tile.setLoader((extent, _resolution, projection) => {
        if (disposed) {
          tile.setState(TileState.ERROR)
          return
        }
        const controller = new AbortController()
        pending.set(controller, tile)
        onPending(1)
        const [z, x, y] = tile.tileCoord
        void getVectorTile(context, z, x, y, controller.signal)
          .then((data) => {
            if (controller.signal.aborted) return
            const features = data.byteLength
              ? format.readFeatures(data, {
                  extent,
                  featureProjection: projection,
                })
              : []
            if (!controller.signal.aborted) {
              tile.setFeatures(features)
              loadedTiles.set(tile.tileCoord.join('/'), new WeakRef(tile))
              failedTiles.delete(tile)
              if (settings.current.cartography?.hasFeatureOverrides)
                hydrateStyles(
                  features.map((feature) =>
                    String(feature.get('_vector_feature_id')),
                  ),
                )
            }
          })
          .catch((cause: unknown) => {
            if (controller.signal.aborted) return
            tile.setState(TileState.ERROR)
            failedTiles.add(tile)
            const errorKey =
              cause instanceof RequestError ? String(cause.status) : 'decode'
            if (!reportedErrors.has(errorKey)) {
              reportedErrors.add(errorKey)
              onError(cause)
            }
          })
          .finally(() => {
            if (pending.delete(controller)) onPending(-1)
          })
      })
    },
  })
  const layer = new VectorTileLayer({
    source,
    // vector 模式在同一画布中绘制相邻瓦片，避免 hybrid 离屏栅格化放大
    // 面/线裁剪边界的抗锯齿，形成可见的瓦片接缝。
    renderMode: 'vector',
    renderBuffer: 64,
    cacheSize: 256,
    updateWhileAnimating: true,
    updateWhileInteracting: true,
    declutter: true,
    style: createVectorTileStyleFunction(settings),
  })
  const abort = (controller: AbortController, tile: Tile<RenderFeature>) => {
    controller.abort()
    tile.setState(TileState.ERROR)
    if (pending.delete(controller)) onPending(-1)
  }
  return {
    layer,
    prioritize: (extent, resolution) => {
      const z = grid.getZForResolution(resolution, source.zDirection)
      const center = grid.getTileCoordForCoordAndZ(
        [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2],
        z,
      )
      prioritizeVectorTileRequests(context, z, center[1], center[2])
    },
    retryFailed: () => {
      reportedErrors.clear()
      for (const tile of failedTiles) {
        tile.setState(TileState.IDLE)
        tile.load()
      }
      failedTiles.clear()
      hydrateStyles()
      layer.changed()
    },
    refreshCartography: () => {
      hydrateStyles()
      layer.changed()
    },
    dispose: () => {
      disposed = true
      styleController.abort()
      for (const [controller, item] of pending) abort(controller, item)
      source.clear()
      layer.dispose()
    },
  }
}

/** XYZ 顶点可拖动；新增顶点需要显式输入高程，避免 OL 自动补零。 */
export function geometryHasZ(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const geometry = value as { coordinates?: unknown; geometries?: unknown[] }
  const visit = (coordinates: unknown): boolean =>
    Array.isArray(coordinates) &&
    (typeof coordinates[0] === 'number'
      ? coordinates.length > 2
      : coordinates.some(visit))
  return (
    visit(geometry.coordinates) ||
    (geometry.geometries?.some(geometryHasZ) ?? false)
  )
}
export function sourceRecord(feature: FeatureLike) {
  return feature.get('__vectorRecord') as
    import('../../types/vector').VectorFeature | undefined
}

interface MapCallbacks {
  readonly minZoom: number
  readonly maxZoom: number
  readonly draft: VectorFeature | null
  readonly onSelect: (hit: VectorTileHit | null) => void
  readonly onZoomChange: (zoom: number) => void
}
export function createVectorMapSession(
  target: HTMLDivElement,
  source: VectorSource<Feature<Geometry>>,
  settings: { current: VectorRenderSettings },
  callbacks: { current: MapCallbacks },
  channels: { current: VectorTileChannel[] },
  updateZoom: (zoom: number) => void,
) {
  const view = new View({
    center: fromLonLat([105, 35]),
    zoom: 4,
    maxResolution: 40075016.68557849 / 512,
    minZoom: callbacks.current.minZoom,
    maxZoom: callbacks.current.maxZoom,
    extent: getProjection('EPSG:3857')!.getExtent(),
    showFullExtent: true,
    multiWorld: false,
  })
  const overlay = new VectorLayer({
    source,
    zIndex: 1000,
    style: createVectorStyleFunction(view, settings),
  })
  const map = new OlMap({
    target,
    layers: [overlay],
    controls: [],
    view,
    maxTilesLoading: 4,
  })
  map.on('singleclick', (event) => {
    if (callbacks.current.draft) return
    const hits: { hit: VectorTileHit; priority: number }[] = []
    map.forEachFeatureAtPixel(
      event.pixel,
      (feature) => {
        const record = sourceRecord(feature)
        if (record) {
          hits.push({
            hit: {
              kind: 'feature',
              layerId: record.layerId,
              featureId: record.id,
            },
            priority: 4,
          })
          return
        }
        const hit = readVectorTileHit(feature)
        if (hit)
          hits.push({
            hit,
            priority:
              feature.get('_vector_category') === 'POINT'
                ? 3
                : feature.get('_vector_category') === 'LINE'
                  ? 2
                  : 1,
          })
      },
      { hitTolerance: 5 },
    )
    callbacks.current.onSelect(
      hits.sort((a, b) => b.priority - a.priority)[0]?.hit ?? null,
    )
  })
  const resizeObserver = new ResizeObserver(() => map.updateSize())
  resizeObserver.observe(target)
  const prioritize = () => {
    const resolution = view.getResolution()
    if (resolution && map.getSize())
      channels.current.forEach((channel) =>
        channel.prioritize(view.calculateExtent(map.getSize()), resolution),
      )
  }
  view.on('change:center', prioritize)
  view.on('change:resolution', prioritize)
  const changedZoom = () => {
    const value = view.getZoom() ?? 0
    updateZoom(value)
    callbacks.current.onZoomChange(value)
  }
  view.on('change:resolution', changedZoom)
  changedZoom()
  return {
    map,
    overlay,
    dispose: () => {
      view.un('change:resolution', changedZoom)
      view.un('change:center', prioritize)
      view.un('change:resolution', prioritize)
      resizeObserver.disconnect()
      map.setTarget(undefined)
      map.dispose()
    },
  }
}

/** 在原始几何进入地图编辑源之前验证结构，非法草稿只保留在文本输入中。 */
export function validateVectorGeometry(
  value: unknown,
): asserts value is import('../../types/vector').VectorGeometry {
  const fail = () => {
    throw new Error(
      '几何结构无效：使用非空 GeoJSON 几何、有效经纬度和 XY/XYZ 坐标；面环必须闭合。',
    )
  }
  const array = (items: unknown, min: number): unknown[] => {
    if (!Array.isArray(items) || items.length < min) return fail()
    return items
  }
  const point = (value: unknown) => {
    const coordinates = array(value, 2)
    if (
      coordinates.length > 3 ||
      !coordinates.every(
        (item) => typeof item === 'number' && Number.isFinite(item),
      )
    )
      fail()
    if (
      Math.abs(coordinates[0] as number) > 180 ||
      Math.abs(coordinates[1] as number) > 90
    )
      fail()
  }
  const line = (value: unknown, min = 2) => {
    array(value, min).forEach(point)
  }
  const polygon = (value: unknown) => {
    for (const ring of array(value, 1)) {
      line(ring, 4)
      const positions = ring as number[][]
      if (JSON.stringify(positions[0]) !== JSON.stringify(positions.at(-1)))
        fail()
    }
  }
  const visit = (geometry: unknown) => {
    if (!geometry || typeof geometry !== 'object' || Array.isArray(geometry))
      return fail()
    const item = geometry as {
      type?: string
      coordinates?: unknown
      geometries?: unknown
    }
    switch (item.type) {
      case 'Point':
        point(item.coordinates)
        break
      case 'MultiPoint':
        array(item.coordinates, 1).forEach(point)
        break
      case 'LineString':
        line(item.coordinates)
        break
      case 'MultiLineString':
        array(item.coordinates, 1).forEach((child) => line(child))
        break
      case 'Polygon':
        polygon(item.coordinates)
        break
      case 'MultiPolygon':
        array(item.coordinates, 1).forEach(polygon)
        break
      case 'GeometryCollection':
        array(item.geometries, 1).forEach(visit)
        break
      default:
        fail()
    }
  }
  visit(value)
}
