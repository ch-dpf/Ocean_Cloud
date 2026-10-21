import { useEffect, useRef, useState } from 'react'
import Feature from 'ol/Feature.js'
import OlMap from 'ol/Map.js'
import GeoJSON from 'ol/format/GeoJSON.js'
import type Geometry from 'ol/geom/Geometry.js'
import Modify from 'ol/interaction/Modify.js'
import VectorLayer from 'ol/layer/Vector.js'
import VectorSource from 'ol/source/Vector.js'
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
export function VectorMap(props: VectorMapProps) {
  const target = useRef<HTMLDivElement>(null)
  const mapRef = useRef<OlMap | null>(null)
  const overlayRef = useRef<VectorLayer | null>(null)
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
    view?.animate({ zoom: (view.getZoom() ?? 0) + delta, duration: 180 })
  }
  return (
    <div className={styles.mapShell}>
      <div ref={target} className={styles.map} aria-label="矢量制图地图" />
      <div className={styles.zoomBadge}>
        当前层级 Z{Number.isInteger(zoom) ? zoom : zoom.toFixed(1)}
      </div>
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
