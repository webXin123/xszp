import { Suspense } from "react"
import { PointsMallCartPage } from "@/components/mall/points-mall"
import { EvaluationProvider } from "@/lib/evaluation-context"

export default function PointsMallCartRoute() {
  return <EvaluationProvider><Suspense fallback={null}><PointsMallCartPage /></Suspense></EvaluationProvider>
}
