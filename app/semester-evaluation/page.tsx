"use client"

import { StandalonePageShell } from "@/components/evaluation/standalone-page-shell"
import { SemesterEvaluationEntry } from "@/components/teacher/semester-evaluation-entry"
import { EvaluationProvider } from "@/lib/evaluation-context"

export default function SemesterEvaluationPage() {
  return <EvaluationProvider><StandalonePageShell mainId="semester-evaluation-main" activeLabel="学期评价" activeIcon="notebook"><main id="semester-evaluation-main" tabIndex={-1} className="flex w-full flex-col pt-1"><SemesterEvaluationEntry /></main></StandalonePageShell></EvaluationProvider>
}
