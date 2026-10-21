import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Checkbox,
  ConfigProvider,
  Drawer,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Tag,
} from 'antd'
import { useVectorStyleEditor } from '../../hooks/useVectorStyleEditor'
import type {
  VectorFeature,
  VectorLayer,
  VectorStyleDefinition,
} from '../../types/vector'
import { VectorStyleMatch } from '../VectorStyleMatch/VectorStyleMatch'
import { VectorStyleRules } from '../VectorStyleRules/VectorStyleRules'
import styles from '../VectorCartography/VectorCartography.module.css'

interface VectorStylePanelProps {
  readonly layer: VectorLayer
  readonly feature: VectorFeature | null
  readonly zoom: number
  readonly onPreview: (definition: VectorStyleDefinition | null) => void
  readonly onPersist: () => void
  readonly onClose: () => void
}
export function VectorStylePanel({
  layer,
  feature,
  zoom,
  onPreview,
  onPersist,
  onClose,
}: VectorStylePanelProps) {
  const editor = useVectorStyleEditor(layer.layerId, onPersist)
  const [preview, setPreview] = useState(true)
  const [modal, contextHolder] = Modal.useModal()
  useEffect(() => {
    onPreview(preview && editor.ready ? editor.definition : null)
    return () => onPreview(null)
  }, [preview, editor.definition, editor.ready, onPreview])
  const discardThen = (action: () => void) => {
    if (!editor.dirty) {
      action()
      return
    }
    modal.confirm({
      title: '放弃未保存的样式修改？',
      content: '当前草稿尚未保存。',
      okText: '放弃修改',
      cancelText: '继续编辑',
      onOk: action,
    })
  }
  const selected = editor.existing?.style
  const matchingFeature = feature?.layerId === layer.layerId ? feature : null
  return (
    <Drawer
      open
      title={'图层样式 · ' + layer.layerName}
      width={560}
      mask={false}
      onClose={() => {
        if (!editor.busy) discardThen(onClose)
      }}
      footer={
        <Space wrap>
          <Button
            type="primary"
            aria-label="保存方案"
            aria-busy={editor.busy}
            loading={editor.busy}
            disabled={
              !editor.ready || !editor.name.trim() || !!editor.validationError
            }
            onClick={() => void editor.save()}
          >
            保存方案
          </Button>
          <Button
            aria-label="关闭"
            disabled={editor.busy}
            onClick={() => discardThen(onClose)}
          >
            关闭
          </Button>
        </Space>
      }
    >
      {contextHolder}
      <div className={styles.ruleFields}>
        {editor.busy && <Spin size="small" />}
        {editor.error && <Alert type="error" showIcon message={editor.error} />}
        {editor.notice && (
          <Alert type="success" showIcon message={editor.notice} />
        )}
        <Space wrap>
          <Select
            aria-label="样式方案"
            style={{ width: 280 }}
            placeholder="新方案"
            value={selected?.styleId}
            disabled={editor.busy}
            options={editor.summaries.map((item) => ({
              value: item.styleId,
              label: item.name + (item.isDefault ? '（默认）' : ''),
            }))}
            onChange={(id) => discardThen(() => void editor.select(id))}
          />
          <Button
            disabled={editor.busy}
            onClick={() => discardThen(() => void editor.reload())}
          >
            重新加载
          </Button>
        </Space>
        <Space wrap>
          <Button
            disabled={editor.busy}
            onClick={() => discardThen(() => editor.createDraft(false))}
          >
            新建方案
          </Button>
          <Button
            disabled={editor.busy || !editor.ready}
            onClick={() => editor.createDraft(true)}
          >
            另存为新方案
          </Button>
          <Button
            disabled={
              editor.busy || !selected || selected.isDefault || editor.dirty
            }
            onClick={() => void editor.makeDefault()}
          >
            设为默认
          </Button>
          <Popconfirm
            title="删除此样式方案？"
            description="删除后无法恢复。"
            okText="删除"
            cancelText="取消"
            onConfirm={() => void editor.remove()}
          >
            <Button
              danger
              disabled={
                editor.busy || !selected || selected.isDefault || editor.dirty
              }
            >
              删除方案
            </Button>
          </Popconfirm>
        </Space>
        {selected?.isDefault && <Tag color="blue">图层默认方案</Tag>}
        <Checkbox
          checked={preview}
          onChange={(event) => setPreview(event.target.checked)}
        >
          在地图预览当前草稿
        </Checkbox>
        <p className={styles.hint}>
          预览仅作用于当前工作区。设为默认后，下次进入图层将应用此方案。关闭编辑会恢复默认方案。
        </p>
        {editor.ready && (
          <ConfigProvider componentDisabled={editor.busy}>
            <fieldset className={styles.editorFields} disabled={editor.busy}>
              <label className={styles.ruleFields}>
                方案名称
                <Input
                  aria-label="方案名称"
                  maxLength={100}
                  value={editor.name}
                  onChange={(event) => editor.setName(event.target.value)}
                />
              </label>
              {editor.validationError && (
                <Alert
                  type="warning"
                  showIcon
                  message={editor.validationError}
                />
              )}
              <VectorStyleRules
                key={selected?.styleId ?? 'new'}
                rules={editor.rules}
                onChange={editor.setRules}
              />
            </fieldset>
          </ConfigProvider>
        )}
        <VectorStyleMatch
          feature={matchingFeature}
          zoom={zoom}
          result={editor.serverMatch}
          styleVersion={selected?.version}
          busy={editor.busy}
          dirty={editor.dirty}
          canVerify={!!selected}
          onVerify={editor.verify}
        />
      </div>
    </Drawer>
  )
}
