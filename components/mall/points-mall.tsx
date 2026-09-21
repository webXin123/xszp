"use client"

import { useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Coins,
  Gift,
  Minus,
  Package,
  Plus,
  ReceiptText,
  Search,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { StandalonePageShell } from "@/components/evaluation/standalone-page-shell"
import { useEvaluation } from "@/lib/evaluation-context"
import { buildPointEntries, getSemesterRange, inRange } from "@/lib/points-utils"
import { cn } from "@/lib/utils"
import type { MallProduct, MallRedemption, ParentChild } from "@/lib/types"

type MallPageKind = "home" | "product" | "cart" | "checkout" | "records"

type Eligibility = { available: boolean; reason?: string }

const RECORD_FILTERS = [
  { value: "all", label: "全部" },
  { value: "pending", label: "待领取" },
  { value: "complete", label: "已领取" },
] as const

function formatMallDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value))
}

function MallProductImage({ product, className }: { product: Pick<MallProduct, "image" | "name">; className?: string }) {
  return <img src={product.image} alt={product.name} width={480} height={360} loading="lazy" className={cn("object-cover", className)} />
}

function useMallChild() {
  const searchParams = useSearchParams()
  const context = useEvaluation()
  const { currentUser, students, classes, grades, awardCards, honors, getStudentBalance } = context
  const parent = currentUser.kind === "parent" ? currentUser : null
  const requestedId = searchParams.get("student")
  const child = parent?.children.find((item) => item.studentId === requestedId) ?? parent?.children[0] ?? null
  const student = students.find((item) => item.id === child?.studentId) ?? null
  const schoolClass = classes.find((item) => item.id === child?.classId) ?? null
  const grade = grades.find((item) => item.id === child?.gradeId) ?? null
  const semesterPoints = useMemo(() => {
    if (!child) return new Map<string, number>()
    const semester = getSemesterRange(new Date())
    const points = new Map<string, number>()
    buildPointEntries(awardCards, honors)
      .filter((entry) => entry.studentId === child.studentId && inRange(entry.date, semester.start, semester.end))
      .forEach((entry) => points.set(entry.level1, (points.get(entry.level1) ?? 0) + entry.points))
    return points
  }, [awardCards, child, honors])
  return { ...context, parent, child, student, schoolClass, grade, balance: child ? getStudentBalance(child.studentId) : 0, semesterPoints }
}

function getEligibility(product: MallProduct, child: ParentChild | null, balance: number, semesterPoints: Map<string, number>) : Eligibility {
  if (!child) return { available: false, reason: "请先选择孩子" }
  if (product.status !== "listed") return { available: false, reason: "商品暂未上架" }
  if (product.stock <= 0) return { available: false, reason: "商品暂时缺货" }
  if (product.gradeIds.length > 0 && !product.gradeIds.includes(child.gradeId)) return { available: false, reason: "暂不面向当前年级" }
  if (product.requirementsEnabled && product.requirements.length > 0) {
    const checks = product.requirements.map((item) => (semesterPoints.get(item.level1) ?? 0) >= item.minimumPoints)
    if (product.requirementMode === "all" && !checks.every(Boolean)) return { available: false, reason: "未满足兑换条件" }
    if (product.requirementMode === "any" && !checks.some(Boolean)) return { available: false, reason: "未满足兑换条件" }
  }
  if (balance < product.pointsCost) return { available: false, reason: "积分不足" }
  return { available: true }
}

