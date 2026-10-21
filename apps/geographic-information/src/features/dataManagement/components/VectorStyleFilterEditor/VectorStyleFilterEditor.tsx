import { Button, Input, InputNumber, Select, Space } from 'antd'
import type { VectorFilter } from '../../types/vector'
import styles from '../VectorCartography/VectorCartography.module.css'

interface VectorStyleFilterEditorProps {
  readonly value: string
  readonly onChange: (value: string) => void
}
type Leaf = Extract<VectorFilter, { readonly field: string }>
const operators = [
  { value: 'eq', label: '等于' },
  { value: 'ne', label: '不等于' },
  { value: 'gt', label: '大于' },
  { value: 'gte', label: '大于等于' },
  { value: 'lt', label: '小于' },
  { value: 'lte', label: '小于等于' },
  { value: 'exists', label: '字段存在 / 缺失' },
]
function parse(value: string): Leaf | null {
  try {
    const result = JSON.parse(value) as Leaf
    return result &&
      typeof result === 'object' &&
      'field' in result &&
      operators.some((item) => item.value === result.op)
      ? result
      : null
  } catch {
    return null
  }
}
export function VectorStyleFilterEditor({
  value,
  onChange,
}: VectorStyleFilterEditorProps) {
  const leaf = parse(value)
  const advanced = !!value && !leaf
  const update = (patch: Partial<Leaf>) =>
    onChange(JSON.stringify({ ...leaf, ...patch }, null, 2))
  const numeric = leaf && ['gt', 'gte', 'lt', 'lte'].includes(leaf.op)
  const valueType = leaf?.value === null ? 'null' : typeof leaf?.value
  return (
    <div className={styles.ruleFields}>
      <div className={styles.panelTitle}>属性条件</div>
      <Space wrap>
        <Select
          aria-label="属性条件模式"
          value={!value ? 'all' : advanced ? 'advanced' : 'simple'}
          options={[
            { value: 'all', label: '全部要素' },
            { value: 'simple', label: '单个条件' },
            { value: 'advanced', label: '组合 / 包含条件' },
          ]}
          onChange={(mode) => {
            onChange(
              mode === 'all'
                ? ''
                : mode === 'simple'
                  ? JSON.stringify({ op: 'eq', field: '', value: '' })
                  : JSON.stringify(
                      {
                        op: 'and',
                        conditions: [
                          { op: 'eq', field: 'type', value: '港口' },
                        ],
                      },
                      null,
                      2,
                    ),
            )
          }}
        />
        {value && (
          <Button size="small" onClick={() => onChange('')}>
            清除条件
          </Button>
        )}
      </Space>
      {value && !advanced && leaf && (
        <>
          <Input
            aria-label="属性字段"
            placeholder="属性字段（如 type，区分大小写）"
            maxLength={255}
            value={leaf.field}
            onChange={(event) => update({ field: event.target.value })}
          />
          <Select
            aria-label="属性运算符"
            value={leaf.op}
            options={operators}
            onChange={(op: Leaf['op']) =>
              update({
                op,
                value:
                  op === 'exists'
                    ? true
                    : ['gt', 'gte', 'lt', 'lte'].includes(op)
                      ? 0
                      : '',
              })
            }
          />
          {leaf.op === 'exists' ? (
            <Select
              aria-label="字段存在性"
              value={leaf.value === false ? 'missing' : 'exists'}
              options={[
                { value: 'exists', label: '字段存在（包括空值）' },
                { value: 'missing', label: '字段缺失' },
              ]}
              onChange={(next) => update({ value: next === 'exists' })}
            />
          ) : (
            <Space wrap>
              {!numeric && (
                <Select
                  aria-label="比较值类型"
                  value={valueType}
                  options={[
                    { value: 'string', label: '文本' },
                    { value: 'number', label: '数字' },
                    { value: 'boolean', label: '布尔值' },
                    { value: 'null', label: '空值' },
                  ]}
                  onChange={(next) =>
                    update({
                      value:
                        next === 'number'
                          ? 0
                          : next === 'boolean'
                            ? true
                            : next === 'null'
                              ? null
                              : '',
                    })
                  }
                />
              )}
              {valueType === 'number' ? (
                <InputNumber
                  aria-label="比较数字"
                  value={Number(leaf.value)}
                  onChange={(next) => {
                    if (next !== null) update({ value: next })
                  }}
                />
              ) : valueType === 'boolean' ? (
                <Select
                  aria-label="比较布尔值"
                  value={leaf.value ? 'true' : 'false'}
                  options={[
                    { value: 'true', label: 'true' },
                    { value: 'false', label: 'false' },
                  ]}
                  onChange={(next) => update({ value: next === 'true' })}
                />
              ) : valueType === 'string' ? (
                <Input
                  aria-label="比较文本"
                  maxLength={4096}
                  value={String(leaf.value)}
                  onChange={(event) => update({ value: event.target.value })}
                />
              ) : (
                <span>空值 null</span>
              )}
            </Space>
          )}
          <p className={styles.hint}>
            字段名按原名匹配；文本“1”与数字 1 不相等。字段缺失不满足“不等于”。
          </p>
        </>
      )}
      {value && advanced && (
        <>
          <Input.TextArea
            aria-label="组合属性条件 JSON"
            autoSize={{ minRows: 5, maxRows: 14 }}
            spellCheck={false}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
          <p className={styles.hint}>
            组合条件使用 and / or 与 conditions；包含条件例如：
            {'{"op":"in","field":"type","value":["港口","码头"]}'}
          </p>
        </>
      )}
    </div>
  )
}
