"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ScanLine } from "lucide-react"
import { cn } from "@/lib/utils"

/** 可拖动的"扫描奖卡"原型悬浮球：默认停靠页面内容区右下角，可拖到任意位置，点击触发扫描演示提示 */
export function ScanFab() {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [toast, setToast] = useState(false)
  const [mounted, setMounted] = useState(false)

  const dragState = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    moved: false,
  })
  const fabRef = useRef<HTMLButtonElement>(null)
  const SIZE = 64
  const MARGIN = 16

  // 初始停靠在父容器（页面内容区）右下角
  useEffect(() => {
    setMounted(true)
    const place = () => {
      const parent = fabRef.current?.parentElement
      if (!parent) return
      if (window.matchMedia("(max-width: 1023px)").matches) {
        const maxY = Math.max(MARGIN, window.innerHeight - SIZE - 88)
        setPos({
          x: Math.max(MARGIN, window.innerWidth - SIZE - MARGIN),
          y: Math.min(Math.max(MARGIN, window.innerHeight * 0.62), maxY),
        })
        return
      }
      const rect = parent.getBoundingClientRect()
      setPos({
        x: Math.max(MARGIN, rect.width - SIZE - MARGIN),
        y: Math.min(Math.max(MARGIN, rect.height * 0.62), Math.max(MARGIN, rect.height - SIZE - MARGIN)),
      })
    }
    place()
    const t = window.setTimeout(place, 50)
    window.addEventListener("resize", place)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener("resize", place)
    }
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      dragState.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
      }
      setDragging(true)
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!dragging || dragState.current.pointerId !== e.pointerId || !pos) return
      const dx = e.clientX - dragState.current.startX
      const dy = e.clientY - dragState.current.startY
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragState.current.moved = true
      const isMobile = window.matchMedia("(max-width: 1023px)").matches
      const parent = fabRef.current?.parentElement
      const maxX = (isMobile ? window.innerWidth : parent?.clientWidth ?? window.innerWidth) - SIZE - 8
      const maxY = (isMobile ? window.innerHeight - 88 : parent?.clientHeight ?? window.innerHeight) - SIZE - 8
      const nx = Math.min(Math.max(pos.x + dx, 8), Math.max(8, maxX))
      const ny = Math.min(Math.max(pos.y + dy, 8), Math.max(8, maxY))
      dragState.current.startX = e.clientX
      dragState.current.startY = e.clientY
      setPos({ x: nx, y: ny })
    },
    [dragging, pos],
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (dragState.current.pointerId !== e.pointerId) return
      setDragging(false)
      dragState.current.pointerId = -1
    },
    [],
  )

  const onClick = useCallback(() => {
    if (dragState.current.moved) {
      dragState.current.moved = false
      return
    }
    setToast(true)
    window.setTimeout(() => setToast(false), 2200)
  }, [])

  if (!mounted) return null

  return (
    <button
      type="button"
      ref={fabRef}
      aria-label="扫描奖卡（可拖动）"
      title="扫描奖卡：点击演示，按住可拖动"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={onClick}
      style={{ left: pos?.x ?? -9999, top: pos?.y ?? -9999, width: SIZE, height: SIZE }}
      className={cn(
        "fixed z-[60] flex touch-none select-none flex-col items-center justify-center gap-1 rounded-full lg:absolute",
        "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2",
        "transition-shadow",
        dragging ? "cursor-grabbing scale-105 shadow-2xl" : "cursor-grab hover:shadow-2xl",
      )}
    >
      <ScanLine className="size-6" aria-hidden="true" />
      <span className="text-xs font-semibold leading-none">扫描奖卡</span>
      {toast && (
        <span className="absolute -top-9 left-1/2 -translate-x-1/2 rounded-lg bg-foreground/90 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-background shadow-lg">
          扫描功能演示：对准奖卡二维码即可累计积分
        </span>
      )}
    </button>
  )
}
