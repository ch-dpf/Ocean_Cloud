import { useEffect, useRef, useState } from 'react'
import { Spin } from 'antd'
import Feature from 'ol/Feature.js'
import OlMap from 'ol/Map.js'
import GeoJSON from 'ol/format/GeoJSON.js'
import type Geometry from 'ol/geom/Geometry.js'
import Modify from 'ol/interaction/Modify.js'
import TileLayer from 'ol/layer/Tile.js'
import VectorLayer from 'ol/layer/Vector.js'
import OSM from 'ol/source/OSM.js'
import VectorSource from 'ol/source/Vector.js'
import XYZ from 'ol/source/XYZ.js'
import type {
  VectorFeature,
  VectorLayer as VectorLayerMetadata,
  VectorGeometry,
  VectorStyleDefinition,
  VectorRenderContext,
  VectorTileHit,
  VectorClusterHit,
} from '../../types/vector'
import { featureStyleKey, newStyleDefinition } from './vectorStyle'
import { type VectorRenderSettings } from './vectorMapStyle'
import {
  createVectorTileChannel,
  createVectorMapSession,
  geometryHasZ,
  type VectorTileChannel,
} from './vectorTileSource'
import 'ol/ol.css'
import styles from './VectorCartography.module.css'

interface VectorMapProps {
  readonly layers: readonly VectorLayerMetadata[]
  readonly contexts: Readonly<Record<string, VectorRenderContext>>
  readonly definitions: Readonly<Record<string, VectorStyleDefinition>>
  readonly selected: VectorFeature | null
  readonly draft: VectorFeature | null
  readonly focusGeometry: unknown
  readonly zoomTarget: VectorClusterHit | null
  readonly onSelect: (hit: VectorTileHit | null) => void
  readonly onZoomChange: (zoom: number) => void
  readonly onPendingChange: (delta: number) => void
  readonly onTileError: (cause: unknown) => void
  readonly onGeometryChange: (geometry: VectorGeometry) => void
}
const format = new GeoJSON()
const editDefinition = newStyleDefinition()
// OSM 标准瓦片地址：Web 墨卡托 XYZ 规则，256px 瓦片，{z}/{x}/{y}.png
const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
// OSM 不可用时切换到本地发布影像底图，同样使用 {z}/{x}/{y}.png 规则
const FALLBACK_TILE_URL =
  'http://192.168.14.65:8090/gis/publications/IMAGERY/IMG_BA9590FA78774A86976B/{z}/{x}/{y}.png'
