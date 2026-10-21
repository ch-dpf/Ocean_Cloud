import { useState } from 'react'
import { Button, Empty, Space } from 'antd'
import type { VectorRuleDraft } from '../../hooks/useVectorStyleEditor'
import {
  newStyleRule,
  GEOMETRY_OPTIONS,
} from '../VectorCartography/vectorStyle'
import { VectorStyleRuleEditor } from '../VectorStyleRuleEditor/VectorStyleRuleEditor'
import styles from '../VectorCartography/VectorCartography.module.css'
interface VectorStyleRulesProps {
  readonly rules: readonly VectorRuleDraft[]
  readonly onChange: (rules: readonly VectorRuleDraft[]) => void
}
export function VectorStyleRules({ rules, onChange }: VectorStyleRulesProps) {
  const [index, setIndex] = useState(0)
  const activeIndex = Math.min(index, Math.max(0, rules.length - 1))
  const active = rules[activeIndex]
  const move = (from: number, delta: number) => {
    const next = [...rules]
    const to = from + delta
    ;[next[from], next[to]] = [next[to], next[from]]
    setIndex(to)
    onChange(next)
  }
  const add = () => {
    let suffix = rules.length + 1
    while (rules.some((rule) => rule.id === 'rule_' + suffix)) suffix++
    onChange([
      ...rules,
      { ...newStyleRule('POINT', 'rule_' + suffix), filterText: '' },
    ])
    setIndex(rules.length)
  }
  return (
    <div className={styles.ruleFields}>
      <div className={styles.panelTitle}>
        <span>渲染规则（{rules.length}/128）</span>
        <Button size="small" disabled={rules.length >= 128} onClick={add}>
          添加规则
        </Button>
      </div>
      <p className={styles.hint}>
        按顺序使用首条匹配规则；未匹配的几何不显示。点、线、面可保留在同一图层。
      </p>
      <div className={styles.ruleList}>
        {rules.map((rule, position) => (
          <div className={styles.ruleRow} key={position}>
            <button
              className={
                position === activeIndex ? styles.activeRule : styles.ruleName
              }
              type="button"
              aria-pressed={position === activeIndex}
              onClick={() => setIndex(position)}
            >
              {position + 1}. {rule.id || '未命名'} ·{' '}
              {
                GEOMETRY_OPTIONS.find(
                  (option) => option.value === rule.geometryType,
                )?.label
              }
            </button>
            <Space size={2}>
              <Button
                size="small"
                aria-label={'上移规则 ' + rule.id}
                disabled={position === 0}
                onClick={() => move(position, -1)}
              >
                ↑
              </Button>
              <Button
                size="small"
                aria-label={'下移规则 ' + rule.id}
                disabled={position === rules.length - 1}
                onClick={() => move(position, 1)}
              >
                ↓
              </Button>
              <Button
                size="small"
                danger
                aria-label={'删除规则 ' + rule.id}
                onClick={() => onChange(rules.filter((_, i) => i !== position))}
              >
                删除
              </Button>
            </Space>
          </div>
        ))}
      </div>
      {active ? (
        <VectorStyleRuleEditor
          key={activeIndex}
          rule={active}
          onChange={(rule) =>
            onChange(rules.map((item, i) => (i === activeIndex ? rule : item)))
          }
        />
      ) : (
        <Empty description="没有规则，全部要素将隐藏" />
      )}
    </div>
  )
}
