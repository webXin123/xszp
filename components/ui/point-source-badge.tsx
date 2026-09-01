"use client"

import { Award, Flag, QrCode, Trophy } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { POINT_SOURCE_BADGE, type PointSource } from "@/lib/points-utils"

/** 不同积分来源使用不同图标（与班主任首页五育积分动态一致） */
const POINT_SOURCE_ICON: Record<PointSource, LucideIcon> = {
  online: Award,
  offline_scan: QrCode,
  flag_reward: Flag,
  honor: Trophy,
}

interface PointSourceBadgeProps {
  source: PointSource
  className?: string
}

/** 积分来源渐变图标徽章：不同来源不同图标与渐变色 */
export function PointSourceBadge({ source, className }: PointSourceBadgeProps) {
  const Icon = POINT_SOURCE_ICON[source]
  const meta = POINT_SOURCE_BADGE[source]
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md",
        meta?.badge,
        className,
      )}
    >
      {Icon && <Icon className="size-4.5" />}
    </span>
  )
}