const BASEMAP_TIMEOUT_MS = 8000
const BASEMAP_ERROR_LIMIT = 3
type BasemapMode = 'osm' | 'local' | 'off'
export function VectorMap(props: VectorMapProps) {
  const target = useRef<HTMLDivElement>(null)
  const mapRef = useRef<OlMap | null>(null)
  const overlayRef = useRef<VectorLayer | null>(null)
  const baseLayerRef = useRef<TileLayer | null>(null)
  const source = useRef(new VectorSource<Feature<Geometry>>())
  const channels = useRef<VectorTileChannel[]>([])
  const callbacks = useRef(props)
  const settings = useRef<VectorRenderSettings>({
    definitions: props.definitions,
    selectedKey: null,
  })
  const overlaySettings = useRef<VectorRenderSettings>({
    definitions: props.definitions,
    selectedKey: null,
  })
  const [zoom, setZoom] = useState(4)
  const [basemapMode, setBasemapMode] = useState<BasemapMode>('osm')
  const [mapLoading, setMapLoading] = useState(true)
  const {
    contexts,
    definitions,
    selected,
    draft,
    focusGeometry,
    zoomTarget,
    layers,
  } = props
  const editing = !!draft
  useEffect(() => {
    callbacks.current = props
    const selectedKey = selected
      ? featureStyleKey(selected.layerId, selected.id)
      : null
    settings.current = { definitions, selectedKey }
    overlaySettings.current = {
      definitions: draft
        ? { ...definitions, [draft.layerId]: editDefinition }
        : definitions,
      selectedKey,
    }
    channels.current.forEach((channel) => channel.layer.changed())
    overlayRef.current?.changed()
  }, [props, definitions, selected, draft])

  useEffect(() => {
    if (!target.current) return
    const session = createVectorMapSession(
      target.current,
      source.current,
      overlaySettings,
      callbacks,
      channels,
      setZoom,
    )
    mapRef.current = session.map
    overlayRef.current = session.overlay
    return () => {
      session.dispose()
      mapRef.current = null
      overlayRef.current = null
    }
  }, [])

  // 底图图层：具体瓦片源由下拉选项切换。
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const layer = new TileLayer({ zIndex: 0 })
    baseLayerRef.current = layer
    map.getLayers().insertAt(0, layer)
    return () => {
      map.removeLayer(layer)
      baseLayerRef.current = null
    }
  }, [])

  // OSM / 本地 / 关；OSM 连续失败或超时后自动降级并把选项切到本地。
  useEffect(() => {
    const layer = baseLayerRef.current
    if (!layer) return
    if (basemapMode === 'off') {
      layer.setVisible(false)
      return
    }
    layer.setVisible(true)
    // 底图长时间没有可用瓦片时结束加载动画，避免遮罩一直停留。
    const hideTimer = setTimeout(() => setMapLoading(false), 12000)
    const finishLoading = () => setMapLoading(false)
    if (basemapMode === 'local') {
      const local = new XYZ({ url: FALLBACK_TILE_URL })
      layer.setSource(local)
      local.on('tileloadend', finishLoading)
      return () => {
        clearTimeout(hideTimer)
        local.un('tileloadend', finishLoading)
      }
    }
    const osm = new OSM({ url: OSM_TILE_URL, crossOrigin: 'anonymous' })
    layer.setSource(osm)
    let timer: ReturnType<typeof setTimeout> | undefined
    let loaded = 0
    let failed = 0
    const clearTimer = () => {
      if (timer) {
        clearTimeout(timer)
        timer = undefined
      }
    }
    const switchToLocal = () => {
      clearTimer()
      setBasemapMode('local')
    }
    const startTimeout = () => {
      if (timer || loaded > 0) return
      timer = setTimeout(switchToLocal, BASEMAP_TIMEOUT_MS)
    }
    const handleLoadEnd = () => {
      loaded += 1
      clearTimer()
      finishLoading()
    }
    const handleLoadError = () => {
      failed += 1
      if (loaded === 0 && failed >= BASEMAP_ERROR_LIMIT) switchToLocal()
    }
    osm.on('tileloadstart', startTimeout)
    osm.on('tileloadend', handleLoadEnd)
    osm.on('tileloaderror', handleLoadError)
    startTimeout()
    return () => {
      clearTimer()
      clearTimeout(hideTimer)
      osm.un('tileloadstart', startTimeout)
      osm.un('tileloadend', handleLoadEnd)
      osm.un('tileloaderror', handleLoadError)
    }
  }, [basemapMode])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const current = Object.values(contexts).map((context) =>
      createVectorTileChannel(
        map,
        context,
        settings,
        (delta) => callbacks.current.onPendingChange(delta),
        (cause) => callbacks.current.onTileError(cause),
        layers.find((layer) => layer.layerId === context.layerId)?.extent ??
          null,
      ),
    )
    channels.current = current
    current.forEach((channel) => map.addLayer(channel.layer))
    return () => {
      current.forEach((channel) => {
        map.removeLayer(channel.layer)
        channel.dispose()
      })
      channels.current = []
    }
  }, [contexts, layers])

  useEffect(() => {
    source.current.clear()
    const record = draft ?? selected
    if (!record) return
    const feature = format.readFeature(record, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857',
    }) as Feature<Geometry>
    feature.set('__vectorRecord', record)
    source.current.addFeature(feature)
  }, [selected, draft])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !editing) return
    const modify = new Modify({
      source: source.current,
      insertVertexCondition: () =>
        !geometryHasZ(callbacks.current.draft?.geometry),
    })
    modify.on('modifyend', (event) => {
      const geometry = event.features.item(0)?.getGeometry()
      if (geometry)
        callbacks.current.onGeometryChange(
          format.writeGeometryObject(geometry, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857',
          }) as VectorGeometry,
        )
    })
    map.addInteraction(modify)
    return () => {
      map.removeInteraction(modify)
      modify.dispose()
    }
  }, [editing])

  const focusKey = JSON.stringify(focusGeometry)
  useEffect(() => {
    if (!mapRef.current || !focusKey || focusKey === 'null') return
    const geometry = format.readGeometry(JSON.parse(focusKey), {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857',
    })
    if (geometry)
      mapRef.current.getView().fit(geometry.getExtent(), {
        size: mapRef.current.getSize(),
        padding: [36, 36, 36, 36],
        maxZoom: 16,
      })
  }, [focusKey])
  useEffect(() => {
    if (zoomTarget)
      mapRef.current?.getView().animate({
        center: [...zoomTarget.coordinate],
        zoom: Math.min(22, (mapRef.current?.getView().getZoom() ?? 0) + 2),
        duration: 180,
      })
  }, [zoomTarget])
  const zoomBy = (delta: number) => {
    const view = mapRef.current?.getView()
    if (!view) return
    const current = view.getZoom() ?? 0
    // 层级按钮按整数步进：4.5 点击 + 后为 5，点击 − 后为 4。
    const next = delta > 0 ? Math.floor(current) + 1 : Math.ceil(current) - 1
    view.animate({ zoom: Math.min(22, Math.max(0, next)), duration: 180 })
  }
  return (
    <div className={styles.mapShell}>
      <div ref={target} className={styles.map} aria-label="矢量制图地图" />
      {mapLoading && (
        <div className={styles.mapLoading} role="status" aria-live="polite">
          <Spin />
        </div>
      )}
      <select
        className={styles.basemapSelect}
        aria-label="底图"
        value={basemapMode}
        onChange={(event) => {
          const value = event.target.value as BasemapMode
          setMapLoading(value !== 'off')
          setBasemapMode(value)
        }}
      >
        <option value="osm">OSM</option>
        <option value="local">本地</option>
        <option value="off">关</option>
      </select>
      {basemapMode === 'osm' && (
        <a
          className={styles.basemapAttribution}
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          © OpenStreetMap contributors
        </a>
      )}
      <div className={styles.zoomControls}>
        <button type="button" onClick={() => zoomBy(1)} aria-label="放大地图">
          +
        </button>
        <span className={styles.zoomLevel}>
          Z{Number.isInteger(zoom) ? zoom : zoom.toFixed(1)}
        </span>
        <button type="button" onClick={() => zoomBy(-1)} aria-label="缩小地图">
          −
        </button>
      </div>
    </div>
  )
}
