import type { Metadata, Viewport } from "next"
import { StudentCommandCenter } from "@/components/student-command-center/student-command-center"
import { EvaluationProvider } from "@/lib/evaluation-context"

export const metadata: Metadata = {
  title: "学生成长画像",
  description: "家长查看学生成长画像、成绩与成长记录。",
}

export const viewport: Viewport = {
  themeColor: "#031421",
  colorScheme: "dark",
}

export default function StudentCommandCenterPage() {
  return (
    <EvaluationProvider>
      <StudentCommandCenter />
    </EvaluationProvider>
  )
}