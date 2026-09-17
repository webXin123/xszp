"use client"

import { usePathname } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

type SkeletonVariant = "workbench" | "form" | "detail" | "mall"

const COMMAND_CENTER_PATHS = new Set([
  "/school-command-center",
  "/student-command-center",
])

const SKELETON_LOGO_URL = "https://img.js.design/assets/img/6a320f8481a6de7b9170245d.png#eb0e7235ab63a2774a6276339f50ac06"

const FORM_PATHS = new Set([
  "/score-entry",
  "/score-entry-management",
  "/comment-entry",
  "/comment-entry-management",
  "/semester-evaluation",
  "/pe-score-import",
  "/offline-award-cards",
  "/class-evaluation-config",
])

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`prototype-skeleton-block ${className}`} />
}

function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div className="mt-4 space-y-3">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="grid grid-cols-[36px_minmax(0,1fr)_18%_12%] items-center gap-3 border-t border-slate-200/70 px-1 pt-3 first:border-t-0 first:pt-0">
          <SkeletonBlock className="size-8 rounded-lg" />
          <SkeletonBlock className={index % 3 === 0 ? "h-3 w-4/5" : "h-3 w-3/5"} />
          <SkeletonBlock className="h-3 w-full" />
          <SkeletonBlock className="h-7 w-full rounded-lg" />
        </div>
      ))}
    </div>
  )
}

function SkeletonToolbar() {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/85 bg-white/85 px-5 py-4 shadow-[0_10px_24px_-22px_rgba(37,66,120,0.5)]">
        <div className="space-y-3">
          <SkeletonBlock className="h-5 w-32" />
          <SkeletonBlock className="h-3 w-52" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-9 w-20 rounded-lg" />
          <SkeletonBlock className="h-9 w-24 rounded-lg" />
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-xl border border-slate-200/85 bg-white/80 p-4">
            <SkeletonBlock className="h-3 w-16" />
            <SkeletonBlock className="mt-3 h-6 w-10" />
            <SkeletonBlock className="mt-3 h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </>
  )
}

function PageSkeleton({ variant }: { variant: SkeletonVariant }) {
  const isForm = variant === "form"
  const isDetail = variant === "detail"
  const isMall = variant === "mall"

  return (
    <div className="min-h-screen bg-[#eef3fa] px-4 pb-10 pt-4 sm:px-6 lg:px-8" aria-hidden="true">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-5 flex h-12 items-center justify-between border-b border-slate-200/90 px-2">
          <div className="flex items-center gap-3"><SkeletonBlock className="size-8 rounded-lg" /><SkeletonBlock className="h-4 w-28" /></div>
          <div className="flex items-center gap-3"><SkeletonBlock className="h-3 w-16" /><SkeletonBlock className="size-8 rounded-full" /></div>
        </div>
        <SkeletonToolbar />
        <div className={`mt-4 grid gap-4 ${isDetail ? "xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.8fr)]" : "xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]"}`}>
          <section className="rounded-2xl border border-slate-200/90 bg-white/85 p-5 shadow-[0_14px_34px_-30px_rgba(37,66,120,0.58)]">
            <div className="flex items-center justify-between gap-4"><div className="space-y-2"><SkeletonBlock className="h-4 w-32" /><SkeletonBlock className="h-3 w-48" /></div><SkeletonBlock className="h-9 w-24 rounded-lg" /></div>
            {isForm ? <div className="mt-5 grid gap-3 md:grid-cols-2">{Array.from({ length: 4 }, (_, index) => <div key={index} className="rounded-xl border border-slate-200/85 p-4"><SkeletonBlock className="h-3 w-20" /><SkeletonBlock className="mt-4 h-10 w-full rounded-lg" /><SkeletonBlock className="mt-3 h-3 w-3/5" /></div>)}</div> : <SkeletonRows count={isMall ? 6 : 7} />}
          </section>
          <aside className="rounded-2xl border border-slate-200/90 bg-white/85 p-5 shadow-[0_14px_34px_-30px_rgba(37,66,120,0.58)]">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="mt-3 h-3 w-2/3" />
            <SkeletonBlock className="mt-6 h-36 w-full rounded-xl" />
            <div className="mt-5 space-y-3"><SkeletonBlock className="h-3 w-full" /><SkeletonBlock className="h-3 w-5/6" /><SkeletonBlock className="h-3 w-3/4" /></div>
          </aside>
        </div>
      </div>
    </div>
  )
}

function getSkeletonVariant(pathname: string): SkeletonVariant {
  if (FORM_PATHS.has(pathname)) return "form"
  if (pathname.startsWith("/points-mall")) return "mall"
  if (pathname.includes("detail") || pathname.includes("enroll")) return "detail"
  return "workbench"
}

/**
 * 为静态原型的每次普通页面进入提供同构骨架。大屏本身是完整画布，按产品约定不展示。
 */
export function PageLoadingOverlay() {
  const pathname = usePathname() ?? "/"
  const isCommandCenter = COMMAND_CENTER_PATHS.has(pathname)
  // 服务端根布局无法可靠区分静态导出的具体子路由；挂载后再按真实 pathname 决定，避免大屏首帧闪现骨架。
  const [visible, setVisible] = useState(false)
  const variant = useMemo(() => getSkeletonVariant(pathname), [pathname])

  useEffect(() => {
    if (isCommandCenter) {
      setVisible(false)
      return
    }
    setVisible(true)
    const timer = window.setTimeout(() => setVisible(false), 520)
    return () => window.clearTimeout(timer)
  }, [isCommandCenter, pathname])

  if (isCommandCenter || !visible) return null

  return (
    <div className="prototype-page-loading fixed inset-0 z-[100] overflow-auto" role="status" aria-live="polite" aria-label="页面加载中">
      <PageSkeleton variant={variant} />
      <img
        className="pointer-events-none fixed left-1/2 top-1/2 z-[101] h-auto w-[220px] -translate-x-1/2 -translate-y-1/2"
        src={SKELETON_LOGO_URL}
        alt="屹力学生综评"
        width={220}
      />
      <span className="sr-only">页面加载中</span>
    </div>
  )
}