function MallFrame({ children, kind, title, child, childrenList, balance, cartCount, homePanel }: {
  children: ReactNode
  kind: MallPageKind
  title: string
  child: ParentChild | null
  childrenList: ParentChild[]
  balance: number
  cartCount: number
  homePanel?: ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [cartFabOffset, setCartFabOffset] = useState({ x: 0, y: 0 })
  const [isCartFabDragging, setIsCartFabDragging] = useState(false)
  const cartFabDragRef = useRef({ startX: 0, startY: 0, offsetX: 0, offsetY: 0 })
  const cartFabMovedRef = useRef(false)
  const childQuery = child ? `?student=${encodeURIComponent(child.studentId)}` : ""
  const switchStudentHref = (studentId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("student", studentId)
    return `${pathname}?${params.toString()}`
  }
  const startCartFabDrag = (event: PointerEvent<HTMLAnchorElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    cartFabMovedRef.current = false
    cartFabDragRef.current = { startX: event.clientX, startY: event.clientY, offsetX: cartFabOffset.x, offsetY: cartFabOffset.y }
    setIsCartFabDragging(true)
  }
  const moveCartFab = (event: PointerEvent<HTMLAnchorElement>) => {
    if (!isCartFabDragging) return
    const deltaX = event.clientX - cartFabDragRef.current.startX
    const deltaY = event.clientY - cartFabDragRef.current.startY
    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) cartFabMovedRef.current = true
    setCartFabOffset({ x: cartFabDragRef.current.offsetX + deltaX, y: cartFabDragRef.current.offsetY + deltaY })
  }
  const endCartFabDrag = () => setIsCartFabDragging(false)
  return <StandalonePageShell mainId={`points-mall-${kind}`} activeLabel="积分商城" activeIcon="shopping">
    <main id={`points-mall-${kind}`} tabIndex={-1} className="relative flex w-full min-w-0 flex-col gap-3 pb-4 pt-0">
      <header className="overflow-hidden rounded-2xl border border-[#d5e1f6] bg-white shadow-[0_18px_38px_-30px_rgba(48,78,140,0.58)]">
        {kind !== "home" && <div className="border-b border-primary/10 px-4 pt-3 sm:px-5"><button type="button" onClick={() => router.back()} className="inline-flex min-h-9 touch-manipulation items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"><ArrowLeft aria-hidden="true" className="size-4" />返回上一级</button></div>}
        <div className="bg-gradient-to-r from-primary/[0.09] via-white to-brand-green/[0.08] px-3 py-2 sm:px-5 sm:py-2.5">
          <div className="flex items-center justify-between gap-2 sm:flex-wrap sm:gap-2.5">
            <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:size-9 sm:rounded-xl"><ShoppingBag className="size-4" aria-hidden="true" /></span>
              <div className="min-w-0"><p className="hidden items-center gap-1.5 text-[11px] font-semibold text-primary sm:flex"><Sparkles className="size-3.5" aria-hidden="true" />成长兑换站</p><h1 className="truncate text-base font-bold tracking-tight text-foreground sm:text-lg">{title}</h1></div>
              <div className="flex min-w-0 max-w-[72px] border-l border-primary/15 pl-2 sm:max-w-[190px] sm:pl-3"><span className="block min-w-0 truncate text-xs font-semibold text-foreground sm:text-sm">{child?.name ?? "未选择学生"}<span className="hidden font-normal text-xs text-muted-foreground sm:inline"> · {child?.className ?? "请使用家长身份访问商城"}</span></span></div>
            </div>
            <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
              <span className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-brand-green/10 px-2 text-xs text-brand-green sm:min-h-9 sm:gap-1.5 sm:rounded-xl sm:px-2.5 sm:text-sm"><Coins className="size-3.5 sm:size-4" aria-hidden="true" /><span className="font-bold tabular-nums">{Math.max(0, balance)}</span><span className="text-[11px] font-semibold"><span className="sm:hidden">积分</span><span className="hidden sm:inline">可用积分</span></span></span>
              <Link href={`/points-mall/records${childQuery}`} aria-label="查看兑换记录" className="inline-flex min-h-8 touch-manipulation items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 sm:min-h-9 sm:rounded-xl sm:px-2.5"><ReceiptText className="size-4" aria-hidden="true" /><span className="hidden sm:inline">兑换记录</span></Link>
            </div>
          </div>
          {childrenList.length > 1 && <div className="mt-2 flex items-center gap-1.5 overflow-x-auto border-t border-primary/10 pt-2" role="tablist" aria-label="切换学生"><Users className="ml-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />{childrenList.map((item) => <Link key={item.studentId} href={switchStudentHref(item.studentId)} role="tab" aria-selected={item.studentId === child?.studentId} className={cn("inline-flex min-h-8 shrink-0 items-center rounded-lg px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45", item.studentId === child?.studentId ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-white/80 hover:text-foreground")}>{item.name}<span className="ml-1 text-[11px] opacity-75">{item.className}</span></Link>)}</div>}
        </div>
        {homePanel && <div className="border-t border-[#e4ebf7] px-3 py-2 sm:px-5 sm:py-3.5">{homePanel}</div>}
      </header>
      {children}
      <Link href={`/points-mall/cart${childQuery}`} aria-label={`购物车，${cartCount} 件商品；可拖动`} onPointerDown={startCartFabDrag} onPointerMove={moveCartFab} onPointerUp={endCartFabDrag} onPointerCancel={endCartFabDrag} onClick={(event) => { if (cartFabMovedRef.current) { event.preventDefault(); cartFabMovedRef.current = false } }} style={{ transform: `translate3d(${cartFabOffset.x}px, ${cartFabOffset.y}px, 0)` }} className={cn("absolute right-4 top-[54%] z-40 inline-flex size-13 touch-none select-none items-center justify-center rounded-2xl border border-white/70 bg-primary text-primary-foreground shadow-[0_14px_28px_-12px_rgba(48,86,192,0.78)] transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 sm:right-5", isCartFabDragging ? "cursor-grabbing" : "cursor-grab")}><ShoppingCart className="size-6" aria-hidden="true" />{cartCount > 0 && <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full border-2 border-white bg-brand-orange text-[10px] font-bold text-white">{cartCount}</span>}</Link>
    </main>
  </StandalonePageShell>
}

