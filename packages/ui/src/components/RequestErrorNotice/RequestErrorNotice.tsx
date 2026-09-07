import { useEffect, useState } from 'react'
import type { HttpClient, RequestError } from '@ocean-cloud/http'
import styles from './RequestErrorNotice.module.css'
interface RequestErrorNoticeProps {
  readonly client: HttpClient
}
export function RequestErrorNotice({ client }: RequestErrorNoticeProps) {
  const [error, setError] = useState<RequestError | null>(null)
  useEffect(() => client.onError(setError), [client])
  if (!error) return null
  return (
    <div className={styles.notice} role="alert">
      <span>{error.message}</span>
      <button
        type="button"
        aria-label="关闭错误提示"
        onClick={() => setError(null)}
      >
        ×
      </button>
    </div>
  )
}
