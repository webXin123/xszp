"use client"

import { Check, Medal, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEvaluation } from "@/lib/evaluation-context"

export function ParentHonorReview({ classId }: { classId: string }) {
  const { honors, reviewParentHonor } = useEvaluation()
  const pending = honors.filter((item) => item.classId === classId && item.reviewStatus === "pending" && item.submittedByParent)
  if (pending.length === 0) return null
  return <section className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Medal className="size-4" /></span><div><h3 className="text-sm font-bold text-foreground">家长提交的荣誉待审核</h3><p className="mt-0.5 text-xs text-muted-foreground">审核通过后才会计入学生积分。</p></div></div><span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-amber-700">{pending.length} 条</span></div><div className="mt-3 space-y-2">{pending.map((item) => <article key={item.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-100 bg-white p-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-foreground">{item.studentName} · {item.honorName}</p><p className="mt-1 truncate text-xs text-muted-foreground">{item.honorLevel === "school" ? "校级" : item.honorLevel === "district" ? "区级" : item.honorLevel === "city" ? "市级" : "国家级"} · +{item.points} 分 · {item.awardDate}</p></div>{item.imageDataUrl && <img src={item.imageDataUrl} alt={`${item.studentName}的荣誉证明`} width={48} height={48} className="size-12 rounded-lg border border-[#e4e9f3] object-cover" />}<div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => reviewParentHonor(item.id, "rejected", "班主任审核未通过")}><X className="size-3.5" />驳回</Button><Button size="sm" onClick={() => reviewParentHonor(item.id, "approved", "班主任审核通过")}><Check className="size-3.5" />通过</Button></div></article>)}</div></section>
}
