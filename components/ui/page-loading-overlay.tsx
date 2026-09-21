"use client"

import { usePathname } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

type SkeletonVariant = "parent-home" | "workspace" | "activity" | "table" | "workflow" | "form" | "detail" | "management" | "mall-home" | "mall-product" | "mall-order" | "command-center"

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`prototype-skeleton-block ${className}`} />
}

function AppBrandSkeleton({ compact = false, dark = false }: { compact?: boolean; dark?: boolean }) {
  return <div className="flex min-w-0 items-center gap-2.5"><SkeletonBlock className={`size-8 shrink-0 rounded-lg ${dark ? "bg-white/15" : ""}`} /><div className="hidden space-y-1.5 sm:block"><SkeletonBlock className={`h-3.5 w-24 ${dark ? "bg-white/15" : ""}`} />{!compact && <SkeletonBlock className={`h-2.5 w-16 ${dark ? "bg-white/10" : ""}`} />}</div></div>
}

function WorkspaceHeaderSkeleton() {
  return <header className="flex h-[60px] items-center justify-between gap-4 border-b border-slate-200/90 bg-white/90 px-4 sm:px-6"><div className="flex min-w-0 items-center gap-3"><SkeletonBlock className="hidden size-5 rounded-md lg:block" /><div className="space-y-1.5"><SkeletonBlock className="h-4 w-28" /><SkeletonBlock className="hidden h-2.5 w-24 sm:block" /></div></div><div className="flex items-center gap-2"><SkeletonBlock className="hidden h-9 w-44 rounded-xl xl:block" /><SkeletonBlock className="size-9 rounded-full" /></div></header>
}

function StandaloneHeaderSkeleton() {
  return <header className="fixed inset-x-0 top-0 z-10 border-b border-slate-200/90 bg-white/92 backdrop-blur-xl"><div className="mx-auto flex h-14 w-full max-w-[1280px] items-center justify-between gap-3 px-4"><AppBrandSkeleton /><div className="flex items-center gap-2"><SkeletonBlock className="hidden h-9 w-24 rounded-lg sm:block" /><SkeletonBlock className="h-9 w-24 rounded-lg" /></div><SkeletonBlock className="size-8 rounded-full" /></div></header>
}

function WorkspaceSidebarSkeleton() {
  return <aside className="hidden w-[240px] shrink-0 border-r border-slate-200/80 bg-white/94 px-3 py-4 lg:block"><div className="mb-4 px-2"><AppBrandSkeleton compact /></div><div className="space-y-1.5">{Array.from({ length: 10 }, (_, index) => <div key={index} className={`flex h-10 items-center gap-3 rounded-xl px-3 ${index === 0 ? "bg-primary/[0.08]" : ""}`}><SkeletonBlock className="size-4 shrink-0 rounded-md" /><SkeletonBlock className={`h-3 ${index % 3 === 0 ? "w-20" : "w-14"}`} /></div>)}</div></aside>
}

