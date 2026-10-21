import { ColorPicker, Input, InputNumber, Select, Switch } from 'antd'
import type { VectorGeometryType, VectorSymbol } from '../../types/vector'
import type { VectorRuleDraft } from '../../hooks/useVectorStyleEditor'
import {
  newStyleRule,
  GEOMETRY_OPTIONS,
} from '../VectorCartography/vectorStyle'
import { VectorStyleFilterEditor } from '../VectorStyleFilterEditor/VectorStyleFilterEditor'
import styles from '../VectorCartography/VectorCartography.module.css'

interface VectorStyleRuleEditorProps {
  readonly rule: VectorRuleDraft
  readonly onChange: (rule: VectorRuleDraft) => void
}
export function VectorStyleRuleEditor({
  rule,
  onChange,
}: VectorStyleRuleEditorProps) {
  const update = (patch: Partial<VectorRuleDraft>) =>
    onChange({ ...rule, ...patch })
  const symbol = rule.symbol ?? newStyleRule(rule.geometryType, rule.id).symbol!
  const changeSymbol = (key: keyof VectorSymbol, value: string | number) =>
    update({ symbol: { ...symbol, [key]: value } })
  const colors: readonly (readonly [keyof VectorSymbol, string])[] =
    rule.geometryType === 'POLYGON'
      ? [
          ['fillColor', '填充颜色'],
          ['strokeColor', '描边颜色'],
        ]
      : rule.geometryType === 'POINT'
        ? [
            ['color', '颜色'],
            ['strokeColor', '描边颜色'],
          ]
        : [['color', '颜色']]
  const numbers: readonly (readonly [
    keyof VectorSymbol,
    string,
    number,
    number,
    number,
  ])[] =
    rule.geometryType === 'POLYGON'
      ? [
          ['fillOpacity', '填充透明度', 0, 1, 0.25],
          ['strokeWidth', '描边宽度（像素）', 0, 1024, 1],
          ['strokeOpacity', '描边透明度', 0, 1, 1],
        ]
      : rule.geometryType === 'POINT'
        ? [
            ['radius', '半径（像素）', 0.1, 1024, 6],
            ['opacity', '透明度', 0, 1, 1],
            ['strokeWidth', '描边宽度（像素）', 0, 1024, 0],
          ]
        : [
            ['width', '线宽（像素）', 0.1, 1024, 2],
            ['opacity', '透明度', 0, 1, 1],
          ]
  return (
    <div className={styles.ruleFields}>
      <label className={styles.ruleFields}>
        规则标识
        <Input
          aria-label="规则标识"
          value={rule.id}
          maxLength={64}
          onChange={(event) => update({ id: event.target.value })}
          placeholder="字母、数字、下划线、连字符"
        />
      </label>
      <div className={styles.styleField}>
        <span>几何类型</span>
        <Select
          aria-label="规则几何类型"
          value={rule.geometryType}
          options={GEOMETRY_OPTIONS}
          onChange={(geometryType: VectorGeometryType) =>
            update({
              geometryType,
              symbol: newStyleRule(geometryType, rule.id).symbol,
            })
          }
        />
      </div>
      <div className={styles.styleField}>
        <span>匹配后显示</span>
        <Switch
          aria-label="匹配后显示"
          checked={rule.visible !== false}
          onChange={(visible) =>
            update({ visible, symbol: visible ? symbol : rule.symbol })
          }
        />
      </div>
      <div className={styles.styleField}>
        <span>起始层级（含）</span>
        <InputNumber
          aria-label="起始层级"
          min={0}
          value={rule.minZoom}
          placeholder="不限"
          onChange={(minZoom) => update({ minZoom })}
        />
      </div>
      <div className={styles.styleField}>
        <span>结束层级（不含）</span>
        <InputNumber
          aria-label="结束层级"
          min={0}
          value={rule.maxZoom}
          placeholder="不限"
          onChange={(maxZoom) => update({ maxZoom })}
        />
      </div>
      <VectorStyleFilterEditor
        value={rule.filterText}
        onChange={(filterText) => update({ filterText })}
      />
      {rule.visible !== false ? (
        <>
          <div className={styles.panelTitle}>符号</div>
          {colors.map(([key, label]) => (
            <div className={styles.styleField} key={key}>
              <span>{label}</span>
              <ColorPicker
                aria-label={label}
                disabledAlpha
                value={String(
                  symbol[key] ?? symbol.fillColor ?? symbol.color ?? '#3388ff',
                )}
                showText
                onChange={(color) => changeSymbol(key, color.toHexString())}
              />
            </div>
          ))}
          {numbers.map(([key, label, min, max, fallback]) => (
            <div className={styles.styleField} key={key}>
              <span>{label}</span>
              <InputNumber
                aria-label={label}
                min={min}
                max={max}
                step={max === 1 ? 0.05 : 1}
                value={Number(symbol[key] ?? fallback)}
                onChange={(value) => {
                  if (value !== null) changeSymbol(key, value)
                }}
              />
            </div>
          ))}
        </>
      ) : (
        <p className={styles.hint}>
          该规则命中后隐藏要素，并停止匹配后续规则。
        </p>
      )}
    </div>
  )
}
