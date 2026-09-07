import { useState } from 'react'
import type { ApplicationTask } from '../../../../types/application'
import styles from './ApplicationTasks.module.css'
interface ApplicationTasksProps {
  readonly tasks: readonly ApplicationTask[]
}
const KIND = { generate: '工程生成', publish: '构建发布', rollback: '版本回滚' }
const STATUS = {
  queued: '排队中',
  running: '执行中',
  succeeded: '成功',
  failed: '失败',
}
export function ApplicationTasks({ tasks }: ApplicationTasksProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = tasks.find((task) => task.id === selectedId) || tasks[0]
  return (
    <section className={styles.section}>
      <h3>任务与执行日志</h3>
      {!tasks.length ? (
        <p>暂无执行记录。</p>
      ) : (
        <>
          <div className={styles.tasks}>
            {tasks.map((task) => (
              <button
                key={task.id}
                className={selected?.id === task.id ? styles.selected : ''}
                onClick={() => setSelectedId(task.id)}
              >
                <span>{KIND[task.kind]}</span>
                <span data-status={task.status}>{STATUS[task.status]}</span>
                <small>{new Date(task.createdAt).toLocaleString()}</small>
              </button>
            ))}
          </div>
          {selected && (
            <>
              <p className={styles.stage} role="status">
                {selected.stage}
              </p>
              <pre className={styles.logs} aria-label="任务日志">
                {selected.logs.join('\n') || '等待执行…'}
              </pre>
            </>
          )}
        </>
      )}
    </section>
  )
}
