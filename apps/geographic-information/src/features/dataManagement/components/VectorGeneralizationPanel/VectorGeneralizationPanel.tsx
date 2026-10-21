import { useState } from 'react'
import {
  Alert,
  Button,
  Drawer,
  Input,
  InputNumber,
  Modal,
  Progress,
  Select,
  Switch,
  Typography,
} from 'antd'
import {
  useVectorGeneralization,
  parseGeneralizationPolicy,
  generalizationPreset,
} from '../../hooks/useVectorGeneralization'
import type {
  VectorGeneralizationPolicy,
  VectorLayer,
} from '../../types/vector'
import styles from './VectorGeneralizationPanel.module.css'

interface Props {
  readonly layer: VectorLayer | undefined
  readonly disabled: boolean
  readonly onChange: () => void
}
const statusNames: Readonly<Record<string, string>> = {
  QUEUED: '等待构建',
  RUNNING: '正在构建',
  READY: '已发布',
  FAILED: '构建失败',
  SUPERSEDED: '源数据已更新',
}
export function VectorGeneralizationPanel({
  layer,
  disabled,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false)
  const [modal, contextHolder] = Modal.useModal()
  const editor = useVectorGeneralization(
    open ? layer?.layerId : undefined,
    onChange,
  )
  const policy = parseGeneralizationPolicy(editor.draft)
  const update = (values: Partial<VectorGeneralizationPolicy>) => {
    if (policy)
      editor.setDraft(JSON.stringify({ ...policy, ...values }, null, 2))
  }
  const preset = (value: string) => {
    if (policy) update(generalizationPreset(policy, value))
  }
  const dirty =
    !!editor.state &&
    editor.draft !== JSON.stringify(editor.state.policy, null, 2)
  const close = () =>
    dirty
      ? modal.confirm({
          title: '放弃尚未保存的概化策略？',
          onOk: () => setOpen(false),
        })
      : setOpen(false)
  const build = editor.state?.latestBuild
  return (
    <>
      {contextHolder}
      <Button disabled={!layer || disabled} onClick={() => setOpen(true)}>
        管理多尺度概览
      </Button>
      <Drawer
        open={open}
        title={'多尺度概览 · ' + (layer?.layerName ?? '')}
        width={560}
        onClose={close}
        destroyOnHidden
        mask={false}
      >
        <div className={styles.content}>
          <p className={styles.note}>
            低层级使用概化显示，放大后查看明细。点击概化对象可展开原始成员并编辑。
          </p>
          {editor.error && (
            <Alert type="error" showIcon message={editor.error} />
          )}
          {build && (
            <>
              <Typography.Text>
                {statusNames[build.status] ?? build.status} · 数据版本{' '}
                {build.dataVersion}
              </Typography.Text>
              <Progress
                percent={editor.progress}
                status={editor.progressStatus}
              />
              {build.errorMessage && (
                <Alert type="warning" message={build.errorMessage} />
              )}
            </>
          )}
          {editor.state?.publishedBuild && (
            <Typography.Text type="secondary">
              已发布数据版本 {editor.state.publishedBuild.dataVersion}
              ；校验最大瓦片{' '}
              {(editor.state.publishedBuild.maxTileBytes / 1024).toFixed(0)} KiB
            </Typography.Text>
          )}
          {policy && (
            <>
              <label>
                启用多尺度概览{' '}
                <Switch
                  aria-label="启用多尺度概览"
                  checked={policy.enabled}
                  onChange={(enabled) => update({ enabled })}
                />
              </label>
              <label>
                选择策略预设
                <Select
                  aria-label="概化策略预设"
                  placeholder="选择后仍可调整参数"
                  onChange={preset}
                  options={[
                    { value: 'GENERIC', label: '通用几何' },
                    { value: 'ROADS', label: '道路等级' },
                    { value: 'WATERWAYS', label: '水系等级' },
                    { value: 'BUILDINGS', label: '建筑密度与建筑组' },
                    { value: 'COVERAGE', label: '共享边界覆盖面' },
                  ]}
                />
              </label>
              <label>
                明细起始层级{' '}
                <InputNumber
                  aria-label="明细起始层级"
                  min={1}
                  max={16}
                  value={policy.detailMinZoom}
                  onChange={(value) =>
                    value !== null && update({ detailMinZoom: value })
                  }
                />
              </label>
              <label>
                概览分组字段
                <Select
                  aria-label="概览分组字段"
                  mode="tags"
                  value={[...policy.groupFields]}
                  onChange={(groupFields: string[]) => update({ groupFields })}
                />
              </label>
              {policy.polygonMode === 'BUILDINGS' && (
                <Alert
                  type="info"
                  message="Z0–8使用建筑密度网格；更高概览层级使用按距离聚合的建筑组。网格边界不代表真实建筑边界。"
                />
              )}
              {policy.lineClassField && (
                <Typography.Text type="secondary">
                  当前等级字段：{policy.lineClassField}。道路、水系预设使用
                  fclass，可在下方策略中调整字段及各类别在概览中的起始层级；进入明细后由样式规则控制。
                </Typography.Text>
              )}
            </>
          )}
          <label>
            完整策略 JSON
            <Input.TextArea
              aria-label="概化策略 JSON"
              rows={14}
              value={editor.draft}
              onChange={(event) => editor.setDraft(event.target.value)}
              spellCheck={false}
            />
          </label>
          <div className={styles.actions}>
            <Button
              type="primary"
              loading={editor.busy}
              disabled={!policy}
              onClick={editor.save}
            >
              保存并构建
            </Button>
            <Button
              disabled={editor.busy || dirty || !editor.state?.policy.enabled}
              onClick={editor.rebuild}
            >
              重新构建
            </Button>
            <Button
              disabled={editor.busy}
              onClick={() =>
                dirty
                  ? modal.confirm({
                      title: '重新加载会放弃当前草稿',
                      onOk: editor.reload,
                    })
                  : editor.reload()
              }
            >
              重新加载
            </Button>
          </div>
        </div>
      </Drawer>
    </>
  )
}