function WorkspaceFrame({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#f3f7f7]"><main className="min-w-0 p-4 sm:p-5 lg:p-6">{children}</main></div>
}

function StandaloneFrame({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return <div className="min-h-screen bg-[#eef3fa] px-4 py-6 sm:px-6"><main className={`mx-auto w-full space-y-5 rounded-[24px] ${wide ? "" : "max-w-[1280px]"}`}>{children}</main></div>
}

function PanelHeading({ action = true }: { action?: boolean }) {
  return <div className="flex items-center justify-between gap-4"><div className="space-y-2"><SkeletonBlock className="h-4 w-28" /><SkeletonBlock className="h-3 w-44" /></div>{action && <SkeletonBlock className="h-9 w-24 rounded-lg" />}</div>
}

function SummaryCards({ count = 3 }: { count?: number }) {
  return <div className={`grid gap-3 ${count === 3 ? "grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-4"}`}>{Array.from({ length: count }, (_, index) => <article key={index} className="min-w-0 rounded-2xl border border-white/80 bg-white/88 p-3 shadow-[0_12px_26px_-24px_rgba(53,85,128,.6)] sm:p-4"><div className="flex items-center justify-between"><SkeletonBlock className="h-3 w-16 max-w-[65%]" /><SkeletonBlock className="hidden size-8 rounded-lg sm:block" /></div><SkeletonBlock className="mt-5 h-7 w-14 max-w-full" /><SkeletonBlock className="mt-3 h-2.5 w-20 max-w-full" /></article>)}</div>
}

function DataRows({ count = 4, table = false }: { count?: number; table?: boolean }) {
  return <div className={`mt-4 space-y-0 ${table ? "overflow-hidden rounded-xl border border-slate-200/85" : ""}`}>{table && <div className="grid grid-cols-[1.15fr_.8fr_1fr_.8fr] gap-3 bg-slate-50 px-4 py-3"><SkeletonBlock className="h-2.5 w-16" /><SkeletonBlock className="h-2.5 w-12" /><SkeletonBlock className="h-2.5 w-16" /><SkeletonBlock className="h-2.5 w-12" /></div>}{Array.from({ length: count }, (_, index) => <div key={index} className={`grid items-center gap-3 border-t border-slate-100 ${table ? "grid-cols-[1.15fr_.8fr_1fr_.8fr] px-4 py-3.5" : "grid-cols-[36px_minmax(0,1fr)_20%] py-3"}`}><SkeletonBlock className={table ? `h-3 ${index % 2 ? "w-4/5" : "w-3/5"}` : "size-8 rounded-lg"} /><SkeletonBlock className="h-3 w-4/5" /><SkeletonBlock className="h-3 w-3/5" />{table && <SkeletonBlock className="h-7 w-full rounded-lg" />}</div>)}</div>
}

function WorkspaceSkeleton() {
  return <WorkspaceFrame><section className="overflow-hidden rounded-2xl bg-[linear-gradient(112deg,#e6f3ed_0%,#f6fbf9_58%,#e7f2ff_100%)] p-5 sm:p-6"><SkeletonBlock className="h-6 w-60" /><SkeletonBlock className="mt-3 h-3 w-80 max-w-full" /><SkeletonBlock className="mt-2 h-3 w-52" /></section><div className="mt-5"><SummaryCards count={3} /></div><div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.95fr]"><section className="rounded-2xl border border-white/80 bg-white/88 p-5 shadow-sm"><PanelHeading /><DataRows count={5} /></section><section className="rounded-2xl border border-white/80 bg-white/88 p-5 shadow-sm"><PanelHeading action={false} /><DataRows count={5} /></section></div></WorkspaceFrame>
}

function ParentHomeSkeleton() {
  return <StandaloneFrame><section className="overflow-hidden rounded-[24px] border border-white/80 bg-[linear-gradient(112deg,#e6f5ed_0%,#f9fcfb_58%,#eaf2ff_100%)] p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-center gap-3"><SkeletonBlock className="size-14 rounded-2xl" /><div className="space-y-2"><SkeletonBlock className="h-5 w-36" /><SkeletonBlock className="h-3 w-52" /></div></div><SkeletonBlock className="h-9 w-28 rounded-xl" /></div><div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3"><SkeletonBlock className="h-16 rounded-xl" /><SkeletonBlock className="h-16 rounded-xl" /><SkeletonBlock className="h-16 rounded-xl" /></div></section><div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><section className="rounded-[24px] border border-white/80 bg-white/90 p-5 shadow-sm"><PanelHeading action={false} /><SkeletonBlock className="mx-auto mt-5 aspect-square max-h-64 w-full max-w-64 rounded-full" /></section><section className="rounded-[24px] border border-white/80 bg-white/90 p-5 shadow-sm"><PanelHeading action={false} /><div className="mt-5 grid grid-cols-3 gap-3">{Array.from({ length: 6 }, (_, index) => <SkeletonBlock key={index} className="h-20 rounded-xl" />)}</div></section></div><div className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 gap-2 border-t border-slate-200/90 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 lg:hidden">{Array.from({ length: 4 }, (_, index) => <SkeletonBlock key={index} className="h-12 rounded-xl" />)}</div></StandaloneFrame>
}

function WorkflowSkeleton() {
  return <WorkspaceFrame><section className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm"><PanelHeading /><div className="mt-4 flex gap-2"><SkeletonBlock className="h-10 w-24 rounded-lg" /><SkeletonBlock className="h-10 w-24 rounded-lg" /></div></section><div className="mt-4 grid gap-4 lg:grid-cols-[minmax(240px,.4fr)_minmax(0,1fr)]"><section className="rounded-2xl border border-white/80 bg-[#f7f8ff] p-4"><PanelHeading action={false} /><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">{Array.from({ length: 8 }, (_, index) => <SkeletonBlock key={index} className="h-14 rounded-xl" />)}</div></section><section className="rounded-2xl border border-white/80 bg-white/90 p-4"><PanelHeading /><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <SkeletonBlock key={index} className="h-32 rounded-xl" />)}</div></section></div><div className="fixed inset-x-0 bottom-0 z-20 flex justify-end border-t border-slate-200/90 bg-white/95 px-4 pb-[env(safe-area-inset-bottom)] pt-3 lg:hidden"><SkeletonBlock className="h-12 w-2/3 rounded-xl" /></div></WorkspaceFrame>
}

function TableSkeleton() {
  return <WorkspaceFrame><section className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm"><PanelHeading /><div className="mt-5 flex flex-wrap gap-3"><SkeletonBlock className="h-10 w-36 rounded-lg" /><SkeletonBlock className="h-10 w-32 rounded-lg" /><SkeletonBlock className="h-10 min-w-44 flex-1 rounded-lg" /></div><DataRows count={7} table /></section></WorkspaceFrame>
}

function ActivityCardSkeleton() {
  return <article className="overflow-hidden rounded-2xl border border-slate-200/85 bg-white shadow-sm"><SkeletonBlock className="h-24 w-full rounded-none" /><div className="p-4"><div className="flex items-start justify-between gap-3"><div className="space-y-2"><SkeletonBlock className="h-4 w-36" /><SkeletonBlock className="h-3 w-52" /></div><SkeletonBlock className="h-6 w-14 rounded-full" /></div><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3"><SkeletonBlock className="h-3 w-24" /><SkeletonBlock className="h-8 w-20 rounded-lg" /></div></div></article>
}

function ActivitySkeleton() {
  return <WorkspaceFrame><section className="rounded-2xl border border-white/80 bg-white/88 p-5 shadow-sm"><PanelHeading /><div className="mt-5 flex flex-wrap gap-3"><SkeletonBlock className="h-10 w-36 rounded-lg" /><SkeletonBlock className="h-10 w-32 rounded-lg" /><SkeletonBlock className="h-10 min-w-48 flex-1 rounded-lg" /></div></section><section className="mt-5"><div className="mb-3 flex items-center justify-between"><SkeletonBlock className="h-5 w-24" /><SkeletonBlock className="h-3 w-16" /></div><div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 4 }, (_, index) => <ActivityCardSkeleton key={index} />)}</div></section></WorkspaceFrame>
}

