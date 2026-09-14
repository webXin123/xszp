import { Suspense } from "react"
import { PointsMallProductPage } from "@/components/mall/points-mall"
import { EvaluationProvider } from "@/lib/evaluation-context"

export default function PointsMallProductRoute() {
  return <EvaluationProvider><Suspense fallback={null}><PointsMallProductPage /></Suspense></EvaluationProvider>
}
