import type { FeatureLike } from 'ol/Feature.js'
import { RequestError } from '@ocean-cloud/http'
import View from 'ol/View.js'
import { createXYZ } from 'ol/tilegrid.js'
import { fromLonLat, transformExtent } from 'ol/proj.js'
import VectorLayer from 'ol/layer/Vector.js'
import type VectorSource from 'ol/source/Vector.js'
import type Feature from 'ol/Feature.js'
import type Geometry from 'ol/geom/Geometry.js'
import OlMap from 'ol/Map.js'
import TileState from 'ol/TileState.js'
import type Tile from 'ol/VectorTile.js'
import type { Extent } from 'ol/extent.js'
import { intersects, extend } from 'ol/extent.js'
import MVT from 'ol/format/MVT.js'
import VectorTileLayer from 'ol/layer/VectorTile.js'
import type RenderFeature from 'ol/render/Feature.js'
import VectorTileSource from 'ol/source/VectorTile.js'
import { getVectorTile } from '../../services/vectorService'
import type {
  VectorRenderContext,
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
  cancelOutside: (extent: Extent) => void
  dispose: () => void
}
/** 每个上下文独立 source；请求走统一 HTTP；离开视窗及卸载取消订阅，由调度器管理实际在途请求。 */
export function createVectorTileChannel(
  context: VectorRenderContext,
  settings: { current: VectorRenderSettings },
  onPending: (delta: number) => void,
  onError: (cause: unknown) => void,
): VectorTileChannel {
  const format = new MVT({ layers: ['features'] })
  const grid = createXYZ({ tileSize: 256, maxZoom: context.maxZoom })
  const pending = new Map<
    AbortController,
    { extent: Extent; tile: Tile<RenderFeature> }
  >()
  let requestEpoch = 0
  let disposed = false
  const reportedErrors = new Set<string>()
  let cancelledExtent: Extent | undefined
  const source = new VectorTileSource({
    format,
    tileGrid: grid,
    maxZoom: context.maxZoom,
    wrapX: false,
    transition: 0,
    tileUrlFunction: (coord) => {
      if (!coord || coord[0] > context.maxZoom) return undefined
      return context.contextId + '/' + requestEpoch + '/' + coord.join('/')
    },
    tileLoadFunction: (baseTile) => {
      const tile = baseTile as Tile<RenderFeature>
      tile.setLoader((extent, _resolution, projection) => {
        if (disposed) {
          tile.setState(TileState.ERROR)
          return
        }
        const controller = new AbortController()
        pending.set(controller, { extent, tile })
        onPending(1)
        const [z, x, y] = tile.tileCoord
        void getVectorTile(context, z, x, y, controller.signal)
          .then((data) => {
            if (!controller.signal.aborted)
              tile.setFeatures(
                data.byteLength
                  ? format.readFeatures(data, {
                      extent,
                      featureProjection: projection,
                    })
                  : [],
              )
          })
          .catch((cause: unknown) => {
            if (controller.signal.aborted) return
            tile.setState(TileState.ERROR)
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
    declutter: true,
    style: createVectorTileStyleFunction(settings),
  })
  layer.set('__vectorContext', context)
  const abort = (controller: AbortController, tile: Tile<RenderFeature>) => {
    controller.abort()
    tile.setState(TileState.ERROR)
    if (pending.delete(controller)) onPending(-1)
  }
  return {
    layer,
    cancelOutside: (extent) => {
      // 返回取消过的区域时刷新source，让渲染缓存中的ERROR瓦片重新进入加载队列。
      if (cancelledExtent && intersects(extent, cancelledExtent)) {
        cancelledExtent = undefined
        for (const [controller, item] of pending) abort(controller, item.tile)
        requestEpoch++
        source.setTileUrlFunction(
          source.getTileUrlFunction(),
          context.contextId + ':' + requestEpoch,
        )
        source.refresh()
      }
      for (const [controller, item] of pending)
        if (!intersects(extent, item.extent)) {
          cancelledExtent = cancelledExtent
            ? extend(cancelledExtent, item.extent)
            : [...item.extent]
          abort(controller, item.tile)
        }
    },
    dispose: () => {
      disposed = true
      for (const [controller, item] of pending) abort(controller, item.tile)
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
  readonly draft: VectorFeature | null
  readonly onSelect: (hit: VectorTileHit | null) => void
  readonly onZoomChange: (zoom: number) => void
  readonly onViewportChange: (viewport: {
    readonly bbox: readonly [number, number, number, number]
    readonly displayZoom: number
    readonly widthPixels: number
    readonly heightPixels: number
  }) => void
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
    minZoom: 0,
    maxZoom: 22,
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
      (feature, layer) => {
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
        const context = layer?.get('__vectorContext') as
          VectorRenderContext | undefined
        const hit =
          context && readVectorTileHit(feature, context, event.coordinate)
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
  const reportViewport = () => {
    const size = map.getSize()
    if (!size || size[0] < 1 || size[1] < 1) return
    const extent = view.calculateExtent(map.getSize())
    channels.current.forEach((channel) => channel.cancelOutside(extent))
    const bbox = transformExtent(extent, 'EPSG:3857', 'EPSG:4326')
    callbacks.current.onViewportChange({
      bbox: [
        bbox[0],
        Math.max(-85.05112878, bbox[1]),
        bbox[2],
        Math.min(85.05112878, bbox[3]),
      ],
      displayZoom: view.getZoom() ?? 0,
      widthPixels: Math.round(size[0]),
      heightPixels: Math.round(size[1]),
    })
  }
  map.on('moveend', reportViewport)
  const resizeObserver = new ResizeObserver(() => {
    map.updateSize()
    reportViewport()
  })
  resizeObserver.observe(target)
  const changedZoom = () => {
    const value = view.getZoom() ?? 0
    updateZoom(value)
    callbacks.current.onZoomChange(value)
  }
  view.on('change:resolution', changedZoom)
  changedZoom()
  reportViewport()
  return {
    map,
    overlay,
    dispose: () => {
      view.un('change:resolution', changedZoom)
      map.un('moveend', reportViewport)
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