function FormSkeleton() {
  return <StandaloneFrame><section className="rounded-[24px] border border-white/80 bg-white/90 p-5 shadow-[0_14px_34px_-30px_rgba(37,66,120,.58)] sm:p-6"><PanelHeading /><div className="mt-6 grid gap-4 md:grid-cols-2">{Array.from({ length: 6 }, (_, index) => <label key={index} className={index === 4 || index === 5 ? "md:col-span-2" : ""}><SkeletonBlock className="h-3 w-20" /><SkeletonBlock className={`mt-3 h-10 w-full rounded-lg ${index > 3 ? "h-24" : ""}`} /></label>)}</div><div className="mt-6 flex justify-end gap-2"><SkeletonBlock className="h-10 w-20 rounded-lg" /><SkeletonBlock className="h-10 w-28 rounded-lg" /></div></section></StandaloneFrame>
}

function DetailSkeleton() {
  return <StandaloneFrame><section className="overflow-hidden rounded-[24px] border border-white/80 bg-white/90 shadow-[0_14px_34px_-30px_rgba(37,66,120,.58)]"><SkeletonBlock className="h-48 w-full rounded-none sm:h-60" /><div className="p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div className="space-y-3"><SkeletonBlock className="h-5 w-52" /><SkeletonBlock className="h-3 w-72 max-w-full" /></div><SkeletonBlock className="h-7 w-16 rounded-full" /></div><div className="mt-6 grid gap-4 md:grid-cols-[1.25fr_.75fr]"><div className="space-y-3"><SkeletonBlock className="h-3 w-full" /><SkeletonBlock className="h-3 w-11/12" /><SkeletonBlock className="h-3 w-4/5" /></div><div className="rounded-xl bg-slate-50 p-4"><SkeletonBlock className="h-3 w-20" /><SkeletonBlock className="mt-4 h-8 w-full rounded-lg" /></div></div></div></section><section className="rounded-[24px] border border-white/80 bg-white/90 p-5 shadow-sm"><div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-1"><SkeletonBlock className="h-9 rounded-lg" /><SkeletonBlock className="h-9 rounded-lg" /><SkeletonBlock className="h-9 rounded-lg" /></div><DataRows count={4} /></section></StandaloneFrame>
}

