import { PointsMallHome } from "@/components/mall/points-mall"
import { EvaluationProvider } from "@/lib/evaluation-context"

export default function PointsMallPage() {
  return <EvaluationProvider><PointsMallHome /></EvaluationProvider>
}
