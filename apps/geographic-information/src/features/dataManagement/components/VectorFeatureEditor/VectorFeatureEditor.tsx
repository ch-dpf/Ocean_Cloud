import { useState } from 'react'
import {
  Alert,
  Button,
  Drawer,
  Input,
  Modal,
  Popconfirm,
  Space,
  Typography,
} from 'antd'
import type { VectorFeature } from '../../types/vector'
import {
  geometryHasZ,
  validateVectorGeometry,
} from '../VectorCartography/vectorTileSource'

interface Props {
  readonly original: VectorFeature
  readonly draft: VectorFeature
  readonly busy: boolean
  readonly error: string | null
  readonly onChange: (feature: VectorFeature) => void
  readonly onSave: (feature: VectorFeature) => Promise<boolean>
  readonly onDelete: () => Promise<boolean>
  readonly onClose: () => void
}
const pretty = (value: unknown) => JSON.stringify(value, null, 2)
function parseDraft(
  original: VectorFeature,
  properties: string,
  geometry: string,
): VectorFeature {
  const attrs: unknown = JSON.parse(properties)
  const geom: unknown = JSON.parse(geometry)
  if (attrs !== null && (typeof attrs !== 'object' || Array.isArray(attrs)))
    throw new Error('属性必须为 JSON 对象或 null')
  if (
    !geom ||
    typeof geom !== 'object' ||
    !('type' in geom) ||
    typeof geom.type !== 'string'
  )
    throw new Error('几何必须为 GeoJSON Geometry')
  validateVectorGeometry(geom)
  return {
    ...original,
    properties: attrs as VectorFeature['properties'],
    geometry: geom,
  }
}
/** 只对单个完整原始要素编辑；无效输入和 412 冲突均保留在抽屉中。 */
export function VectorFeatureEditor({
  original,
  draft,
  busy,
  error,
  onChange,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [attributes, setAttributes] = useState(pretty(draft.properties))
  const [geometryText, setGeometryText] = useState({
    base: draft.geometry,
    text: pretty(draft.geometry),
  })
  const [validation, setValidation] = useState<string | null>(null)
  const geometry =
    geometryText.base === draft.geometry
      ? geometryText.text
      : pretty(draft.geometry)
  const close = () => {
    if (busy) return
    if (
      attributes === pretty(original.properties) &&
      geometry === pretty(original.geometry)
    ) {
      onClose()
      return
    }
    Modal.confirm({
      title: '放弃要素草稿？',
      content: '未保存的属性和几何修改将被清除。',
      okText: '放弃',
      cancelText: '继续编辑',
      onOk: onClose,
    })
  }
  const update = (attrs: string, geom: string) => {
    try {
      onChange(parseDraft(draft, attrs, geom))
      setValidation(null)
    } catch (cause) {
      setValidation(cause instanceof Error ? cause.message : 'JSON 无效')
    }
  }
  const save = async () => {
    try {
      const value = parseDraft(draft, attributes, geometry)
      setValidation(null)
      if (await onSave(value)) onClose()
    } catch (cause) {
      setValidation(cause instanceof Error ? cause.message : '保存失败')
    }
  }
  return (
    <Drawer
      open
      title="编辑原始要素"
      width={460}
      mask={false}
      onClose={close}
      closable={!busy}
      footer={
        <Space>
          <Button
            aria-label="保存要素"
            type="primary"
            loading={busy}
            onClick={() => void save()}
          >
            保存要素
          </Button>
          <Button disabled={busy} onClick={close}>
            取消
          </Button>
          <Popconfirm
            title="删除原始要素？"
            description="删除后需要重新导入才能恢复。"
            onConfirm={async () => {
              if (await onDelete()) onClose()
            }}
          >
            <Button danger disabled={busy}>
              删除要素
            </Button>
          </Popconfirm>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Typography.Text>ID：{original.id}</Typography.Text>
        <Alert
          type="info"
          showIcon
          message="修改完整属性与原始几何"
          description={
            geometryHasZ(draft.geometry)
              ? 'XYZ 顶点可在地图拖动；插入新顶点请在几何 JSON 中明确填写高程。'
              : '拖动地图顶点或编辑几何 JSON。属性为完整替换，保留需要的字段。'
          }
        />
        {(validation || error) && (
          <Alert type="error" showIcon message={validation ?? error} />
        )}
        <label htmlFor="vector-feature-properties">要素属性 JSON</label>
        <Input.TextArea
          id="vector-feature-properties"
          aria-label="要素属性 JSON"
          rows={8}
          disabled={busy}
          value={attributes}
          onChange={(event) => {
            setAttributes(event.target.value)
            update(event.target.value, geometry)
          }}
        />
        <label htmlFor="vector-feature-geometry">原始几何 JSON</label>
        <Input.TextArea
          id="vector-feature-geometry"
          aria-label="原始几何 JSON"
          rows={10}
          disabled={busy}
          value={geometry}
          onChange={(event) => {
            setGeometryText({ base: draft.geometry, text: event.target.value })
            update(attributes, event.target.value)
          }}
        />
      </Space>
    </Drawer>
  )
}
