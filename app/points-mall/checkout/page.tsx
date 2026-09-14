import { PointsMallCheckoutPage } from "@/components/mall/points-mall"
import { EvaluationProvider } from "@/lib/evaluation-context"

export default function PointsMallCheckoutRoute() {
  return <EvaluationProvider><PointsMallCheckoutPage /></EvaluationProvider>
}
