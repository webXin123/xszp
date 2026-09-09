import type { Metadata } from "next"
import { EvaluationDashboard } from "@/components/evaluation/evaluation-dashboard"
import { EvaluationProvider } from "@/lib/evaluation-context"

export const metadata: Metadata = {
  title: "班级排行榜 | 屹力学生综评",
  description: "查看各班级日榜、周榜与月榜表现。",
}

export default function ClassRankingPage() {
  return (
    <EvaluationProvider>
      <EvaluationDashboard standaloneView="ranking" />
    </EvaluationProvider>
  )
}
