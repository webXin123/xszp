"use client"

import { useState } from "react"
import { ScanLine } from "lucide-react"
import { cn } from "@/lib/utils"

/** 页面内容区扫描按钮：点击弹出扫描演示提示 */
export function ScanFab({ className }: { className?: string }) {
  const [toast, setToast] = useState(false)

  const handleClick = () => {
    setToast(true)
    window.setTimeout(() => setToast(false), 2200)
  }

  return (
    <>
      <button
        type="button"
        aria-label="扫描奖卡"
        title="点击扫描奖卡"
        onClick={handleClick}
        className={cn(
          "flex items-center gap-2 rounded-full bg-gradient-to-br from-primary to-primary-2 px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/30 ring-1 ring-white/20 transition hover:shadow-lg hover:brightness-105 active:scale-95",
          className,
        )}
      >
        <ScanLine className="size-4" />
        扫描奖卡
      </button>
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 whitespace-nowrap rounded-xl bg-foreground/90 px-4 py-2 text-xs font-medium text-background shadow-lg">
          扫描功能演示：对准奖卡二维码即可累计积分
        </div>
      )}
    </>
  )
}
