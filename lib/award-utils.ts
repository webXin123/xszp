import indicatorsData from "./data/award-card-indicators.json"
import type { AwardIndicatorGroup, AwardIndicatorLevel2 } from "./types"

export const AWARD_GROUPS = indicatorsData as AwardIndicatorGroup[]

export const AWARD_LEVEL1_LIST = AWARD_GROUPS.map((g) => g.level1)

export function getAwardGroup(level1: string) {
  return AWARD_GROUPS.find((g) => g.level1 === level1)
}

export function getAwardIndicator(id: string): AwardIndicatorLevel2 | undefined {
  for (const group of AWARD_GROUPS) {
    const item = group.items.find((i) => i.id === id)
    if (item) return item
  }
  return undefined
}
