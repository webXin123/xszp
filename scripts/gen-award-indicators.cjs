/* Generates lib/data/award-card-indicators.json from 明珠临港-五育奖卡.xlsx */
const XLSX = require("xlsx")
const fs = require("fs")
const path = require("path")

const wb = XLSX.readFile(path.join(__dirname, "../明珠临港-五育奖卡.xlsx"))
const rows = XLSX.utils.sheet_to_json(wb.Sheets["Sheet1"], { defval: "" })

// 提取脚本按 id_<DISP_ID>.jpg 命名（见 public/images/award-cards/）

const groups = []
for (const row of rows) {
  const level1 = String(row["一级指标"]).trim()
  const level2 = String(row["二级指标"]).trim()
  const description = String(row["描述信息"]).trim()
  const points = Number(row["奖卡分数"]) || 1
  const dispMatch = String(row["奖卡正面"]).match(/ID_[A-F0-9]+/)
  const image = dispMatch ? `/images/award-cards/${dispMatch[0].toLowerCase()}.jpg` : null

  let group = groups.find((g) => g.level1 === level1)
  if (!group) {
    group = { level1, items: [] }
    groups.push(group)
  }
  group.items.push({
    id: `award-${groups.length}-${group.items.length + 1}`,
    level2,
    description,
    points,
    image,
  })
}

const out = path.join(__dirname, "../lib/data/award-card-indicators.json")
fs.writeFileSync(out, JSON.stringify(groups, null, 2) + "\n")
console.log("wrote", out, groups.length, "groups")
