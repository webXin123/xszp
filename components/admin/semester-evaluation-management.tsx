"use client"

import { useState } from "react"
import { ClipboardCheck, NotebookPen } from "lucide-react"
import { CommentEntryManagement } from "@/components/admin/comment-entry-management"
import { cn } from "@/lib/utils"
import type { Grade, SchoolClass } from "@/lib/types"

type SemesterManagementTab = "comment" | "evaluation"

export function SemesterEvaluationManagement({
  grades,
  classes,
}: {
  grades: Grade[]
  classes: SchoolClass[]
}) {
  const [activeTab, setActiveTab] = useState<SemesterManagementTab>("comment")

  return (
    <section className="rounded-[24px] border border-[#cfd8f6] bg-[#f7f8ff] p-4 shadow-[0_18px_38px_-30px_rgba(53,67,150,0.72)] sm:p-5">
      <div className="mb-5 flex w-full items-center gap-1 rounded-xl border border-[#dbe2f7] bg-white p-1 shadow-[0_7px_16px_-18px_rgba(53,67,150,0.68)] sm:w-fit" role="tablist" aria-label="学期评价管理类型">
        <button
          type="button"
          role="tab"
          id="semester-management-tab-comment"
          aria-controls="semester-management-tabpanel"
          aria-selected={activeTab === "comment"}
          onClick={() => setActiveTab("comment")}
          className={cn(
            "flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            activeTab === "comment"
              ? "bg-primary text-primary-foreground shadow-[0_5px_12px_-9px_rgba(63,81,188,0.9)]"
              : "text-muted-foreground hover:bg-[#f3f5ff] hover:text-foreground",
          )}
        >
          <NotebookPen className="size-4" aria-hidden="true" />
          学期评语
        </button>
        <button
          type="button"
          role="tab"
          id="semester-management-tab-evaluation"
          aria-controls="semester-management-tabpanel"
          aria-selected={activeTab === "evaluation"}
          onClick={() => setActiveTab("evaluation")}
          className={cn(
            "flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            activeTab === "evaluation"
              ? "bg-primary text-primary-foreground shadow-[0_5px_12px_-9px_rgba(63,81,188,0.9)]"
              : "text-muted-foreground hover:bg-[#f3f5ff] hover:text-foreground",
          )}
        >
          <ClipboardCheck className="size-4" aria-hidden="true" />
          学期评价
        </button>
      </div>

      <div id="semester-management-tabpanel" role="tabpanel" aria-labelledby={`semester-management-tab-${activeTab}`}>
        {activeTab === "comment" ? (
          <CommentEntryManagement grades={grades} classes={classes} embedded />
        ) : (
          <CommentEntryManagement grades={grades} classes={classes} mode="evaluation" embedded />
        )}
      </div>
    </section>
  )
}