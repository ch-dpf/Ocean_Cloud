import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Space } from 'antd'
import OlMap from 'ol/Map.js'
import View from 'ol/View.js'
import WKT from 'ol/format/WKT.js'
import GeoJSON from 'ol/format/GeoJSON.js'
import DragBox from 'ol/interaction/DragBox.js'
import { defaults as defaultInteractions } from 'ol/interaction/defaults.js'
import { always } from 'ol/events/condition.js'
import TileLayer from 'ol/layer/Tile.js'
import VectorLayer from 'ol/layer/Vector.js'
import OSM from 'ol/source/OSM.js'
import VectorSource from 'ol/source/Vector.js'
import XYZ from 'ol/source/XYZ.js'
import Feature from 'ol/Feature.js'
import type Geometry from 'ol/geom/Geometry.js'
import { fromExtent } from 'ol/geom/Polygon.js'
import Point from 'ol/geom/Point.js'
import Style from 'ol/style/Style.js'
import Fill from 'ol/style/Fill.js'
import Stroke from 'ol/style/Stroke.js'
import CircleStyle from 'ol/style/Circle.js'
import type { GeographicBounds } from '../../types/fileMeta'
import {
  LOCAL_TILE_URL,
  OSM_TILE_URL,
  type BasemapMode,
} from '../../constants/map'
import 'ol/ol.css'
import styles from './SpatialMap.module.css'

/**
 * 覆盖范围的 GeoJSON 顶层结构：FeatureCollection / Feature / 裸几何都行，
 * 具体层级交给 ol 的 GeoJSON 解析器，这里不做逐层建模
 */
export interface SpatialGeoJson {
  readonly type: string
  readonly features?: readonly unknown[]
  readonly coordinates?: unknown
  readonly geometry?: unknown
}

/** 一个经纬度点：数据集内的文件中心点用它直接画在地图上 */
export interface SpatialPoint {
  readonly longitude: number
  readonly latitude: number
}

