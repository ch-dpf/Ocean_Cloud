import type { MicroApplicationId } from '@ocean-cloud/bridge'
interface ApplicationMetadata {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly icon: string
  readonly category: string
}
export interface MicroApplication extends ApplicationMetadata {
  readonly id: MicroApplicationId
  readonly status: 'available'
  readonly path: string
  readonly url: string
}
export interface PlannedApplication extends ApplicationMetadata {
  readonly status: 'planned'
}
export type ApplicationCatalogItem = MicroApplication | PlannedApplication
