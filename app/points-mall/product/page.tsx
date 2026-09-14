import { PointsMallProductPage } from "@/components/mall/points-mall"
import { EvaluationProvider } from "@/lib/evaluation-context"

export default function PointsMallProductRoute() {
  return <EvaluationProvider><PointsMallProductPage /></EvaluationProvider>
}
