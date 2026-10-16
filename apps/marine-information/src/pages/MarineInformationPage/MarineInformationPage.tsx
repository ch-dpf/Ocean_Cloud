import { SubsystemHome } from '@ocean-cloud/ui'
import type { SubsystemNavigation } from '@ocean-cloud/ui'
type MarineInformationPageProps = SubsystemNavigation & {
  readonly showChrome?: boolean
}
export function MarineInformationPage(navigation: MarineInformationPageProps) {
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
