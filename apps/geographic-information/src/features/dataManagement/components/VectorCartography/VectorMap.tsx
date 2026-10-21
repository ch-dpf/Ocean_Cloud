import { useEffect, useRef } from 'react'
import Feature from 'ol/Feature.js'
import Map from 'ol/Map.js'
import View from 'ol/View.js'
import GeoJSON from 'ol/format/GeoJSON.js'
import Draw from 'ol/interaction/Draw.js'
import TileLayer from 'ol/layer/Tile.js'
import VectorLayer from 'ol/layer/Vector.js'
import { fromLonLat, transformExtent } from 'ol/proj.js'
import OSM from 'ol/source/OSM.js'
import VectorSource from 'ol/source/Vector.js'
import CircleStyle from 'ol/style/Circle.js'
import Fill from 'ol/style/Fill.js'
import Stroke from 'ol/style/Stroke.js'
import Style from 'ol/style/Style.js'
import type Geometry from 'ol/geom/Geometry.js'
import type { VectorFeature, VectorFeatureDraft } from '../../types/vector'
import 'ol/ol.css'
import styles from './VectorCartography.module.css'

export type DrawGeometry = 'Point' | 'LineString' | 'Polygon' | null
export type VectorBbox = readonly [number, number, number, number]

interface VectorMapProps {
  readonly features: readonly VectorFeature[]
  readonly focusGeometry: unknown
  readonly selectedFeatureId: string | null
  readonly drawGeometry: DrawGeometry
  readonly onBboxChange: (bbox: VectorBbox) => void
  readonly onSelect: (feature: VectorFeature | null) => void
  readonly onDraw: (feature: VectorFeatureDraft) => void
}

const format = new GeoJSON()
const normalStyle = new Style({
  stroke: new Stroke({ color: '#1677ff', width: 2 }),
  fill: new Fill({ color: 'rgba(22,119,255,.22)' }),
  image: new CircleStyle({
    radius: 6,
    fill: new Fill({ color: '#1677ff' }),
    stroke: new Stroke({ color: '#fff', width: 2 }),
  }),
})
const selectedStyle = new Style({
  stroke: new Stroke({ color: '#f59e0b', width: 4 }),
  fill: new Fill({ color: 'rgba(245,158,11,.28)' }),
  image: new CircleStyle({
    radius: 8,
    fill: new Fill({ color: '#f59e0b' }),
    stroke: new Stroke({ color: '#fff', width: 2 }),
  }),
})

export function VectorMap({
  features,
  focusGeometry,
  selectedFeatureId,
  drawGeometry,
  onBboxChange,
  onSelect,
  onDraw,
}: VectorMapProps) {
  const target = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const sourceRef = useRef(new VectorSource<Feature<Geometry>>())
  const callbackRef = useRef({ onBboxChange, onSelect, onDraw })
  const featureRef = useRef(features)
  const drawingRef = useRef(drawGeometry)
  const selectedRef = useRef(selectedFeatureId)

  useEffect(() => {
    callbackRef.current = { onBboxChange, onSelect, onDraw }
    featureRef.current = features
    drawingRef.current = drawGeometry
    selectedRef.current = selectedFeatureId
  }, [onBboxChange, onSelect, onDraw, features, drawGeometry, selectedFeatureId])

  useEffect(() => {
    if (!target.current) return
    const source = sourceRef.current
    const map = new Map({
      target: target.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        new VectorLayer({
          source,
          style: (feature) =>
            feature.getId() === selectedRef.current ? selectedStyle : normalStyle,
        }),
      ],
      view: new View({ center: fromLonLat([105, 35]), zoom: 4, minZoom: 1 }),
    })
    mapRef.current = map
    const updateBbox = () => {
      const size = map.getSize()
      if (!size) return
      const extent = transformExtent(
        map.getView().calculateExtent(size), 'EPSG:3857', 'EPSG:4326',
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
      if (drawingRef.current) return
      const hit = map.forEachFeatureAtPixel(event.pixel, (item) => item)
      const id = hit?.getId()
      callbackRef.current.onSelect(
        id === undefined
          ? null
          : featureRef.current.find((item) => item.id === String(id)) ?? null,
      )
    })
    updateBbox()
    return () => {
      map.setTarget(undefined)
      mapRef.current = null
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
          source.addFeature(olFeature)
        }
      } catch {
        // 单个异常几何不应使整个地图白屏。
      }
    }
  }, [features])

  useEffect(() => {
    mapRef.current?.getLayers().item(1)?.changed()
  }, [selectedFeatureId])

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

  useEffect(() => {
    const map = mapRef.current
    if (!map || !drawGeometry) return
    const drawSource = new VectorSource<Feature<Geometry>>()
    const interaction = new Draw({ source: drawSource, type: drawGeometry })
    map.addInteraction(interaction)
    interaction.on('drawend', (event) => {
      const json = format.writeFeatureObject(event.feature, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857',
      })
      callbackRef.current.onDraw({
        type: 'Feature',
        geometry: json.geometry as VectorFeatureDraft['geometry'],
        properties: {},
      })
    })
    return () => {
      map.removeInteraction(interaction)
    }
  }, [drawGeometry])

  return <div ref={target} className={styles.map} aria-label="矢量制图地图" />
}
