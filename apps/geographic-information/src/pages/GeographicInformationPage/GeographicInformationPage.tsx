import { SubsystemHome } from '@ocean-cloud/ui'
import type { SubsystemNavigation } from '@ocean-cloud/ui'
type GeographicInformationPageProps = SubsystemNavigation & {
  readonly showChrome?: boolean
}
export function GeographicInformationPage(
  navigation: GeographicInformationPageProps,
) {
  return (
    <SubsystemHome
      {...navigation}
      title="地理信息"
      eyebrow="GEOGRAPHIC INFORMATION"
      description="连接地图与空间数据，构建地理信息工作空间。"
      tone="geographic"
    />
  )
}