function MallAccessDenied() {
  return <StandalonePageShell mainId="points-mall-access" activeLabel="积分商城" activeIcon="shopping"><main id="points-mall-access" className="flex min-h-[420px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-primary/25 bg-white/75 p-8 text-center"><ShoppingBag className="size-10 text-primary" aria-hidden="true" /><h1 className="mt-4 text-lg font-bold text-foreground">请使用家长身份访问积分商城</h1><p className="mt-2 text-sm text-muted-foreground">可在右上角身份切换中选择家长身份后，为孩子兑换成长礼物。</p><Link href="/" className="mt-5 inline-flex min-h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">返回首页</Link></main></StandalonePageShell>
}

export function PointsMallHome() {
  const { parent, child, mallProducts, mallConfig, mallCartItems, balance, semesterPoints } = useMallChild()
  const [category, setCategory] = useState("全部")
  const [search, setSearch] = useState("")
  if (!parent) return <MallAccessDenied />
  const cartCount = mallCartItems.filter((item) => item.studentId === child?.studentId).reduce((sum, item) => sum + item.quantity, 0)
  const categories = ["全部", ...Array.from(new Set(mallProducts.filter((item) => item.status === "listed").map((item) => item.category)))]
  const products = mallProducts.filter((item) => item.status === "listed").filter((item) => category === "全部" || item.category === category).filter((item) => `${item.name}${item.description}`.includes(search.trim()))
  const isOpen = (!mallConfig.startAt || new Date() >= new Date(mallConfig.startAt)) && (!mallConfig.endAt || new Date() <= new Date(mallConfig.endAt))
  const childQuery = `student=${encodeURIComponent(child?.studentId ?? "")}`
  return <MallFrame kind="home" title="积分商城" child={child} childrenList={parent.children} balance={balance} cartCount={cartCount} homePanel={<><div className="flex items-center justify-between gap-2"><div className="min-w-0 sm:block"><p className="text-xs font-semibold text-primary">{isOpen ? "正在开放" : "暂未开放"}</p><h2 className="mt-0.5 hidden text-base font-bold text-foreground sm:block">用每一分成长，兑换一份喜欢</h2><p className="mt-1 hidden text-xs text-muted-foreground sm:block">{mallConfig.notice}</p></div><span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-lg bg-primary/[0.07] px-2 py-1 text-xs font-semibold text-primary sm:px-3 sm:py-1.5"><CalendarClock className="size-3.5" aria-hidden="true" />至 {mallConfig.endAt ? new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" }).format(new Date(mallConfig.endAt)) : "长期"}</span></div><div className="mt-2 flex flex-col gap-2 sm:mt-3 sm:flex-row sm:gap-2.5"><label className="relative flex min-w-0 flex-1 items-center"><Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} name="mall-search" autoComplete="off" aria-label="搜索商品" placeholder="搜索商品名称…" className="h-9 w-full rounded-xl border border-[#d9e4f4] bg-[#fbfdff] pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 sm:h-10" /></label><div role="tablist" aria-label="商品分类" className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-[#f2f6fd] p-1">{categories.map((item) => <button key={item} type="button" role="tab" aria-selected={category === item} onClick={() => setCategory(item)} className={cn("min-h-8 shrink-0 touch-manipulation rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45", category === item ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}>{item}</button>)}</div></div></>}>
    <section aria-labelledby="mall-product-list-title"><div className="mb-2.5 flex items-center justify-between sm:mb-3"><h2 id="mall-product-list-title" className="text-sm font-bold text-foreground sm:text-base">商品中心</h2><span className="text-xs text-muted-foreground">共 {products.length} 件商品</span></div>{products.length === 0 ? <div className="rounded-2xl border border-dashed border-primary/25 bg-white/70 px-4 py-14 text-center text-sm text-muted-foreground">暂无符合条件的商品</div> : <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(220px,280px))] sm:justify-start sm:gap-3">{products.map((product) => { const eligibility = getEligibility(product, child, balance, semesterPoints); return <Link key={product.id} href={`/points-mall/product?${childQuery}&product=${encodeURIComponent(product.id)}`} className="group min-w-0 touch-manipulation overflow-hidden rounded-xl border border-[#dce6f5] bg-white shadow-[0_12px_24px_-22px_rgba(48,78,140,.58)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_18px_30px_-22px_rgba(48,78,140,.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 motion-reduce:transform-none sm:max-w-[280px] sm:rounded-2xl"><div className="aspect-[4/3] overflow-hidden bg-primary/[0.04] sm:aspect-[1.16]"><MallProductImage product={product} className="size-full transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none" /></div><div className="p-2.5 sm:p-3"><p className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-foreground sm:line-clamp-1 sm:min-h-0">{product.name}</p><p className="mt-1 hidden min-h-9 text-xs leading-4 text-muted-foreground sm:line-clamp-2">{product.description}</p><div className="mt-2 flex min-w-0 items-center justify-between gap-1.5 sm:mt-3 sm:gap-2"><span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-brand-orange sm:text-sm"><Coins className="size-3.5" aria-hidden="true" />{product.pointsCost}</span><span title={eligibility.available ? "可兑换" : eligibility.reason} className={cn("min-w-0 max-w-full truncate rounded-full px-2 py-1 text-[10px] font-semibold sm:px-2.5 sm:text-[11px]", eligibility.available ? "bg-brand-green/12 text-brand-green" : "bg-muted text-muted-foreground")}>{eligibility.available ? "可兑换" : eligibility.reason}</span></div></div></Link> })}</div>}</section>
  </MallFrame>
}

