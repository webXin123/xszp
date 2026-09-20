import type { Metadata } from "next"
import { ClassConfigTab } from "@/components/evaluation/class-config-tab"
import { StandalonePageShell } from "@/components/evaluation/standalone-page-shell"
import { EvaluationProvider } from "@/lib/evaluation-context"

export const metadata: Metadata = {
  title: "班级评价配置 | 屹力学生综评",
  description: "维护班级评价指标、流动红旗与班级形象配置。",
}

export default function ClassEvaluationConfigPage() {
  return (
    <EvaluationProvider>
      <StandalonePageShell mainId="class-evaluation-config-main" activeLabel="评价配置" activeIcon="settings" className="class-config-standalone-page">
        <div id="class-evaluation-config-main" tabIndex={-1} className="w-full">
          <ClassConfigTab />
        </div>
      </StandalonePageShell>
    </EvaluationProvider>
  )
}
