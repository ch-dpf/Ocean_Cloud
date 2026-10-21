import { useEffect, useRef, useState } from 'react'
import Feature from 'ol/Feature.js'
import type { FeatureLike } from 'ol/Feature.js'
import OlMap from 'ol/Map.js'
import View from 'ol/View.js'
import GeoJSON from 'ol/format/GeoJSON.js'
import VectorLayer from 'ol/layer/Vector.js'
import { fromLonLat, transformExtent } from 'ol/proj.js'
import VectorSource from 'ol/source/Vector.js'
import CircleStyle from 'ol/style/Circle.js'
import Fill from 'ol/style/Fill.js'
import Stroke from 'ol/style/Stroke.js'
import Style from 'ol/style/Style.js'
import type Geometry from 'ol/geom/Geometry.js'
import type { VectorBbox, VectorFeature } from '../../types/vector'
import {
  DEFAULT_FEATURE_STYLE,
  featureStyleKey,
  withAlpha,
  type FeatureStyleSetting,
} from './vectorStyle'
import 'ol/ol.css'
import styles from './VectorCartography.module.css'

interface VectorMapProps {
  readonly features: readonly VectorFeature[]
  readonly focusGeometry: unknown
  readonly selectedFeatureKey: string | null
  readonly featureStyles: Readonly<Record<string, FeatureStyleSetting>>
  readonly onBboxChange: (bbox: VectorBbox) => void
  readonly onSelect: (feature: VectorFeature | null) => void
}

const format = new GeoJSON()
const POINT_STROKE = '#ffffff'
const styleCache = new Map<string, Style>()

/** 按颜色和选中状态缓存样式，避免同一要素每帧重复创建。 */
function getFeatureStyle(color: string, selected: boolean): Style {
  const key = `${color}|${selected ? 1 : 0}`
  const cached = styleCache.get(key)
  if (cached) return cached
  const style = new Style({
    stroke: new Stroke({ color, width: selected ? 4 : 2 }),
    fill: new Fill({ color: withAlpha(color, selected ? 0.42 : 0.22) }),
    image: new CircleStyle({
      radius: selected ? 8 : 6,
      fill: new Fill({ color }),
      stroke: new Stroke({ color: POINT_STROKE, width: 2 }),
    }),
  })
  styleCache.set(key, style)
  return style
}

export function VectorMap({
  features,
  focusGeometry,
  selectedFeatureKey,
  featureStyles,
  onBboxChange,
  onSelect,
}: VectorMapProps) {
  const target = useRef<HTMLDivElement>(null)
  const mapRef = useRef<OlMap | null>(null)
  const layerRef = useRef<VectorLayer | null>(null)
  const sourceRef = useRef(new VectorSource<Feature<Geometry>>())
  const callbackRef = useRef({ onBboxChange, onSelect })
  const featureRef = useRef(features)
  const styleRef = useRef(featureStyles)
  const selectedRef = useRef(selectedFeatureKey)
  const [zoom, setZoom] = useState(4)

  useEffect(() => {
    callbackRef.current = { onBboxChange, onSelect }
    featureRef.current = features
    styleRef.current = featureStyles
    selectedRef.current = selectedFeatureKey
  }, [onBboxChange, onSelect, features, featureStyles, selectedFeatureKey])

  useEffect(() => {
    if (!target.current) return
    const source = sourceRef.current
    // 不加载底图瓦片，仅渲染矢量数据。
    const view = new View({
      center: fromLonLat([105, 35]),
      zoom: 4,
      minZoom: 1,
      maxZoom: 22,
    })
    const vectorLayer = new VectorLayer({
      source,
      style: (feature: FeatureLike, resolution: number) => {
        const layerId = String(feature.get('layerId') ?? '')
        const key = featureStyleKey(layerId, String(feature.getId() ?? ''))
        const setting = styleRef.current[key] ?? DEFAULT_FEATURE_STYLE
        const currentZoom = view.getZoomForResolution(resolution) ?? 0
        if (currentZoom < setting.minZoom) return undefined
        return getFeatureStyle(setting.color, key === selectedRef.current)
      },
    })
    const map = new OlMap({
      target: target.current,
      layers: [vectorLayer],
      view,
    })
    mapRef.current = map
    layerRef.current = vectorLayer
    const updateBbox = () => {
      const size = map.getSize()
      if (!size) return
      const extent = transformExtent(
        map.getView().calculateExtent(size),
        'EPSG:3857',
        'EPSG:4326',
      )
      const west = Math.max(-180, Math.min(180, extent[0]))
      const south = Math.max(-90, Math.min(90, extent[1]))
      const east = Math.max(-180, Math.min(180, extent[2]))
      const north = Math.max(-90, Math.min(90, extent[3]))
      if (west < east && south < north)
        callbackRef.current.onBboxChange([west, south, east, north])
    }
    map.on('moveend', updateBbox)
    map.on('singleclick', (event) => {
      const hit = map.forEachFeatureAtPixel(event.pixel, (item) => item)
      if (!hit) {
        callbackRef.current.onSelect(null)
        return
      }
      const id = hit.getId() === undefined ? '' : String(hit.getId())
      const layerId = String(hit.get('layerId') ?? '')
      callbackRef.current.onSelect(
        featureRef.current.find(
          (item) => item.id === id && item.layerId === layerId,
        ) ?? null,
      )
    })
    const updateZoom = () => setZoom(view.getZoom() ?? 0)
    view.on('change:resolution', updateZoom)
    updateZoom()
    updateBbox()
    return () => {
      view.un('change:resolution', updateZoom)
      map.setTarget(undefined)
      mapRef.current = null
      layerRef.current = null
    }
  }, [])

  useEffect(() => {
    const source = sourceRef.current
    source.clear()
    for (const item of features) {
      try {
        const olFeatures = format.readFeatures(item, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857',
        })
        for (const olFeature of olFeatures) {
          olFeature.setId(item.id)
          olFeature.set('layerId', item.layerId)
          source.addFeature(olFeature)
        }
      } catch {
        // 单个异常几何不应使整个地图白屏。
      }
    }
  }, [features])

  useEffect(() => {
    layerRef.current?.changed()
  }, [selectedFeatureKey, featureStyles])

  useEffect(() => {
    if (!mapRef.current || !focusGeometry) return
    try {
      const geometry = format.readGeometry(focusGeometry, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857',
      })
      if (!geometry) return
      mapRef.current.getView().fit(geometry.getExtent(), {
        size: mapRef.current.getSize(),
        padding: [36, 36, 36, 36],
        maxZoom: 16,
      })
    } catch {
      // 缺少或无法解析图层范围时保留当前视窗，仍可手动定位。
    }
  }, [focusGeometry])

  const zoomBy = (delta: number) => {
    const view = mapRef.current?.getView()
    if (!view) return
    view.animate({ zoom: (view.getZoom() ?? 0) + delta, duration: 180 })
  }
  const zoomText = Number.isInteger(zoom) ? String(zoom) : zoom.toFixed(1)

  return (
    <div className={styles.mapShell}>
      <div ref={target} className={styles.map} aria-label="矢量制图地图" />
      <div className={styles.zoomBadge}>当前层级 Z{zoomText}</div>
      <div className={styles.zoomControls}>
        <button type="button" onClick={() => zoomBy(1)} aria-label="放大地图">
          +
        </button>
        <button type="button" onClick={() => zoomBy(-1)} aria-label="缩小地图">
          −
        </button>
      </div>
    </div>
  )
}
