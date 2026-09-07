import { SubsystemHome } from '@ocean-cloud/ui'
import type { SubsystemNavigation } from '@ocean-cloud/ui'
export function MarineInformationPage(navigation: SubsystemNavigation) {
  return (
    <SubsystemHome
      {...navigation}
      title="海洋信息"
      eyebrow="MARINE INFORMATION"
      description="汇聚海洋信息，构建面向海洋业务的工作空间。"
      tone="marine"
    />
  )
}
