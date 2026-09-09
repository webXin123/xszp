import type { Metadata } from "next"
import { EvaluationDashboard } from "@/components/evaluation/evaluation-dashboard"
import { EvaluationProvider } from "@/lib/evaluation-context"

export const metadata: Metadata = {
  title: "班级评价 | 屹力学生综评",
  description: "查看并录入班级与学生综合评价。",
}

export default function ClassEvaluationPage() {
  return (
    <EvaluationProvider>
      <EvaluationDashboard standaloneView="evaluation" />
    </EvaluationProvider>
  )
}
