import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Space } from 'antd'
import OlMap from 'ol/Map.js'
import View from 'ol/View.js'
import WKT from 'ol/format/WKT.js'
import DragBox from 'ol/interaction/DragBox.js'
import { always } from 'ol/events/condition.js'
import TileLayer from 'ol/layer/Tile.js'
import VectorLayer from 'ol/layer/Vector.js'
import OSM from 'ol/source/OSM.js'
import VectorSource from 'ol/source/Vector.js'
import Feature from 'ol/Feature.js'
import type Geometry from 'ol/geom/Geometry.js'
import { fromExtent } from 'ol/geom/Polygon.js'
import Style from 'ol/style/Style.js'
import Fill from 'ol/style/Fill.js'
import Stroke from 'ol/style/Stroke.js'
import CircleStyle from 'ol/style/Circle.js'
import type { GeographicBounds } from '../../types/fileMeta'
import 'ol/ol.css'
import styles from './SpatialMap.module.css'

interface SpatialMapProps {
  readonly geometries?: readonly string[]
  readonly bounds?: GeographicBounds | null
  readonly onBoundsChange?: (bounds: GeographicBounds | null) => void
}

interface MapState {
  readonly map: OlMap
  readonly coverage: VectorSource<Feature<Geometry>>
  readonly selection: VectorSource<Feature<Geometry>>
  readonly dragBox: DragBox
}

function normalizeLongitude(value: number): number {
  return ((((value + 180) % 360) + 360) % 360) - 180
}

/** 地图允许平移到相邻世界，查询仍使用标准经度；跨经线保留 west > east。 */
function boundsFromExtent(extent: readonly number[]): GeographicBounds | null {
  const [minX, minY, maxX, maxY] = extent
  if (![minX, minY, maxX, maxY].every(Number.isFinite)) return null
  const north = Math.min(90, maxY)
  const south = Math.max(-90, minY)
  if (maxX <= minX || north <= south) return null
  const wholeWorld = maxX - minX >= 360
  const west = wholeWorld ? -180 : normalizeLongitude(minX)
  const normalizedEast = normalizeLongitude(maxX)
  const east = wholeWorld || normalizedEast === -180 ? 180 : normalizedEast
  const rounded = (value: number) => Number(value.toFixed(8))
  const bounds = {
    west: rounded(west),
    north: rounded(north),
    east: rounded(east),
    south: rounded(south),
  }
  if (bounds.west === bounds.east || bounds.north <= bounds.south) return null
  return bounds
}

