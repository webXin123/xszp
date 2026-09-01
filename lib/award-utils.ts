import indicatorsData from "./data/award-card-indicators.json"
import type { AwardIndicatorGroup, AwardIndicatorLevel2 } from "./types"

/** 与 next.config.mjs 的 basePath 保持一致（GitHub Pages 部署在子路径 /mzlg/ 下） */
const BASE_PATH = "/mzlg"

/** 原始数据中的图片路径以 /images/... 开头，静态导出子路径部署时需补全前缀 */
const withBasePath = (image: string | null | undefined) =>
  image ? `${BASE_PATH}${image}` : null

export const AWARD_GROUPS = (indicatorsData as AwardIndicatorGroup[]).map((g) => ({
  ...g,
  items: g.items.map((item) => ({
    ...item,
    image: withBasePath(item.image),
  })),
})) as AwardIndicatorGroup[]

export function getAwardGroup(level1: string) {
  return AWARD_GROUPS.find((g) => g.level1 === level1)
}

export const AWARD_LEVEL1_LIST = AWARD_GROUPS.map((g) => g.level1)

export function getAwardIndicator(id: string): AwardIndicatorLevel2 | undefined {
  for (const group of AWARD_GROUPS) {
    const item = group.items.find((i) => i.id === id)
    if (item) return item
  }
  return undefined
}
