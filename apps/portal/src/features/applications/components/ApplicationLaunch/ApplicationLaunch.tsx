import { useEffect } from 'react'
import type { MicroApplication } from '../../../../types/application'
interface ApplicationLaunchProps {
  readonly application: MicroApplication
}
export function ApplicationLaunch({ application }: ApplicationLaunchProps) {
  const canLaunch = application.enabled && application.status === 'published'
  useEffect(() => {
    if (canLaunch) window.location.replace(application.launchUrl)
  }, [canLaunch, application.launchUrl])
  return (
    <section>
      <h1>{application.name}</h1>
      <p role="status">
        {canLaunch
          ? '正在进入应用…'
          : application.enabled
            ? '应用尚未发布，请在应用管理中完成首次发布。'
            : '此应用已停用。'}
      </p>
      <a href="#/applications">返回应用中心</a>
    </section>
  )
}
