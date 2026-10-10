import indicatorsData from "./data/award-card-indicators.json"
import type { AwardIndicatorGroup, AwardIndicatorLevel3 } from "./types"

/** 与 next.config.mjs 的 basePath 保持一致（项目部署在子路径 /xszp/ 下） */
const BASE_PATH = "/xszp"

/** 原始数据中的图片路径以 /images/... 开头，静态导出子路径部署时需补全前缀 */
const withBasePath = (image: string | null | undefined) =>
  image ? `${BASE_PATH}${image}` : null

type AwardCardSourceGroup = {
  level1: string
  items: Array<Omit<AwardIndicatorLevel3, "level3"> & { level2: string }>
}

/** 奖卡五育一级指标。 */
export const AWARD_LEVEL1_LIST = ["德育", "智育", "体育", "美育", "劳育"] as const

/** 奖卡二级指标归入对应五育维度。 */
const AWARD_LEVEL2_TO_FIVE_EDUCATION: Record<string, (typeof AWARD_LEVEL1_LIST)[number]> = {
  "公共责任": "德育",
  "友善交往": "德育",
  "深度学习": "智育",
  "探究实践": "智育",
  "运动习惯": "体育",
  "安全素养": "体育",
  "审美发现": "美育",
  "创意表达": "美育",
  "实践创造": "劳育",
  "生活自理": "劳育",
  // 历史记录兼容别名；新发放流程只使用上面的新指标。
  "友善美少年": "德育",
  "家国红五星": "德育",
  "责任担当星": "德育",
  "智慧小博士": "智育",
  "小小工程师": "智育",
  "自信创造星": "智育",
  "健康小能手": "体育",
  "才艺智多星": "美育",
  "合作创享星": "劳育",
  "生活阳光星": "劳育",
}

/** 将历史奖卡/荣誉记录中的旧一级指标归并至当前五育一级指标。 */
export function getFiveEducationLevel1(level1: string) {
  if (AWARD_LEVEL1_LIST.includes(level1 as (typeof AWARD_LEVEL1_LIST)[number])) return level1
  return AWARD_LEVEL2_TO_FIVE_EDUCATION[level1] ?? level1
}

const sourceGroups = indicatorsData as AwardCardSourceGroup[]

const toAwardIndicator = (item: AwardCardSourceGroup["items"][number]): AwardIndicatorLevel3 => ({
  id: item.id,
  level3: item.level2,
  description: item.description,
  points: item.points,
  image: withBasePath(item.image),
})

/** 线上奖卡发放保留二级指标分组，便于快速选择三级奖卡。 */
export const AWARD_CARD_ISSUE_GROUPS = sourceGroups.map((group) => ({
  level1: group.level1,
  items: group.items.map(toAwardIndicator),
}))

export const AWARD_CARD_ISSUE_LEVEL1_LIST = AWARD_CARD_ISSUE_GROUPS.map((group) => group.level1)

export const AWARD_GROUPS: AwardIndicatorGroup[] = AWARD_LEVEL1_LIST.map((level1) => ({
  level1,
  items: sourceGroups
    .filter((group) => AWARD_LEVEL2_TO_FIVE_EDUCATION[group.level1] === level1)
    .map((group) => ({
      level2: group.level1,
      items: group.items.map(toAwardIndicator),
    })),
}))

export function getAwardGroup(level1: string) {
  return AWARD_GROUPS.find((g) => g.level1 === level1)
}

export function getAwardIndicator(id: string): AwardIndicatorLevel3 | undefined {
  for (const group of AWARD_GROUPS) {
    for (const level2 of group.items) {
      const item = level2.items.find((i) => i.id === id)
      if (item) return item
    }
  }
  return undefined
}

/** 当前奖卡指标的完整层级，供演示记录同步使用。 */
export function getAwardIndicatorMeta(indicatorId: string) {
  for (const group of AWARD_GROUPS) {
    for (const level2 of group.items) {
      const item = level2.items.find((entry) => entry.id === indicatorId)
      if (item) return { level1: group.level1, level2: level2.level2, level3: item.level3 }
    }
  }
  return undefined
}
