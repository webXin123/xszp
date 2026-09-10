"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { EvaluationProvider } from "@/lib/evaluation-context"
import { TeacherScoreEntry } from "@/components/teacher/score-entry"
import { StandalonePageShell } from "@/components/evaluation/standalone-page-shell"

function ScoreEntryPageContent() {
  return <StandalonePageShell mainId="score-entry-main" activeLabel="成绩上传" activeIcon="file"><main id="score-entry-main" tabIndex={-1} className="flex w-full flex-col gap-4 pt-1"><Link href="/" className="inline-flex min-h-10 w-fit items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"><ArrowLeft className="size-4" aria-hidden="true" />返回首页</Link><TeacherScoreEntry /></main></StandalonePageShell>
}

export default function ScoreEntryPage() {
  return <EvaluationProvider><ScoreEntryPageContent /></EvaluationProvider>
}