function ManagementSkeleton() {
  return <StandaloneFrame><section className="rounded-2xl border border-primary/15 bg-[linear-gradient(112deg,#edf3ff_0%,#fff_62%,#effaf8_100%)] p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div className="space-y-2"><SkeletonBlock className="h-3 w-20" /><SkeletonBlock className="h-6 w-56" /><SkeletonBlock className="h-3 w-72 max-w-full" /></div><div className="grid grid-cols-3 gap-3 rounded-xl border border-primary/10 bg-white/80 p-3"><SkeletonBlock className="h-8 w-10" /><SkeletonBlock className="h-8 w-10" /><SkeletonBlock className="h-8 w-10" /></div></div></section><div className="grid grid-cols-3 gap-1 rounded-xl border border-primary/10 bg-[#edf3ff]/75 p-1"><SkeletonBlock className="h-10 rounded-lg" /><SkeletonBlock className="h-10 rounded-lg" /><SkeletonBlock className="h-10 rounded-lg" /></div><section className="rounded-[24px] border border-white/80 bg-white/90 p-5 shadow-sm"><PanelHeading /><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <article key={index} className="overflow-hidden rounded-xl border border-slate-200/85"><SkeletonBlock className="h-28 w-full rounded-none" /><div className="space-y-3 p-3"><SkeletonBlock className="h-4 w-3/5" /><SkeletonBlock className="h-3 w-full" /><SkeletonBlock className="h-10 w-full rounded-lg" /></div></article>)}</div></section></StandaloneFrame>
}

function MallFrameSkeleton({ children, heading = true }: { children: React.ReactNode; heading?: boolean }) {
  return <StandaloneFrame wide>{heading && <section className="overflow-hidden rounded-2xl border border-primary/15 bg-white/90 shadow-[0_18px_36px_-30px_rgba(48,78,140,.58)]"><div className="bg-[linear-gradient(100deg,#edf3ff_0%,#fbfdff_55%,#edfbf8_100%)] px-4 py-3 sm:px-5"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2.5"><SkeletonBlock className="size-9 shrink-0 rounded-xl" /><div className="space-y-1.5"><SkeletonBlock className="h-2.5 w-20" /><SkeletonBlock className="h-4 w-28" /></div><div className="hidden border-l border-primary/10 pl-3 sm:block"><SkeletonBlock className="h-3.5 w-20" /><SkeletonBlock className="mt-1.5 h-2.5 w-28" /></div></div><div className="flex items-center gap-2"><SkeletonBlock className="h-9 w-24 rounded-xl" /><SkeletonBlock className="h-8 w-20 rounded-lg" /></div></div><div className="mt-2 flex gap-1.5 border-t border-primary/10 pt-2"><SkeletonBlock className="h-8 w-16 rounded-lg" /><SkeletonBlock className="h-8 w-20 rounded-lg" /></div></div></section>}{children}</StandaloneFrame>
}

function MallHomeSkeleton() {
  return <MallFrameSkeleton><section className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div className="space-y-2"><SkeletonBlock className="h-3 w-16" /><SkeletonBlock className="h-5 w-52" /><SkeletonBlock className="h-3 w-72 max-w-full" /></div><SkeletonBlock className="h-9 w-32 rounded-lg" /></div><div className="mt-4 flex gap-3"><SkeletonBlock className="h-10 min-w-44 flex-1 rounded-xl" /><SkeletonBlock className="h-10 w-48 rounded-xl" /></div></section><section className="mt-5"><div className="mb-3 flex justify-between"><SkeletonBlock className="h-4 w-20" /><SkeletonBlock className="h-3 w-14" /></div><div className="data-card-grid gap-3">{Array.from({ length: 8 }, (_, index) => <article key={index} className="overflow-hidden rounded-2xl border border-slate-200/85 bg-white"><SkeletonBlock className="aspect-[1.16] w-full rounded-none" /><div className="space-y-2.5 p-3"><SkeletonBlock className="h-3.5 w-3/4" /><SkeletonBlock className="h-3 w-full" /><SkeletonBlock className="h-3 w-4/5" /><div className="flex justify-between pt-2"><SkeletonBlock className="h-4 w-12" /><SkeletonBlock className="h-5 w-14 rounded-full" /></div></div></article>)}</div></section></MallFrameSkeleton>
}

function MallProductSkeleton() {
  return <MallFrameSkeleton><section className="grid overflow-hidden rounded-2xl border border-slate-200/85 bg-white shadow-sm md:grid-cols-[minmax(0,1fr)_minmax(360px,.88fr)]"><SkeletonBlock className="min-h-[280px] w-full rounded-none md:min-h-[460px]" /><div className="space-y-4 p-5 sm:p-6"><div className="flex justify-between"><div className="space-y-2"><SkeletonBlock className="h-3 w-16" /><SkeletonBlock className="h-6 w-44" /></div><SkeletonBlock className="h-6 w-16 rounded-full" /></div><SkeletonBlock className="h-3 w-full" /><SkeletonBlock className="h-3 w-5/6" /><SkeletonBlock className="h-24 w-full rounded-xl" /><SkeletonBlock className="h-28 w-full rounded-xl" /><div className="grid grid-cols-2 gap-2 pt-2"><SkeletonBlock className="h-10 rounded-lg" /><SkeletonBlock className="h-10 rounded-lg" /></div></div></section></MallFrameSkeleton>
}

function MallOrderSkeleton() {
  return <MallFrameSkeleton><section className="rounded-2xl border border-slate-200/85 bg-white p-4 shadow-sm sm:p-5"><PanelHeading action={false} /><div className="mt-5 space-y-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3"><SkeletonBlock className="size-16 shrink-0 rounded-lg" /><div className="min-w-0 flex-1 space-y-2"><SkeletonBlock className="h-3.5 w-2/5" /><SkeletonBlock className="h-3 w-1/2" /></div><SkeletonBlock className="h-5 w-12" /></div>)}</div><div className="mt-5 rounded-xl bg-primary/[0.06] p-4"><SkeletonBlock className="h-3 w-28" /><SkeletonBlock className="mt-3 h-5 w-20" /></div></section></MallFrameSkeleton>
}

