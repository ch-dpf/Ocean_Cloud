import { SubsystemHome } from '@ocean-cloud/ui'
import type { SubsystemNavigation } from '@ocean-cloud/ui'
export function GeographicInformationPage(navigation: SubsystemNavigation) {
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
