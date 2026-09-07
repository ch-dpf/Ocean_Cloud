export type ResourceKind = 'imagery' | 'vector' | 'terrain'
export type ResourceKindFilter = ResourceKind | 'all'
export interface ResourceRecord {
  readonly id: string
  readonly name: string
  readonly kind: ResourceKind
  readonly format: string
  readonly sizeLabel: string
  readonly updatedAt: string
  readonly description: string
}