function CommandCenterSkeleton() {
  return <div className="min-h-screen bg-[#06142a] p-4 text-white sm:p-6" aria-hidden="true"><header className="flex h-14 items-center justify-between border-b border-white/10"><AppBrandSkeleton dark /><div className="flex items-center gap-3"><SkeletonBlock className="h-3 w-28 bg-white/12" /><SkeletonBlock className="h-8 w-20 rounded-lg bg-white/12" /></div></header><main className="mx-auto mt-5 max-w-[1800px]"><div className="grid gap-4 xl:grid-cols-[.85fr_1.35fr_.85fr]"><section className="space-y-4"><SkeletonBlock className="h-5 w-32 bg-white/14" /><SkeletonBlock className="h-44 w-full rounded-2xl bg-white/10" /><SkeletonBlock className="h-44 w-full rounded-2xl bg-white/10" /></section><section className="space-y-4"><SkeletonBlock className="h-8 w-64 bg-white/15" /><SkeletonBlock className="h-[360px] w-full rounded-2xl bg-[radial-gradient(circle_at_center,rgba(54,171,255,.22),rgba(255,255,255,.06)_60%)]" /><div className="grid grid-cols-3 gap-3"><SkeletonBlock className="h-24 rounded-xl bg-white/10" /><SkeletonBlock className="h-24 rounded-xl bg-white/10" /><SkeletonBlock className="h-24 rounded-xl bg-white/10" /></div></section><section className="space-y-4"><SkeletonBlock className="h-5 w-28 bg-white/14" /><SkeletonBlock className="h-48 w-full rounded-2xl bg-white/10" /><SkeletonBlock className="h-40 w-full rounded-2xl bg-white/10" /></section></div></main></div>
}

