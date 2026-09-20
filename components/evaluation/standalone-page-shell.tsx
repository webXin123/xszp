"use client"

import { type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface StandalonePageShellProps {
  children: ReactNode
  mainId: string
  activeLabel: string
  activeIcon: "calendar" | "download" | "file" | "heart" | "notebook" | "settings" | "shopping"
  className?: string
  embedded?: boolean
}

export function StandalonePageShell({ children, mainId, activeLabel, className, embedded = false }: StandalonePageShellProps) {
  if (embedded) return <div className={cn("flex w-full min-w-0 flex-col", className)}>{children}</div>

  return <div className={cn("app-standalone-page", className)}>
    <a href={`#${mainId}`} className="sr-only z-[60] rounded-md bg-white px-3 py-2 text-sm font-semibold text-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus-visible:ring-2 focus-visible:ring-primary/50">跳转到主要内容</a>
    <div className="app-standalone-content" aria-label={`${activeLabel}页面内容`}>{children}</div>
  </div>
}
