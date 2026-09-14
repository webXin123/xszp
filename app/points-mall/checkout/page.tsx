import { Suspense } from "react"
import { PointsMallCheckoutPage } from "@/components/mall/points-mall"
import { EvaluationProvider } from "@/lib/evaluation-context"

export default function PointsMallCheckoutRoute() {
  return <EvaluationProvider><Suspense fallback={null}><PointsMallCheckoutPage /></Suspense></EvaluationProvider>
}