export function PointsMallProductPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { parent, child, mallProducts, mallCartItems, addMallCartItem, balance, semesterPoints } = useMallChild()
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState("")
  if (!parent) return <MallAccessDenied />
  const product = mallProducts.find((item) => item.id === searchParams.get("product"))
  const cartCount = mallCartItems.filter((item) => item.studentId === child?.studentId).reduce((sum, item) => sum + item.quantity, 0)
  if (!product) return <MallFrame kind="product" title="商品详情" child={child} childrenList={parent.children} balance={balance} cartCount={cartCount}><div className="rounded-2xl border border-dashed border-primary/25 bg-white p-10 text-center"><p className="text-sm text-muted-foreground">商品不存在或已删除</p><Link href={`/points-mall?student=${encodeURIComponent(child?.studentId ?? "")}`} className="mt-4 inline-flex text-sm font-semibold text-primary">返回商品中心</Link></div></MallFrame>
  const eligibility = getEligibility(product, child, balance, semesterPoints)
  const childQuery = `student=${encodeURIComponent(child?.studentId ?? "")}`
  const setSafeQuantity = (next: number) => setQuantity(Math.min(Math.max(1, next), Math.max(1, product.stock)))
  return <MallFrame kind="product" title="商品详情" child={child} childrenList={parent.children} balance={balance} cartCount={cartCount}>
    <section className="grid overflow-hidden rounded-2xl border border-[#d8e4f5] bg-white shadow-[0_18px_38px_-30px_rgba(48,78,140,.6)] md:grid-cols-[minmax(0,1fr)_minmax(360px,.88fr)]"><div className="min-h-[280px] bg-primary/[0.04] md:min-h-[460px]"><MallProductImage product={product} className="size-full" /></div><div className="flex flex-col p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-primary">{product.category}</p><h1 className="mt-1 text-xl font-bold tracking-tight text-foreground">{product.name}</h1></div><span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", product.stock > 0 ? "bg-brand-green/12 text-brand-green" : "bg-muted text-muted-foreground")}>{product.stock > 0 ? `库存 ${product.stock}` : "暂时缺货"}</span></div><p className="mt-4 text-sm leading-6 text-muted-foreground">{product.description}</p><div className="mt-5 rounded-xl bg-primary/[0.06] p-4"><span className="text-xs text-muted-foreground">所需积分</span><p className="mt-1 flex items-baseline gap-1 text-brand-orange"><Coins className="size-5" aria-hidden="true" /><strong className="text-2xl tabular-nums">{product.pointsCost}</strong><span className="text-sm font-semibold">积分</span></p></div><div className="mt-4 rounded-xl border border-[#e3eaf5] bg-[#fbfcff] p-4"><p className="text-sm font-bold text-foreground">兑换条件</p>{product.requirementsEnabled && product.requirements.length > 0 ? <ul className="mt-2 space-y-2">{product.requirements.map((item) => { const passed = (semesterPoints.get(item.level1) ?? 0) >= item.minimumPoints; return <li key={item.level1} className="flex items-center justify-between gap-3 text-xs"><span className="text-muted-foreground">{item.level1}本学期积分 ≥ {item.minimumPoints} 分</span><span className={cn("inline-flex items-center gap-1 font-semibold", passed ? "text-brand-green" : "text-muted-foreground")}><CheckCircle2 className="size-3.5" aria-hidden="true" />{passed ? "已达成" : "未达成"}</span></li> })}<li className="pt-1 text-xs text-muted-foreground">需{product.requirementMode === "all" ? "同时满足全部" : "满足任意一项"}条件</li></ul> : <p className="mt-2 text-xs text-muted-foreground">无附加条件，满足年级与积分要求即可兑换。</p>}</div><div className="mt-4 flex items-center justify-between gap-3"><span className="text-sm font-semibold text-foreground">兑换数量</span><div className="inline-flex items-center rounded-xl border border-[#dce6f5] bg-white"><button type="button" aria-label="减少数量" onClick={() => setSafeQuantity(quantity - 1)} disabled={quantity <= 1} className="flex size-9 items-center justify-center text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"><Minus className="size-4" aria-hidden="true" /></button><span className="flex min-w-10 justify-center text-sm font-bold tabular-nums text-foreground">{quantity}</span><button type="button" aria-label="增加数量" onClick={() => setSafeQuantity(quantity + 1)} disabled={quantity >= product.stock} className="flex size-9 items-center justify-center text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"><Plus className="size-4" aria-hidden="true" /></button></div></div><p aria-live="polite" className={cn("mt-3 text-xs", eligibility.available ? "text-muted-foreground" : "font-semibold text-brand-orange")}>{eligibility.available ? `本次将消耗 ${product.pointsCost * quantity} 积分，可用积分 ${balance} 分。` : eligibility.reason}</p><div className="mt-auto grid grid-cols-2 gap-2 pt-5"><Button variant="outline" disabled={!eligibility.available} onClick={() => { addMallCartItem(child!.studentId, product.id, quantity); setMessage("已加入购物车") }}><ShoppingCart className="size-4" />加入购物车</Button><Button disabled={!eligibility.available} onClick={() => router.push(`/points-mall/checkout?${childQuery}&direct=${encodeURIComponent(product.id)}&quantity=${quantity}`)}><Gift className="size-4" />立即兑换</Button></div>{message && <p role="status" aria-live="polite" className="mt-3 text-center text-xs font-semibold text-brand-green">{message}，可前往购物车确认。</p>}</div></section>
  </MallFrame>
}

