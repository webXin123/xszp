import type { Metadata } from "next"
import { EvaluationDashboard } from "@/components/evaluation/evaluation-dashboard"
import { EvaluationProvider } from "@/lib/evaluation-context"

export const metadata: Metadata = {
  title: "班级评价配置 | 屹力学生综评",
  description: "维护班级评价指标、流动红旗与班级形象配置。",
}

export default function ClassEvaluationConfigPage() {
  return (
    <EvaluationProvider>
      <EvaluationDashboard standaloneView="config" />
    </EvaluationProvider>
  )
}
