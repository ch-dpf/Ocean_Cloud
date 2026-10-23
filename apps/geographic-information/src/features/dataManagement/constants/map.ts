/** OSM 标准瓦片地址：Web 墨卡托 XYZ 规则，256px 瓦片，{z}/{x}/{y}.png */
export const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

/** 本地发布影像底图，使用与 OSM 相同的 XYZ 瓦片规则 */
export const LOCAL_TILE_URL =
  'http://192.168.14.65:8090/gis/publications/IMAGERY/IMG_BA9590FA78774A86976B/{z}/{x}/{y}.png'

export type BasemapMode = 'osm' | 'local' | 'off'