export function PointsMallCartPage() {
  const { parent, child, mallProducts, mallCartItems, updateMallCartItem, removeMallCartItem, balance } = useMallChild()
  if (!parent) return <MallAccessDenied />
  const cartItems = mallCartItems.filter((item) => item.studentId === child?.studentId).flatMap((item) => { const product = mallProducts.find((candidate) => candidate.id === item.productId); return product ? [{ ...item, product }] : [] })
  const total = cartItems.reduce((sum, item) => sum + item.product.pointsCost * item.quantity, 0)
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const childQuery = `student=${encodeURIComponent(child?.studentId ?? "")}`
  return <MallFrame kind="cart" title="购物车" child={child} childrenList={parent.children} balance={balance} cartCount={cartCount}>
    <section className="rounded-2xl border border-[#dbe5f5] bg-white p-4 shadow-[0_16px_32px_-28px_rgba(48,78,140,.55)] sm:p-5">{cartItems.length === 0 ? <div className="flex min-h-[260px] flex-col items-center justify-center text-center"><ShoppingCart className="size-10 text-primary/35" aria-hidden="true" /><p className="mt-3 text-sm font-semibold text-foreground">购物车还是空的</p><p className="mt-1 text-xs text-muted-foreground">去商品中心挑选一份成长礼物吧。</p><Link href={`/points-mall?${childQuery}`} className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">去逛逛</Link></div> : <><div className="flex items-center justify-between gap-3"><h1 className="text-base font-bold text-foreground">已选商品</h1><span className="text-xs text-muted-foreground">共 {cartCount} 件</span></div><ul className="mt-4 space-y-3">{cartItems.map(({ product, quantity }) => <li key={product.id} className="flex gap-3 rounded-xl border border-[#e1e8f4] bg-[#fbfcff] p-3"><div className="size-20 shrink-0 overflow-hidden rounded-lg bg-primary/[0.04]"><MallProductImage product={product} className="size-full" /></div><div className="min-w-0 flex-1"><div className="flex gap-2"><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-foreground">{product.name}</p><p className="mt-1 text-xs text-brand-orange"><Coins className="mr-1 inline size-3.5" aria-hidden="true" />{product.pointsCost} 积分/件</p></div><button type="button" aria-label={`移除${product.name}`} onClick={() => removeMallCartItem(child!.studentId, product.id)} className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"><Trash2 className="size-4" aria-hidden="true" /></button></div><div className="mt-3 flex items-center justify-between"><span className="text-xs text-muted-foreground">库存 {product.stock}</span><div className="inline-flex items-center rounded-lg border border-[#dce6f5] bg-white"><button type="button" aria-label={`减少${product.name}数量`} onClick={() => updateMallCartItem(child!.studentId, product.id, quantity - 1)} className="flex size-8 items-center justify-center text-muted-foreground hover:bg-muted"><Minus className="size-3.5" aria-hidden="true" /></button><span className="flex min-w-8 justify-center text-xs font-bold tabular-nums">{quantity}</span><button type="button" aria-label={`增加${product.name}数量`} onClick={() => updateMallCartItem(child!.studentId, product.id, Math.min(product.stock, quantity + 1))} disabled={quantity >= product.stock} className="flex size-8 items-center justify-center text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"><Plus className="size-3.5" aria-hidden="true" /></button></div></div></div></li>)}</ul><div className="mt-5 flex flex-col gap-3 border-t border-[#e4ebf6] pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-foreground">合计 <span className="ml-1 text-xl font-bold tabular-nums text-brand-orange">{total}</span> 积分</p><Link href={`/points-mall/checkout?${childQuery}`} className={cn("inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-bold text-primary-foreground", total > balance ? "pointer-events-none bg-muted text-muted-foreground" : "bg-primary shadow-[0_10px_18px_-12px_rgba(48,86,192,0.8)] transition-colors hover:bg-primary/90")}>{total > balance ? "积分不足" : "去确认兑换"}<ChevronRight className="ml-1 size-4" aria-hidden="true" /></Link></div></>}</section>
  </MallFrame>
}

export function PointsMallCheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { parent, child, mallProducts, mallCartItems, balance, semesterPoints, mallConfig, redeemMallOrder, clearMallCart } = useMallChild()
  const [message, setMessage] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  if (!parent) return <MallAccessDenied />
  const directId = searchParams.get("direct")
  const directQuantity = Math.max(1, Number(searchParams.get("quantity") ?? 1))
  const items = directId ? [{ productId: directId, quantity: directQuantity }] : mallCartItems.filter((item) => item.studentId === child?.studentId).map((item) => ({ productId: item.productId, quantity: item.quantity }))
  const checkoutItems = items.flatMap((item) => { const product = mallProducts.find((candidate) => candidate.id === item.productId); return product ? [{ product, quantity: item.quantity }] : [] })
  const total = checkoutItems.reduce((sum, item) => sum + item.product.pointsCost * item.quantity, 0)
  const invalid = checkoutItems.find((item) => !getEligibility(item.product, child, balance, semesterPoints).available || item.quantity > item.product.stock)
  const cartCount = mallCartItems.filter((item) => item.studentId === child?.studentId).reduce((sum, item) => sum + item.quantity, 0)
  const handleExchange = () => {
    if (!child) return
    const result = redeemMallOrder(child.studentId, items)
    if (!result.ok) { setMessage(result.reason ?? "兑换失败，请稍后重试"); return }
    if (!directId) clearMallCart(child.studentId)
    router.replace(`/points-mall/records?student=${encodeURIComponent(child.studentId)}&success=${encodeURIComponent(result.orderIds?.[0] ?? "")}`)
  }
  return <MallFrame kind="checkout" title="确认兑换" child={child} childrenList={parent.children} balance={balance} cartCount={cartCount}>
    <section className="w-full rounded-2xl border border-[#dbe5f5] bg-white p-4 shadow-[0_16px_32px_-28px_rgba(48,78,140,.55)] sm:p-5"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><ReceiptText className="size-5" aria-hidden="true" /></span><div><h1 className="text-base font-bold text-foreground">请确认兑换清单</h1><p className="mt-0.5 text-xs text-muted-foreground">兑换成功后请到 {mallConfig.exchangeLocation} 领取。</p></div></div>{checkoutItems.length === 0 ? <div className="mt-6 rounded-xl border border-dashed border-primary/25 p-10 text-center text-sm text-muted-foreground">暂无待兑换商品</div> : <ul className="mt-5 grid gap-3 md:grid-cols-2">{checkoutItems.map(({ product, quantity }) => <li key={product.id} className="flex min-h-24 items-center gap-3 rounded-xl border border-[#e1e8f4] bg-[#fbfcff] p-3"><div className="size-16 shrink-0 overflow-hidden rounded-lg"><MallProductImage product={product} className="size-full" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-foreground">{product.name}</p><p className="mt-1 text-xs text-muted-foreground">{product.pointsCost} 积分 × {quantity}</p></div><span className="shrink-0 text-sm font-bold tabular-nums text-brand-orange">{product.pointsCost * quantity}</span></li>)}</ul>}<div className="mt-5 rounded-xl bg-primary/[0.06] p-4"><div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">当前可用积分</span><strong className="tabular-nums text-foreground">{balance} 分</strong></div><div className="mt-2 flex items-center justify-between text-base"><span className="font-semibold text-foreground">本次消耗</span><strong className="text-xl tabular-nums text-brand-orange">{total} 分</strong></div></div><p aria-live="polite" className={cn("mt-3 text-xs", message || invalid || total > balance ? "font-semibold text-brand-orange" : "text-muted-foreground")}>{message || (invalid ? `${invalid.product.name} 当前不满足兑换条件` : total > balance ? "可用积分不足" : "确认后将生成兑换凭证，可到线下领取商品。")}</p><div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => router.back()}>返回修改</Button><Button disabled={checkoutItems.length === 0 || !!invalid || total > balance} onClick={() => setConfirmOpen(true)}><Gift className="size-4" />确认兑换</Button></div></section>
    <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>确认提交兑换？</DialogTitle><DialogDescription>提交后将扣除积分并生成线下领取凭证。</DialogDescription></DialogHeader><div className="rounded-xl bg-primary/[0.06] p-4"><div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">兑换商品</span><strong className="text-foreground">{checkoutItems.length} 件</strong></div><div className="mt-2 flex items-center justify-between text-sm"><span className="text-muted-foreground">需消耗积分</span><strong className="text-lg tabular-nums text-brand-orange">{total} 分</strong></div><div className="mt-2 flex items-center justify-between text-sm"><span className="text-muted-foreground">领取地点</span><strong className="text-foreground">{mallConfig.exchangeLocation}</strong></div></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setConfirmOpen(false)}>再想想</Button><Button onClick={() => { setConfirmOpen(false); handleExchange() }}><CheckCircle2 className="size-4" />确认提交</Button></div></DialogContent></Dialog>
  </MallFrame>
}

export function PointsMallRecordsPage() {
  const searchParams = useSearchParams()
  const { parent, child, mallCartItems, mallRedemptions, balance } = useMallChild()
  const [filter, setFilter] = useState<(typeof RECORD_FILTERS)[number]["value"]>("all")
  const [voucher, setVoucher] = useState<MallRedemption | null>(null)
  if (!parent) return <MallAccessDenied />
  const allRecords = mallRedemptions.filter((item) => item.studentId === child?.studentId).sort((a, b) => b.redeemedAt.localeCompare(a.redeemedAt))
  const visible = allRecords.filter((item) => filter === "all" ? true : filter === "pending" ? !item.offlineRedeemed : item.offlineRedeemed)
  const cartCount = mallCartItems.filter((item) => item.studentId === child?.studentId).reduce((sum, item) => sum + item.quantity, 0)
  const successId = searchParams.get("success")
  const childQuery = `student=${encodeURIComponent(child?.studentId ?? "")}`
  return <MallFrame kind="records" title="兑换记录" child={child} childrenList={parent.children} balance={balance} cartCount={cartCount}>
    {successId && <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-xl border border-brand-green/20 bg-brand-green/10 px-4 py-3 text-sm font-semibold text-brand-green"><CheckCircle2 className="size-4" aria-hidden="true" />兑换成功，已生成领取凭证。</div>}
    <section className="rounded-2xl border border-[#dbe5f5] bg-white p-4 shadow-[0_16px_32px_-28px_rgba(48,78,140,.55)] sm:p-5"><div role="tablist" aria-label="兑换记录状态" className="grid grid-cols-3 rounded-xl bg-[#f2f6fd] p-1">{RECORD_FILTERS.map((item) => <button key={item.value} type="button" role="tab" aria-selected={filter === item.value} onClick={() => setFilter(item.value)} className={cn("min-h-9 rounded-lg text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45", filter === item.value ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}>{item.label}</button>)}</div>{visible.length === 0 ? <div className="flex min-h-[280px] flex-col items-center justify-center text-center"><Package className="size-10 text-primary/35" aria-hidden="true" /><p className="mt-3 text-sm font-semibold text-foreground">暂无兑换记录</p><Link href={`/points-mall?${childQuery}`} className="mt-3 text-sm font-semibold text-primary">去商品中心看看</Link></div> : <ul className="mt-4 space-y-3">{visible.map((item) => <li key={item.id} className="rounded-xl border border-[#e0e8f4] bg-[#fbfcff] p-3"><div className="flex items-start gap-3"><div className="size-16 shrink-0 overflow-hidden rounded-lg bg-white"><img src={item.productImage} alt={item.productName} width={160} height={160} loading="lazy" className="size-full object-cover" /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-bold text-foreground">{item.productName}</p><span className={cn("shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold", item.offlineRedeemed ? "bg-brand-green/12 text-brand-green" : "bg-brand-orange/12 text-brand-orange")}>{item.offlineRedeemed ? "已领取" : "待领取"}</span></div><p className="mt-1 text-xs text-muted-foreground">兑换时间：{formatMallDate(item.redeemedAt)}</p><p className="mt-1 text-xs text-muted-foreground">数量 ×{item.quantity} · 消耗 <span className="font-semibold text-brand-orange">{item.totalPoints} 分</span></p></div></div><div className="mt-3 flex items-center justify-between border-t border-[#e7edf6] pt-3"><span className="truncate text-[11px] text-muted-foreground">订单号：{item.orderNo}</span><button type="button" onClick={() => setVoucher(item)} className="inline-flex min-h-8 items-center rounded-lg bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">查看凭证</button></div></li>)}</ul>}</section><VoucherDialog redemption={voucher} child={child} onOpenChange={(open) => !open && setVoucher(null)} />
  </MallFrame>
}

function VoucherDialog({ redemption, child, onOpenChange }: { redemption: MallRedemption | null; child: ParentChild | null; onOpenChange: (open: boolean) => void }) {
  return <Dialog open={!!redemption} onOpenChange={onOpenChange}><DialogContent className="max-w-sm overflow-hidden border border-[#d9e5f5] bg-[#fbfdff] p-0"><div className="h-2 bg-gradient-to-r from-primary via-primary-2 to-brand-green" /><div className="p-5"><DialogHeader><DialogTitle className="flex items-center gap-2"><BadgeCheck className="size-5 text-primary" aria-hidden="true" />兑换凭证</DialogTitle><DialogDescription>{child?.name} · {child?.className}</DialogDescription></DialogHeader>{redemption && <div className="mt-5 rounded-xl border border-dashed border-primary/30 bg-white p-4"><div className="grid aspect-square place-items-center rounded-lg bg-[repeating-linear-gradient(45deg,#172033_0_5px,#ffffff_5px_10px)] p-4"><div className="grid size-full place-items-center border-[10px] border-white bg-white text-center"><div><p className="text-2xl font-black tracking-[0.28em] text-foreground">积分商城</p><p className="mt-2 text-xs font-semibold text-primary">{redemption.orderNo}</p></div></div></div><div className="mt-4 flex gap-3 border-t border-dashed border-[#dce6f5] pt-4"><img src={redemption.productImage} alt={redemption.productName} width={64} height={64} className="size-16 rounded-lg object-cover" /><div className="min-w-0"><p className="truncate text-sm font-bold text-foreground">{redemption.productName}</p><p className="mt-1 text-xs text-muted-foreground">数量 ×{redemption.quantity} · {redemption.totalPoints} 积分</p><p className="mt-1 text-xs text-muted-foreground">{formatMallDate(redemption.redeemedAt)}</p></div></div></div>}<p className="mt-4 text-center text-xs text-muted-foreground">请向工作人员出示此凭证领取商品</p></div></DialogContent></Dialog>
}