export function SpatialMap({
  geometries = [],
  bounds = null,
  onBoundsChange,
}: SpatialMapProps) {
  const target = useRef<HTMLDivElement>(null)
  const state = useRef<MapState | null>(null)
  const onChange = useRef(onBoundsChange)
  const [drawing, setDrawing] = useState(false)
  const [baseMapFailed, setBaseMapFailed] = useState(false)
  const editable = onBoundsChange !== undefined
  const geometryKey = JSON.stringify(geometries)
  const boundsKey = JSON.stringify(bounds)

  useEffect(() => {
    onChange.current = onBoundsChange
  }, [onBoundsChange])

  const coverage = useMemo(() => {
    try {
      const format = new WKT()
      return {
        features: (JSON.parse(geometryKey) as string[]).flatMap((wkt) =>
          format.readFeatures(wkt, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:4326',
          }),
        ),
        error: null,
      }
    } catch {
      return { features: [], error: '文件范围几何无法显示，请检查空间元数据。' }
    }
  }, [geometryKey])

  useEffect(() => {
    if (target.current === null) return
    const red = new VectorSource<Feature<Geometry>>({ wrapX: true })
    const blue = new VectorSource<Feature<Geometry>>({ wrapX: false })
    const osm = new OSM({ crossOrigin: 'anonymous' })
    osm.on('tileloaderror', () => setBaseMapFailed(true))
    const dragBox = new DragBox({
      condition: always,
      className: styles.drawBox,
    })
    dragBox.setActive(false)
    const map = new OlMap({
      target: target.current,
      layers: [
        new TileLayer({ source: osm }),
        new VectorLayer({
          source: red,
          style: new Style({
            fill: new Fill({ color: 'rgba(220, 38, 38, 0.22)' }),
            stroke: new Stroke({ color: '#dc2626', width: 2 }),
            image: new CircleStyle({
              radius: 6,
              fill: new Fill({ color: '#dc2626' }),
              stroke: new Stroke({ color: '#ffffff', width: 1 }),
            }),
          }),
        }),
        new VectorLayer({
          source: blue,
          style: new Style({
            fill: new Fill({ color: 'rgba(31, 117, 242, 0.08)' }),
            stroke: new Stroke({
              color: '#1f75f2',
              width: 2,
              lineDash: [7, 5],
            }),
          }),
        }),
      ],
      // 使用经纬度视图，保证框选始终对应后端的经纬度矩形，并能展示极区范围。
      view: new View({
        projection: 'EPSG:4326',
        center: [105, 30],
        zoom: 3,
        multiWorld: true,
        enableRotation: false,
      }),
    })
    if (editable) {
      map.addInteraction(dragBox)
      dragBox.on('boxend', () => {
        const selected = boundsFromExtent(dragBox.getGeometry().getExtent())
        if (selected !== null) onChange.current?.(selected)
        dragBox.setActive(false)
        setDrawing(false)
      })
    }
    const resize = new ResizeObserver(() => map.updateSize())
    resize.observe(target.current)
    state.current = { map, coverage: red, selection: blue, dragBox }
    return () => {
      resize.disconnect()
      state.current = null
      map.setTarget(undefined)
      map.dispose()
    }
  }, [editable])

  useEffect(() => {
    const current = state.current
    if (current === null) return
    current.coverage.clear()
    current.coverage.addFeatures(coverage.features)
    if (coverage.features.length > 0) {
      current.map.updateSize()
      const extent = current.coverage.getExtent()
      if (extent !== null)
        current.map
          .getView()
          .fit(extent, { padding: [36, 36, 36, 36], maxZoom: 14 })
    }
  }, [coverage, editable])

  useEffect(() => {
    const current = state.current
    if (current === null) return
    current.selection.clear()
    const selected = JSON.parse(boundsKey) as GeographicBounds | null
    if (selected === null) return
    const east =
      selected.east < selected.west ? selected.east + 360 : selected.east
    const feature = new Feature(
      fromExtent([selected.west, selected.south, east, selected.north]),
    )
    current.selection.addFeature(feature)
    current.map.updateSize()
    current.map.getView().fit(feature.getGeometry()!.getExtent(), {
      padding: [36, 36, 36, 36],
      maxZoom: 14,
    })
  }, [boundsKey, editable])

  function toggleDrawing() {
    const active = !drawing
    state.current?.dragBox.setActive(active)
    setDrawing(active)
  }

  function useViewport() {
    const current = state.current
    if (current === null) return
    const selected = boundsFromExtent(
      current.map.getView().calculateExtent(current.map.getSize()),
    )
    if (selected !== null) onChange.current?.(selected)
    current.dragBox.setActive(false)
    setDrawing(false)
  }

  return (
    <div className={styles.root}>
      {editable && (
        <Space wrap className={styles.toolbar}>
          <Button
            type={drawing ? 'primary' : 'default'}
            onClick={toggleDrawing}
          >
            {drawing ? '取消框选' : '框选范围'}
          </Button>
          <Button onClick={useViewport}>使用当前视野</Button>
          <Button
            disabled={bounds === null}
            onClick={() => {
              onBoundsChange?.(null)
              state.current?.dragBox.setActive(false)
              setDrawing(false)
            }}
          >
            清除范围
          </Button>
          <span className={styles.hint}>
            {drawing
              ? '在地图上按住鼠标左键拖出矩形'
              : '拖动平移，滚轮缩放；蓝色矩形表示筛选范围'}
          </span>
        </Space>
      )}
      {coverage.error !== null && (
        <Alert type="error" showIcon message={coverage.error} />
      )}
      {baseMapFailed && (
        <Alert
          type="warning"
          showIcon
          message="底图加载失败，已绘制的文件范围和框选仍可使用。"
        />
      )}
      <div
        ref={target}
        className={styles.map}
        role="region"
        aria-label={editable ? '文件范围筛选地图' : '文件覆盖范围地图'}
      />
      {!editable && (
        <p className={styles.hint}>
          红色半透明区域表示文件登记的覆盖范围；矢量数据展示包围范围。
        </p>
      )}
      {editable && bounds !== null && (
        <p className={styles.hint}>
          左上：{bounds.west}°，{bounds.north}°；右下：{bounds.east}°，
          {bounds.south}°{bounds.west > bounds.east ? '（跨180°经线）' : ''}
        </p>
      )}
    </div>
  )
}
