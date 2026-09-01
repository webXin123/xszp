import * as XLSX from "xlsx"
import { AWARD_GROUPS, AWARD_LEVEL1_LIST } from "./award-utils"

/**
 * 按各一级指标卡面现有数量比例，将 total 张奖卡分配为每组生成数量
 */
export function allocatePrintCounts(total: number): Record<string, number> {
  const result: Record<string, number> = {}
  for (const name of AWARD_LEVEL1_LIST) result[name] = 0
  if (total <= 0) return result

  const capacities = AWARD_GROUPS.map((g) => g.items.length)
  const capTotal = capacities.reduce((a, b) => a + b, 0)
  let assigned = 0

  const quotas = capacities.map((cap) => {
    const q = Math.floor((total * cap) / capTotal)
    assigned += q
    return q
  })

  const remainders = capacities
    .map((cap, i) => ({
      i,
      r: ((total * cap) / capTotal) % 1,
    }))
    .sort((a, b) => b.r - a.r)

  let rest = total - assigned
  for (const { i } of remainders) {
    if (rest <= 0) break
    quotas[i] += 1
    rest -= 1
  }

  AWARD_LEVEL1_LIST.forEach((name, i) => {
    result[name] = quotas[i] ?? 0
  })
  return result
}

export interface AwardCardExportRow {
  level1: string
  points: number
}

/**
 * 导出线下奖卡 Excel：每行一条奖卡记录，记录一级指标名称与奖卡积分
 */
export function exportAwardCardsExcel(rows: AwardCardExportRow[]) {
  const sheet = XLSX.utils.aoa_to_sheet([
    ["奖卡一级指标名称", "奖卡积分"],
    ...rows.map((row) => [row.level1, row.points]),
  ])
  sheet["!cols"] = [{ wch: 22 }, { wch: 10 }]
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, "线下奖卡")

  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(
    now.getHours(),
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`

  XLSX.writeFile(book, `线下奖卡-${rows.length}张-${stamp}.xlsx`)
}
