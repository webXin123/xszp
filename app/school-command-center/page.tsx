import type { Metadata, Viewport } from "next"
import { SchoolCommandCenter } from "@/components/command-center/school-command-center"

export const metadata: Metadata = {
  title: "学生综合素质数据中心 · 明珠实验学校",
  description: "面向学校管理者的学生综合素质实时数据大屏",
}

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#06142a",
}

export default function SchoolCommandCenterPage() {
  return <SchoolCommandCenter />
}
