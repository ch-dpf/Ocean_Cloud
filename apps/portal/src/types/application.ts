export interface MicroApplication {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly route: string
  readonly icon: string
  readonly enabled: boolean
  readonly isListed: boolean
  readonly sourceKind: 'workspace' | 'generated'
  readonly sourceReady: boolean
  readonly activeReleaseId: string | null
  readonly status: 'creating' | 'draft' | 'published'
  readonly launchUrl: string
  readonly createdAt: string
  readonly updatedAt: string
  readonly deletedAt?: string | null
}
export type ApplicationCatalogItem = MicroApplication
export interface ApplicationInput {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly route: string
  readonly icon: string
  readonly enabled: boolean
  readonly isListed: boolean
}
export interface ApplicationTask {
  readonly id: string
  readonly appId: string
  readonly kind: 'generate' | 'publish' | 'rollback'
  readonly status: 'queued' | 'running' | 'succeeded' | 'failed'
  readonly stage: string
  readonly logs: readonly string[]
  readonly createdAt: string
  readonly finishedAt?: string
}
export interface ApplicationRelease {
  readonly id: string
  readonly createdAt: string
  readonly sourceHash: string
  readonly sourceRevision: string
}
export interface ApplicationDetail {
  readonly application: MicroApplication
  readonly sourceDirectory: string
  readonly releases: readonly ApplicationRelease[]
  readonly tasks: readonly ApplicationTask[]
}