function PageSkeleton({ variant }: { variant: SkeletonVariant }) {
  if (variant === "command-center") return <CommandCenterSkeleton />
  if (variant === "parent-home") return <ParentHomeSkeleton />
  if (variant === "activity") return <ActivitySkeleton />
  if (variant === "table") return <TableSkeleton />
  if (variant === "workflow") return <WorkflowSkeleton />
  if (variant === "form") return <FormSkeleton />
  if (variant === "detail") return <DetailSkeleton />
  if (variant === "management") return <ManagementSkeleton />
  if (variant === "mall-home") return <MallHomeSkeleton />
  if (variant === "mall-product") return <MallProductSkeleton />
  if (variant === "mall-order") return <MallOrderSkeleton />
  return <WorkspaceSkeleton />
}

function getSkeletonVariant(pathname: string, rootWorkspace: boolean): SkeletonVariant {
  if (pathname === "/school-command-center" || pathname === "/student-command-center") return "command-center"
  if (pathname.startsWith("/points-mall/product")) return "mall-product"
  if (pathname.startsWith("/points-mall/cart") || pathname.startsWith("/points-mall/checkout") || pathname.startsWith("/points-mall/records")) return "mall-order"
  if (pathname === "/points-mall") return "mall-home"
  if (pathname === "/mall-management") return "management"
  if (pathname === "/activities") return "activity"
  if (pathname === "/class-evaluation" || pathname === "/class-ranking") return "table"
  if (pathname === "/award-cards" || pathname === "/offline-award-cards") return "workflow"
  if (pathname.includes("detail")) return "detail"
  if (pathname.includes("enroll")) return "form"
  if (new Set(["/score-entry", "/score-entry-management", "/comment-entry", "/comment-entry-management", "/semester-evaluation", "/pe-score-import", "/offline-award-cards", "/class-evaluation-config"]).has(pathname)) return "form"
  if (pathname === "/") return rootWorkspace ? "workspace" : "parent-home"
  return "workspace"
}

/** 为每个路由提供与实际首屏结构一致的加载骨架。 */
export function PageLoadingOverlay() {
  const pathname = usePathname() ?? "/"
  const [visible, setVisible] = useState(false)
  const [rootWorkspace, setRootWorkspace] = useState(false)
  const [embedded, setEmbedded] = useState(false)
  const variant = useMemo(() => getSkeletonVariant(pathname, rootWorkspace), [pathname, rootWorkspace])

  useEffect(() => {
    setEmbedded(new URLSearchParams(window.location.search).get("embedded") === "1")
    const rawUser = window.localStorage.getItem("mzlg-current-user-v1")
    if (pathname === "/" && rawUser) {
      try {
        setRootWorkspace(JSON.parse(rawUser)?.kind !== "parent")
      } catch {
        setRootWorkspace(false)
      }
    }
    setVisible(true)
    const timer = window.setTimeout(() => setVisible(false), 520)
    return () => window.clearTimeout(timer)
  }, [pathname])

  // 工作台外壳（侧栏与顶栏）保持可用，骨架只在 iframe 内部页面渲染。
  if (!visible || (pathname === "/" && !embedded)) return null

  return <div className="prototype-page-loading fixed inset-0 z-[100] overflow-auto" role="status" aria-live="polite" aria-label="页面加载中"><PageSkeleton variant={variant} /><span className="sr-only">页面加载中</span></div>
}
