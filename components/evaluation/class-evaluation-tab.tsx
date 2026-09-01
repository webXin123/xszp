"use client"

import { useState } from "react"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useEvaluation } from "@/lib/evaluation-context"
import { usePermission } from "@/lib/use-permission"
import { LEVEL1_LIST, formatDate } from "@/lib/scoring-utils"
import { ClassEvaluationTable } from "./class-evaluation-table"

export function ClassEvaluationTab() {
  const { grades } = useEvaluation()
  const { visibleGrades } = usePermission()
  const [level1, setLevel1] = useState(LEVEL1_LIST[0])
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [gradeFilter, setGradeFilter] = useState("all")
  const [calendarOpen, setCalendarOpen] = useState(false)

  const today = new Date()
  today.setHours(23, 59, 59, 999)

  const gradeOptions = visibleGrades.length > 0 ? visibleGrades : grades

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                className="glass-panel h-10 gap-2 rounded-xl border-border/60 bg-transparent font-normal"
              />
            }
          >
            <CalendarIcon className="size-4 text-brand-blue" data-icon="inline-start" />
            {formatDate(selectedDate)}
          </PopoverTrigger>
          <PopoverContent align="start" className="glass-surface w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => {
                if (d) {
                  setSelectedDate(d)
                  setCalendarOpen(false)
                }
              }}
              disabled={{ after: today }}
            />
          </PopoverContent>
        </Popover>

        <Select
          items={[
            { value: "all", label: "全部年级" },
            ...gradeOptions.map((g) => ({ value: g.id, label: g.name })),
          ]}
          value={gradeFilter}
          onValueChange={(v) => v !== null && setGradeFilter(v)}
        >
          <SelectTrigger className="glass-panel h-10 w-32 rounded-xl border-border/60 bg-transparent">
            <SelectValue placeholder="年级筛选" />
          </SelectTrigger>
          <SelectContent className="glass-surface">
            <SelectGroup>
              <SelectItem value="all">全部年级</SelectItem>
              {gradeOptions.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-2">
        {LEVEL1_LIST.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setLevel1(name)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5",
              name === level1
                ? "bg-gradient-to-r from-primary to-primary-2 text-primary-foreground shadow-md shadow-primary/30"
                : "glass-panel text-muted-foreground hover:text-foreground",
            )}
          >
            {name}
          </button>
        ))}
      </div>

      <ClassEvaluationTable level1={level1} selectedDate={selectedDate} gradeFilter={gradeFilter} />
    </div>
  )
}
