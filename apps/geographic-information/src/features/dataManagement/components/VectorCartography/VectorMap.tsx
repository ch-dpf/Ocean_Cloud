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
  VectorGeometry,
  VectorMapDefinition,
  VectorCartographyDefinition,
  VectorTileHit,
} from '../../types/vector'
import {
  LOCAL_TILE_URL,
  OSM_TILE_URL,
  type BasemapMode,
} from '../../constants/map'
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
  readonly context: VectorMapDefinition | null
  readonly cartography: VectorCartographyDefinition | null
  readonly hiddenGroups: ReadonlySet<string>
  readonly retryRevision: number
  readonly selected: VectorFeature | null
  readonly draft: VectorFeature | null
  readonly focusGeometry: unknown
  readonly minZoom: number
  readonly maxZoom: number
  readonly onSelect: (hit: VectorTileHit | null) => void
  readonly onZoomChange: (zoom: number) => void
  readonly onPendingChange: (delta: number) => void
  readonly onTileError: (cause: unknown) => void
  readonly onGeometryChange: (geometry: VectorGeometry) => void
}
const format = new GeoJSON()
const editDefinition = newStyleDefinition()
const BASEMAP_TIMEOUT_MS = 8000
const BASEMAP_ERROR_LIMIT = 3
export function VectorMap(props: VectorMapProps) {
  const target = useRef<HTMLDivElement>(null)
  const mapRef = useRef<OlMap | null>(null)
  const overlayRef = useRef<VectorLayer | null>(null)
  const baseLayerRef = useRef<TileLayer | null>(null)
  const source = useRef(new VectorSource<Feature<Geometry>>())
  const channels = useRef<VectorTileChannel[]>([])
  const callbacks = useRef(props)
  const settings = useRef<VectorRenderSettings>({
    definitions: {},
    selectedKey: null,
  })
  const overlaySettings = useRef<VectorRenderSettings>({
    definitions: {},
    selectedKey: null,
  })
  const [zoom, setZoom] = useState(4)
  // 矢量地图进入时默认不显示底图
  const [basemapMode, setBasemapMode] = useState<BasemapMode>('off')
  const [mapLoading, setMapLoading] = useState(false)
  const { context, selected, draft, focusGeometry, minZoom, maxZoom } = props
  const editing = !!draft
  useEffect(() => {
    callbacks.current = props
  }, [props])
  useEffect(() => {
    settings.current = {
      ...settings.current,
      cartography: props.cartography,
      featureOverrides: new Map(),
    }
    channels.current.forEach((channel) => channel.refreshCartography())
  }, [props.cartography])
  useEffect(() => {
    const selectedKey = selected
      ? featureStyleKey(selected.layerId, selected.id)
      : null
    settings.current = {
      ...settings.current,
      definitions: {},
      selectedKey,
      hiddenGroups: props.hiddenGroups,
    }
    const overlayRecord = draft ?? selected
    overlaySettings.current = {
      definitions: overlayRecord
        ? { [overlayRecord.layerId]: editDefinition }
        : {},
      selectedKey,
    }
    channels.current.forEach((channel) => channel.layer.changed())
    overlayRef.current?.changed()
  }, [selected, draft, props.hiddenGroups])

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

  useEffect(() => {
    channels.current.forEach((channel) => channel.retryFailed())
  }, [props.retryRevision])

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
      const local = new XYZ({ url: LOCAL_TILE_URL })
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
    const current = context
      ? [
          createVectorTileChannel(
            context,
            settings,
            (delta) => callbacks.current.onPendingChange(delta),
            (cause) => callbacks.current.onTileError(cause),
          ),
        ]
      : []
    channels.current = current
    current.forEach((channel) => map.addLayer(channel.layer))
    return () => {
      current.forEach((channel) => {
        map.removeLayer(channel.layer)
        channel.dispose()
      })
      channels.current = []
    }
  }, [context])

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
    const view = mapRef.current?.getView()
    if (!view) return
    view.setMinZoom(minZoom)
    view.setMaxZoom(maxZoom)
  }, [minZoom, maxZoom])
  const zoomBy = (delta: number) => {
    const view = mapRef.current?.getView()
    if (!view) return
    const current = view.getZoom() ?? 0
    // 层级按钮按整数步进：4.5 点击 + 后为 5，点击 − 后为 4。
    const next = delta > 0 ? Math.floor(current) + 1 : Math.ceil(current) - 1
    view.animate({
      zoom: Math.min(view.getMaxZoom(), Math.max(view.getMinZoom(), next)),
      duration: 180,
    })
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
