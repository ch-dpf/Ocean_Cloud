import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Drawer,
  InputNumber,
  Select,
  Space,
  Spin,
  Switch,
} from 'antd'
import { RequestError } from '@ocean-cloud/http'
import {
  getEffectiveVectorStyle,
  getVectorLayer,
  updateVectorLayerPresentation,
} from '../../services/vectorService'
import type {
  VectorCustomStyle,
  VectorGroup,
  VectorLayer,
  VectorSymbol,
} from '../../types/vector'

interface Props {
  readonly layer: VectorLayer
  readonly groups: readonly VectorGroup[]
  readonly onSaved: (layer: VectorLayer) => void
  readonly onClose: () => void
}

function flatten(groups: readonly VectorGroup[]): VectorGroup[] {
  return groups.flatMap((group) => [group, ...flatten(group.children)])
}

function defaultSymbol(layer: VectorLayer): VectorSymbol {
  if (layer.geometryType === 'POINT')
    return {
      color: '#247BC0',
      radius: 6,
      opacity: 1,
      strokeColor: '#ffffff',
      strokeWidth: 1,
    }
  if (layer.geometryType === 'LINE')
    return { color: '#247BC0', width: 2, opacity: 1 }
  return {
    fillColor: '#247BC0',
    fillOpacity: 0.3,
    strokeColor: '#247BC0',
    strokeWidth: 1,
    strokeOpacity: 1,
  }
}

function asCustomStyle(value: unknown): VectorCustomStyle | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Partial<VectorCustomStyle>
  return typeof item.minZoom === 'number' &&
    typeof item.maxZoom === 'number' &&
    item.symbol &&
    typeof item.symbol === 'object'
    ? (item as VectorCustomStyle)
    : null
}

