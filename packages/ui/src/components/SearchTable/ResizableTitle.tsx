import { Resizable } from 'react-resizable'
import type { ResizeCallbackData } from 'react-resizable'
import type { SyntheticEvent, ThHTMLAttributes } from 'react'
import styles from './SearchTable.module.css'

/** 列宽下限，避免拖到不可用 */
export const MIN_COLUMN_WIDTH = 60

interface ResizableTitleProps extends ThHTMLAttributes<HTMLTableCellElement> {
  readonly width?: number
  readonly onResize?: (event: SyntheticEvent, data: ResizeCallbackData) => void
}

/**
 * 可拖拽调宽的表头单元格：把 antd 的表头包进 react-resizable，
 * 手柄贴在单元格右边缘；没有数值宽度的列不出现手柄（无从计算基准宽度）。
 */
export function ResizableTitle({
  width,
  onResize,
  ...restProps
}: ResizableTitleProps) {
  if (typeof width !== 'number' || onResize === undefined) {
    return <th {...restProps} />
  }
  return (
    <Resizable
      width={width}
      height={0}
      axis="x"
      resizeHandles={['e']}
      handle={
        <span
          className={styles.resizeHandle}
          onClick={(event) => event.stopPropagation()}
        />
      }
      onResize={onResize}
    >
      <th {...restProps} />
    </Resizable>
  )
}
