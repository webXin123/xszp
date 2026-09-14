"use client"

import { ClipboardCheck, NotebookPen } from "lucide-react"
import { CommentEntryManagement } from "@/components/admin/comment-entry-management"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Grade, SchoolClass } from "@/lib/types"

export function SemesterEvaluationManagement({
  grades,
  classes,
}: {
  grades: Grade[]
  classes: SchoolClass[]
}) {
  return (
    <Tabs defaultValue="comment" className="gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[#cfd8f6] bg-white px-4 py-3 shadow-[0_14px_30px_-26px_rgba(53,67,150,0.72)] sm:px-5">
        <div>
          <h1 className="text-lg font-bold text-foreground">学期评价管理</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">统一发布学期评语、学期评价任务，实时跟进教师与班主任录入进度。</p>
        </div>
        <TabsList aria-label="学期评价管理内容切换" className="h-10 rounded-xl bg-[#eef2ff] p-1">
          <TabsTrigger value="comment" className="h-8 rounded-lg px-3.5 text-sm data-active:bg-white data-active:text-primary data-active:shadow-sm">
            <NotebookPen className="size-4" aria-hidden="true" />
            学期评语
          </TabsTrigger>
          <TabsTrigger value="evaluation" className="h-8 rounded-lg px-3.5 text-sm data-active:bg-white data-active:text-primary data-active:shadow-sm">
            <ClipboardCheck className="size-4" aria-hidden="true" />
            学期评价
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="comment" className="mt-0">
        <CommentEntryManagement grades={grades} classes={classes} />
      </TabsContent>
      <TabsContent value="evaluation" className="mt-0">
        <CommentEntryManagement grades={grades} classes={classes} mode="evaluation" />
      </TabsContent>
    </Tabs>
  )
}
