import { PointsMallCartPage } from "@/components/mall/points-mall"
import { EvaluationProvider } from "@/lib/evaluation-context"

export default function PointsMallCartRoute() {
  return <EvaluationProvider><PointsMallCartPage /></EvaluationProvider>
}
