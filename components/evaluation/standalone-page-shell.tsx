"use client"

import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { CalendarRange, Download, FileSpreadsheet, HeartPulse, House, NotebookPen, Settings2, ShoppingBag } from "lucide-react"
import { usePermission } from "@/lib/use-permission"
import { TeacherSwitcher } from "./teacher-switcher"
import { cn } from "@/lib/utils"

interface StandalonePageShellProps {
  children: ReactNode
  mainId: string
  activeLabel: string
  activeIcon: "calendar" | "download" | "file" | "heart" | "notebook" | "settings" | "shopping"
  className?: string
}

const ACTIVE_ICONS = {
  calendar: CalendarRange,
  download: Download,
  file: FileSpreadsheet,
  heart: HeartPulse,
  notebook: NotebookPen,
  settings: Settings2,
  shopping: ShoppingBag,
} as const

function getHomeLabel(role: ReturnType<typeof usePermission>["role"]) {
  if (role === "homeroom") return "班主任首页"
  if (role === "subject" || role === "pe_teacher") return "任课教师首页"
  if (role === "moral_director") return "德育主任首页"
  if (role === "director") return "管理员首页"
  return "首页"
}

export function StandalonePageShell({ children, mainId, activeLabel, activeIcon, className }: StandalonePageShellProps) {
  const { role } = usePermission()
  const homeLabel = getHomeLabel(role)
  const ActiveIcon = ACTIVE_ICONS[activeIcon]

  return <div className={cn("app-page-shell min-h-screen bg-background px-4 pb-6 pt-16 sm:px-6", className)}>
    <a href={`#${mainId}`} className="sr-only z-[60] rounded-md bg-white px-3 py-2 text-sm font-semibold text-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus-visible:ring-2 focus-visible:ring-primary/50">跳转到主要内容</a>
    <header className="app-header fixed inset-x-0 top-0 z-50 border-b bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-[1240px] items-center justify-between gap-3 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
          <span className="flex size-8 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-border/60"><Image src="/xszp/images/logo.png" alt="屹力学生综评" width={30} height={30} /></span>
          <span className="hidden flex-col leading-tight md:flex"><span className="text-sm font-bold text-foreground">屹力学生综评</span><span className="text-xs text-muted-foreground">综合评价平台</span></span>
        </Link>
        <nav className="flex min-w-0 items-center gap-1" aria-label="页面导航">
          <Link href="/" className="relative flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"><House className="size-4" aria-hidden="true" /><span className="hidden sm:inline">{homeLabel}</span></Link>
          <span className="relative flex min-h-10 items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-sm font-semibold text-primary"><ActiveIcon className="size-4" aria-hidden="true" /><span className="hidden sm:inline">{activeLabel}</span><span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary" /></span>
        </nav>
        <div className="flex shrink-0 items-center"><TeacherSwitcher /></div>
      </div>
    </header>
    <div className="app-standalone-content mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-5">{children}</div>
  </div>
}