interface SpatialMapProps {
  readonly geometries?: readonly string[]
  /** 覆盖范围的 GeoJSON；与 geometries 一起绘制（数据集轮廓就是这种形态） */
  readonly geojson?: SpatialGeoJson | null
  /** 文件中心点；同一份红色样式里画成小圆点 */
  readonly points?: readonly SpatialPoint[]
  readonly bounds?: GeographicBounds | null
  readonly onBoundsChange?: (bounds: GeographicBounds | null) => void
  /** 嵌入卡片预览等小容器：地图占满容器，不渲染工具栏、说明与告警条 */
  readonly embedded?: boolean
  /** 显示底图切换与层级控制（用于点击数据进入的文件空间信息地图） */
  readonly showControls?: boolean
  /** 外部经纬度变化时是否自动缩放到该范围；框选弹窗内只画矩形，不改变视窗 */
  readonly fitBounds?: boolean
  /** 撑满父容器高度（框选弹窗左侧地图） */
  readonly fill?: boolean
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
  geojson = null,
  points = [],
  bounds = null,
  onBoundsChange,
  embedded = false,
  showControls = false,
  fitBounds = true,
  fill = false,
}: SpatialMapProps) {
  const target = useRef<HTMLDivElement>(null)
  const state = useRef<MapState | null>(null)
  const baseLayerRef = useRef<TileLayer | null>(null)
  const onChange = useRef(onBoundsChange)
  const [drawing, setDrawing] = useState(false)
  const [baseMapFailed, setBaseMapFailed] = useState(false)
  const [basemapMode, setBasemapMode] = useState<BasemapMode>('osm')
  const [zoom, setZoom] = useState(3)
  const editable = onBoundsChange !== undefined
  const geometryKey = JSON.stringify(geometries)
  // GeoJSON 与点只在变化时重新解析，键与 boundsKey 同为序列化结果
  const geojsonKey = geojson === null ? null : JSON.stringify(geojson)
  const pointsKey = JSON.stringify(points)
  const boundsKey = JSON.stringify(bounds)

  useEffect(() => {
    onChange.current = onBoundsChange
  }, [onBoundsChange])

  const coverage = useMemo(() => {
    try {
      const format = new WKT()
      const features = (JSON.parse(geometryKey) as string[]).flatMap((wkt) =>
        format.readFeatures(wkt, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:4326',
        }),
      )
      if (geojsonKey !== null) {
        // ol 的 GeoJSON 解析器直接吃 JSON 文本，省去一层对象类型约束
        features.push(
          ...new GeoJSON().readFeatures(geojsonKey, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:4326',
          }),
        )
      }
      // 中心点与面共用一份样式：Style 的 image 分支负责画点，fill / stroke 负责画面
      features.push(
        ...(JSON.parse(pointsKey) as SpatialPoint[]).flatMap((point) => {
          // 后端的数字字段可能是字符串，统一转成数字再校验，避免点被静默丢掉
          const longitude = Number(point.longitude)
          const latitude = Number(point.latitude)
          if (!Number.isFinite(longitude) || !Number.isFinite(latitude))
            return []
          return [new Feature(new Point([longitude, latitude]))]
        }),
      )
      return { features, error: null }
    } catch {
      return { features: [], error: '文件范围几何无法显示，请检查空间元数据。' }
    }
  }, [geometryKey, geojsonKey, pointsKey])

  useEffect(() => {
    if (target.current === null) return
    const red = new VectorSource<Feature<Geometry>>({ wrapX: true })
    const blue = new VectorSource<Feature<Geometry>>({ wrapX: false })
    const dragBox = new DragBox({
      condition: always,
      className: styles.drawBox,
    })
    dragBox.setActive(false)
    const tileLayer = new TileLayer({ zIndex: 0 })
    // 使用经纬度视图，保证框选始终对应后端的经纬度矩形，并能展示极区范围。
    const view = new View({
      projection: 'EPSG:4326',
      center: [105, 30],
      zoom: 3,
      multiWorld: true,
      enableRotation: false,
    })
    const map = new OlMap({
      target: target.current,
      // 嵌在卡片里时关掉滚轮缩放：否则光标停在卡片上就滚不动卡片墙，
      // 拖动平移不受影响
      interactions: embedded
        ? defaultInteractions({ mouseWheelZoom: false, pinchRotate: false })
        : undefined,
      layers: [
        tileLayer,
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
      view,
    })
    baseLayerRef.current = tileLayer
    const updateZoom = () => setZoom(view.getZoom() ?? 0)
    view.on('change:resolution', updateZoom)
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
      view.un('change:resolution', updateZoom)
      baseLayerRef.current = null
      resize.disconnect()
      state.current = null
      map.setTarget(undefined)
      map.dispose()
    }
  }, [editable, embedded])

  // 底图切换：OSM / 本地 / 关。
  useEffect(() => {
    const layer = baseLayerRef.current
    if (!layer) return
    if (basemapMode === 'off') {
      layer.setVisible(false)
      return
    }
    layer.setVisible(true)
    if (basemapMode === 'local') {
      layer.setSource(new XYZ({ url: LOCAL_TILE_URL }))
      return
    }
    const osm = new OSM({ url: OSM_TILE_URL, crossOrigin: 'anonymous' })
    const fail = () => setBaseMapFailed(true)
    osm.on('tileloaderror', fail)
    layer.setSource(osm)
    return () => {
      osm.un('tileloaderror', fail)
    }
  }, [basemapMode])

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
    if (!fitBounds) return
    current.map.getView().fit(feature.getGeometry()!.getExtent(), {
      padding: [36, 36, 36, 36],
      maxZoom: 14,
    })
  }, [boundsKey, editable, fitBounds])

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

  function zoomBy(delta: number) {
    const view = state.current?.map.getView()
    if (!view) return
    const current = view.getZoom() ?? 0
    // 层级按钮按整数步进：4.5 点击 + 后为 5，点击 − 后为 4。
    const next = delta > 0 ? Math.floor(current) + 1 : Math.ceil(current) - 1
    view.animate({ zoom: Math.min(22, Math.max(0, next)), duration: 180 })
  }

  return (
    <div
      className={[styles.root, embedded && styles.embedded, fill && styles.fill]
        .filter(Boolean)
        .join(' ')}
    >
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
      {/* 嵌入卡片预览时不叠告警条：小尺寸会把范围轮廓整个盖住 */}
      {!embedded && coverage.error !== null && (
        <Alert type="error" showIcon message={coverage.error} />
      )}
      {!embedded && basemapMode === 'osm' && baseMapFailed && (
        <Alert
          type="warning"
          showIcon
          message="底图加载失败，已绘制的文件范围和框选仍可使用。"
        />
      )}
      <div className={styles.mapShell}>
        <div
          ref={target}
          className={styles.map}
          role="region"
          aria-label={editable ? '文件范围筛选地图' : '文件覆盖范围地图'}
        />
        {showControls && !embedded && (
          <>
            <select
              className={styles.basemapSelect}
              aria-label="底图"
              value={basemapMode}
              onChange={(event) => {
                setBaseMapFailed(false)
                setBasemapMode(event.target.value as BasemapMode)
              }}
            >
              <option value="osm">OSM</option>
              <option value="local">本地</option>
              <option value="off">关</option>
            </select>
            <div className={styles.zoomControls}>
              <button
                type="button"
                onClick={() => zoomBy(1)}
                aria-label="放大地图"
              >
                +
              </button>
              <span className={styles.zoomLevel}>
                Z{Number.isInteger(zoom) ? zoom : zoom.toFixed(1)}
              </span>
              <button
                type="button"
                onClick={() => zoomBy(-1)}
                aria-label="缩小地图"
              >
                −
              </button>
            </div>
          </>
        )}
      </div>
      {!editable && !embedded && (
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
