import { Suspense } from "react"
import { PointsMallRecordsPage } from "@/components/mall/points-mall"
import { EvaluationProvider } from "@/lib/evaluation-context"

export default function PointsMallRecordsRoute() {
  return <EvaluationProvider><Suspense fallback={null}><PointsMallRecordsPage /></Suspense></EvaluationProvider>
}
