/** 数据集内各类文件的统计，计数按后端序列化契约使用字符串 */
export interface DatasetFileSummary {
  readonly dataSetId: string
  /** 已纳管文件数 */
  readonly managedFileCount: string
  /** 已登记可用轮廓的文件数 */
  readonly footprintFileCount: string
  /** 空间元数据提取失败 / 待提取 / 不适用（无空间信息）的文件数 */
  readonly failedMetadataFileCount: string
  readonly pendingMetadataFileCount: string
  readonly notApplicableFileCount: string
}

/**
 * 数据集内某个文件的中心点：分页接口直接带回，卡片地图用它定位（不需要额外的轮廓请求）。
 * 点的经纬度即该文件覆盖范围的几何中心
 */
export interface DatasetFilePoint {
  readonly dataSetId: string
  readonly fileId: string
  readonly fileName: string
  readonly layerKey: string
  readonly extentKind: string
  readonly longitude: number
  readonly latitude: number
}

/**
 * 轮廓要素：后端按 GeoJSON 返回，这里只约束到能交给 OpenLayers 解析器为止，
 * coordinates 的层级随几何类型变化，不做逐层建模
 */
export interface FootprintFeature {
  readonly type: 'Feature'
  readonly id?: string
  readonly geometry: {
    readonly type: string
    readonly coordinates: unknown
  }
}

/** 数据集内各文件的覆盖范围，GeoJSON FeatureCollection */
export interface DatasetFootprints {
  readonly type: 'FeatureCollection'
  readonly features: readonly FootprintFeature[]
}

/** 数据集记录 */
export interface GeoDataset {
  readonly id: string
  readonly dataSetCode: string
  readonly dataSetName: string
  readonly description: string
  readonly categoryId: string
  readonly fileCount: number
  readonly createTime: string
  readonly updateTime: string
  /** 矢量数据集详情返回的默认样式快照摘要；列表和创建响应可能不返回。 */
  readonly vectorStyle?: DatasetVectorStyleSummary | null
  /** 数据集内文件总大小（字节，字符串）；仅在分页接口返回 */
  readonly totalSizeBytes?: string
  /** 文件统计；仅在分页接口返回 */
  readonly fileSummary?: DatasetFileSummary | null
  /** 各文件中心点；分页接口直接返回，卡片地图用它直接画点 */
  readonly filePoints?: readonly DatasetFilePoint[] | null
}

export interface DatasetVectorStyleSummary {
  readonly snapshotId: string
  readonly templateId: string
  readonly templateVersion: string | number
  readonly styleVersion: string | number
  readonly dataRevision: string | number
  readonly displayRevision: string | number
}

/** 新增数据集的提交内容，记录 id 由后端生成 */
export interface DatasetCreateInput {
  readonly dataSetName: string
  readonly categoryId: number
  readonly description: string
}

/** 分页查询条件（/dataSet/page）；dataSetName 为名称模糊匹配关键字 */
export interface DatasetPageQuery {
  readonly current: number
  readonly size: number
  readonly categoryId?: number
  readonly dataSetName?: string
}

/** 数据集分页结果，分页字段由后端以字符串返回 */
export interface GeoDatasetPage {
  readonly current: string
  readonly size: string
  readonly total: string
  readonly records: readonly GeoDataset[]
}

/**
 * 修改数据集的提交内容：只允许改名称与描述。
 * 分类不可变更，但接口仍要求回传，因此按原值提交；
 * id 用列表接口返回的原始字符串，避免 int64 转数字丢精度。
 */
export interface DatasetUpdateInput {
  readonly id: string
  readonly dataSetName: string
  readonly categoryId: number
  readonly description: string
}