export function VectorPresentationPanel({
  layer,
  groups,
  onSaved,
  onClose,
}: Props) {
  const candidates = useMemo(
    () =>
      flatten(groups).filter(
        (group) =>
          group.assignable && group.geometryType === layer.geometryType,
      ),
    [groups, layer.geometryType],
  )
  const [groupId, setGroupId] = useState(layer.groupId ?? '')
  const [mode, setMode] = useState<'INHERIT_TARGET_GROUP' | 'CUSTOM'>(
    layer.styleMode === 'CUSTOM' ? 'CUSTOM' : 'INHERIT_TARGET_GROUP',
  )
  const [enabled, setEnabled] = useState(layer.enabled)
  const [minZoom, setMinZoom] = useState(0)
  const [maxZoom, setMaxZoom] = useState(25)
  const [symbol, setSymbol] = useState<VectorSymbol>(() => defaultSymbol(layer))
  const [etag, setEtag] = useState<string | null>(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void Promise.all([
      getVectorLayer(layer.layerId, controller.signal),
      getEffectiveVectorStyle(layer.layerId, controller.signal),
    ])
      .then(([versioned, effective]) => {
        if (controller.signal.aborted) return
        setEtag(versioned.etag)
        setGroupId(versioned.layer.groupId ?? '')
        setEnabled(versioned.layer.enabled)
        setMode(
          versioned.layer.styleMode === 'CUSTOM'
            ? 'CUSTOM'
            : 'INHERIT_TARGET_GROUP',
        )
        const custom = asCustomStyle(effective.definition)
        if (custom) {
          setMinZoom(custom.minZoom)
          setMaxZoom(custom.maxZoom)
          setSymbol(custom.symbol)
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : '图层配置加载失败')
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false)
      })
    return () => controller.abort()
  }, [layer])

  const selectedGroup = candidates.find((group) => group.id === groupId)
  const unknownGroup = selectedGroup?.nodeType.includes('UNKNOWN') ?? false
  const invalid =
    !etag ||
    !groupId ||
    (mode === 'INHERIT_TARGET_GROUP' && unknownGroup) ||
    minZoom < 0 ||
    minZoom > 18 ||
    maxZoom <= minZoom ||
    maxZoom > 25

  const setNumber = (key: keyof VectorSymbol, value: number | null) =>
    setSymbol((current) => ({ ...current, [key]: value ?? 0 }))
  const setColor = (key: keyof VectorSymbol, value: string) =>
    setSymbol((current) => ({ ...current, [key]: value }))

  async function save() {
    if (invalid || !etag) return
    setBusy(true)
    setError(null)
    try {
      const updated = await updateVectorLayerPresentation(
        layer.layerId,
        {
          groupId,
          styleMode: mode,
          enabled,
          ...(mode === 'CUSTOM'
            ? { customStyle: { minZoom, maxZoom, symbol } }
            : {}),
        },
        etag,
      )
      onSaved(updated.layer)
      onClose()
    } catch (cause) {
      const status = cause instanceof RequestError ? cause.status : undefined
      setError(
        status === 412 || status === 428
          ? '图层配置已变化，请关闭面板后重新加载再保存。'
          : cause instanceof Error
            ? cause.message
            : '图层配置保存失败',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer
      open
      mask={false}
      width={420}
      title="图层分类与样式"
      onClose={onClose}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {busy && <Spin size="small" />}
        {error && <Alert type="error" showIcon message={error} />}
        <label>
          目标分类
          <Select
            style={{ width: '100%', marginTop: 6 }}
            value={groupId || undefined}
            placeholder="选择同几何类型的叶子分类"
            options={candidates.map((group) => ({
              value: group.id,
              label: group.name + ' / ' + group.groupKey,
            }))}
            onChange={setGroupId}
          />
        </label>
        <label>
          样式模式
          <Select
            style={{ width: '100%', marginTop: 6 }}
            value={mode}
            options={[
              {
                value: 'INHERIT_TARGET_GROUP',
                label: '继承目标分类默认样式',
                disabled: unknownGroup,
              },
              { value: 'CUSTOM', label: '自定义样式' },
            ]}
            onChange={setMode}
          />
        </label>
        <label>
          图层显示 <Switch checked={enabled} onChange={setEnabled} />
        </label>
        {mode === 'CUSTOM' && (
          <>
            <Space>
              <label>
                起始层级
                <InputNumber
                  min={0}
                  max={18}
                  value={minZoom}
                  onChange={(v) => setMinZoom(v ?? 0)}
                />
              </label>
              <label>
                结束层级
                <InputNumber
                  min={0.5}
                  max={25}
                  value={maxZoom}
                  onChange={(v) => setMaxZoom(v ?? 25)}
                />
              </label>
            </Space>
            {layer.geometryType === 'POINT' && (
              <>
                <ColorField
                  label="点颜色"
                  value={symbol.color}
                  onChange={(v) => setColor('color', v)}
                />
                <NumberField
                  label="半径"
                  value={symbol.radius}
                  min={0.5}
                  max={12}
                  onChange={(v) => setNumber('radius', v)}
                />
              </>
            )}
            {layer.geometryType === 'LINE' && (
              <>
                <ColorField
                  label="线颜色"
                  value={symbol.color}
                  onChange={(v) => setColor('color', v)}
                />
                <NumberField
                  label="线宽"
                  value={symbol.width}
                  min={0.5}
                  max={12}
                  onChange={(v) => setNumber('width', v)}
                />
              </>
            )}
            {layer.geometryType === 'POLYGON' && (
              <>
                <ColorField
                  label="填充颜色"
                  value={symbol.fillColor}
                  onChange={(v) => setColor('fillColor', v)}
                />
                <ColorField
                  label="描边颜色"
                  value={symbol.strokeColor}
                  onChange={(v) => setColor('strokeColor', v)}
                />
              </>
            )}
            <NumberField
              label="透明度"
              value={symbol.opacity ?? symbol.fillOpacity}
              min={0}
              max={1}
              step={0.1}
              onChange={(v) =>
                setNumber(
                  layer.geometryType === 'POLYGON' ? 'fillOpacity' : 'opacity',
                  v,
                )
              }
            />
          </>
        )}
        {unknownGroup && mode === 'INHERIT_TARGET_GROUP' && (
          <Alert
            type="warning"
            showIcon
            message="未知分类必须选择自定义样式后才能启用。"
          />
        )}
        <Button
          type="primary"
          disabled={invalid}
          loading={busy}
          onClick={() => void save()}
        >
          保存分类、样式与显隐
        </Button>
      </Space>
    </Drawer>
  )
}

function ColorField(props: {
  readonly label: string
  readonly value?: string
  readonly onChange: (value: string) => void
}) {
  return (
    <label>
      {props.label}{' '}
      <input
        type="color"
        value={props.value ?? '#247BC0'}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </label>
  )
}

function NumberField(props: {
  readonly label: string
  readonly value?: number
  readonly min: number
  readonly max: number
  readonly step?: number
  readonly onChange: (value: number | null) => void
}) {
  const { label, value, min, max, step, onChange } = props
  return (
    <label>
      {label}{' '}
      <InputNumber
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
      />
    </label>
  )
}
