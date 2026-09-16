"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Flag,
  ImagePlus,
  Palette,
  Plus,
  Save,
  Settings2,
  ShieldCheck,
  Smile,
  Trash2,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandInput, CommandList, CommandItem } from "@/components/ui/command"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useEvaluation } from "@/lib/evaluation-context"
import { usePermission } from "@/lib/use-permission"
import { TEACHERS } from "@/lib/mock-data"
import { INDICATOR_GROUPS, LEVEL1_LIST } from "@/lib/scoring-utils"
import type { ClassRatingConfig, FlagConfig } from "@/lib/types"

type ConfigPage = "indicator" | "flag" | "appearance"
type Permission = "all" | "specified"
type NodeKind = "level1" | "level2" | "level3"
type FlagPeriod = FlagConfig["period"]

interface Level3Item {
  id: string
  name: string
  permission: Permission
  memberIds: string[]
  defaultScore: number
  description: string
}

interface Level2Node {
  id: string
  name: string
  permission: Permission
  memberIds: string[]
  items: Level3Item[]
}

interface Level1Node {
  id: string
  name: string
  permission: Permission
  memberIds: string[]
  children: Level2Node[]
}

type AutoIssueDay = "saturday" | "sunday" | "monday"

type SelectedNode =
  | { kind: "level1"; node: Level1Node; level1: Level1Node }
  | { kind: "level2"; node: Level2Node; level1: Level1Node }
  | { kind: "level3"; node: Level3Item; level1: Level1Node; level2: Level2Node }

type NodePatch = Partial<Pick<Level3Item, "name" | "permission" | "memberIds" | "defaultScore" | "description">>
type AddTarget = { kind: NodeKind; parentId?: string } | null

const PERMISSION_MEMBERS = TEACHERS.map(({ id, name, title }) => ({ id, name, title }))

const createInitialTree = (): Level1Node[] =>
  LEVEL1_LIST.map((level1, level1Index) => ({
    id: `level1-${level1Index}`,
    name: level1,
    permission: "all",
    memberIds: [],
    children: INDICATOR_GROUPS
      .filter((group) => group.level1 === level1)
      .map((group, level2Index) => ({
        id: `level2-${level1Index}-${level2Index}`,
        name: group.level2,
        permission: "all",
        memberIds: [],
        items: group.items.map((item) => ({
          id: item.id,
          name: item.name,
          permission: item.id === "ly-1" ? "specified" : "all",
          memberIds: item.id === "ly-1" ? ["teacher-zhao"] : [],
          defaultScore: item.penalty,
          description: "用于记录班级日常表现，可按实际情况补充说明。",
        })),
      })),
  }))

const autoIssueOptions: { id: AutoIssueDay; label: string }[] = [
  { id: "saturday", label: "本周六" },
  { id: "sunday", label: "本周日" },
  { id: "monday", label: "下周一" },
]

const ratingRuleOptions = [
  { id: "rank" as const, label: "按照排名", description: "按班级在排行榜中的名次匹配" },
  { id: "score" as const, label: "按照分数区间", description: "按班级总分落入的区间匹配" },
]

const DEFAULT_ICON_PATH = "/xszp/images"

const defaultRatingImage: Record<ClassRatingConfig["defaultImage"], string> = {
  smile: `${DEFAULT_ICON_PATH}/rating-smile.svg`,
  cry: `${DEFAULT_ICON_PATH}/rating-cry.svg`,
}

const FIVE_EDUCATION_OPTIONS: Record<string, Record<string, string[]>> = {
  "德育": { "文明礼仪": ["主动问好", "规范使用礼貌用语"], "责任担当": ["主动承担班级事务", "按时完成值日"] },
  "智育": { "学习习惯": ["专注听讲", "按时完成作业"], "探究实践": ["积极提出问题", "完成探究任务"] },
  "体育": { "健康运动": ["坚持每日锻炼", "积极参加活动"], "运动安全": ["遵守运动规则", "做好运动防护"] },
  "美育": { "审美表达": ["发现生活之美", "完成艺术创作"], "文化欣赏": ["参与文化活动", "分享欣赏感受"] },
  "劳育": { "劳动习惯": ["主动整理环境", "认真完成劳动任务"], "生活技能": ["掌握生活技能", "爱惜公共物品"] },
}

function findSelectedNode(tree: Level1Node[], id: string): SelectedNode | null {
  for (const level1 of tree) {
    if (level1.id === id) return { kind: "level1", node: level1, level1 }
    for (const level2 of level1.children) {
      if (level2.id === id) return { kind: "level2", node: level2, level1 }
      const level3 = level2.items.find((item) => item.id === id)
      if (level3) return { kind: "level3", node: level3, level1, level2 }
    }
  }
  return null
}

function patchNode(tree: Level1Node[], id: string, patch: NodePatch): Level1Node[] {
  return tree.map((level1) => {
    if (level1.id === id) return { ...level1, ...patch }
    return {
      ...level1,
      children: level1.children.map((level2) => {
        if (level2.id === id) return { ...level2, ...patch }
        return {
          ...level2,
          items: level2.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        }
      }),
    }
  })
}

function removeNode(tree: Level1Node[], id: string): Level1Node[] {
  return tree
    .filter((level1) => level1.id !== id)
    .map((level1) => ({
      ...level1,
      children: level1.children
        .filter((level2) => level2.id !== id)
        .map((level2) => ({ ...level2, items: level2.items.filter((item) => item.id !== id) })),
    }))
}

function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        "relative flex h-9 w-14 shrink-0 items-center rounded-full p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        checked ? "bg-primary" : "bg-muted",
      )}
    >
      <span className={cn("size-7 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-5" : "translate-x-0")} />
    </button>
  )
}

function PermissionControl({
  value,
  memberIds,
  name,
  onChange,
  onMemberIdsChange,
}: {
  value: Permission
  memberIds: string[]
  name: string
  onChange: (value: Permission) => void
  onMemberIdsChange: (memberIds: string[]) => void
}) {
  const [memberPickerOpen, setMemberPickerOpen] = useState(false)
  const selectedMembers = PERMISSION_MEMBERS.filter((member) => memberIds.includes(member.id))

  const selectPermission = (nextValue: Permission) => {
    onChange(nextValue)
    setMemberPickerOpen(false)
  }

  const toggleMember = (memberId: string) => {
    onMemberIdsChange(memberIds.includes(memberId) ? memberIds.filter((id) => id !== memberId) : [...memberIds, memberId])
  }

  return (
    <div className="space-y-2.5">
      <div role="radiogroup" aria-label="指标权限范围" className="grid grid-cols-2 gap-1 rounded-xl border border-border/70 bg-background/45 p-1">
        {([
          { value: "all" as const, label: "全部成员", hint: "当前班级全部成员" },
          { value: "specified" as const, label: "指定成员", hint: "仅允许勾选成员" },
        ]).map((option) => (
          <label key={option.value} className={cn("flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2.5 text-xs transition", value === option.value ? "bg-primary/10 text-primary shadow-sm" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground")}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => selectPermission(option.value)}
              className="size-4 shrink-0 accent-[var(--primary)]"
            />
            <span className="min-w-0">
              <span className="block font-semibold">{option.label}</span>
              <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">{option.hint}</span>
            </span>
          </label>
        ))}
      </div>

      {value === "specified" && (
        <div className="rounded-xl border border-primary/20 bg-primary/[0.035] p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Users aria-hidden="true" className="size-4" /></span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">指定成员信息</p>
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">仅添加的成员可以使用该指标进行评价。</p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-background/75 px-2 py-1 text-[11px] font-semibold text-primary">已选 {selectedMembers.length} 人</span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {selectedMembers.length > 0 ? selectedMembers.map((member) => <span key={member.id} className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-background/70 px-2.5 py-1.5 text-[11px] font-semibold text-foreground"><span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">{member.name.slice(0, 1)}</span>{member.name}</span>) : <span className="text-[11px] text-muted-foreground">尚未添加成员，请先添加成员信息。</span>}
          </div>

          <Popover open={memberPickerOpen} onOpenChange={setMemberPickerOpen}>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  aria-label={selectedMembers.length > 0 ? "调整指定成员" : "添加指定成员"}
                  className="mt-3 flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border border-primary/20 bg-background/65 px-3 text-left text-xs font-semibold text-primary transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                />
              }
            >
              <span>{selectedMembers.length > 0 ? "调整指定成员" : "添加成员"}</span>
              <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform data-[popup-open]:rotate-180" />
            </PopoverTrigger>
            <PopoverContent align="start" className="glass-surface w-[min(21rem,calc(100vw-2rem))] p-1.5">
              <Command>
                <CommandInput aria-label="搜索成员" placeholder="搜索成员…" />
                <CommandList className="max-h-64">
                  <CommandEmpty>未找到匹配成员</CommandEmpty>
                  {PERMISSION_MEMBERS.map((member) => {
                    const checked = memberIds.includes(member.id)
                    return (
                      <CommandItem key={member.id} value={`${member.name} ${member.title}`} onSelect={() => toggleMember(member.id)} data-checked={checked} aria-selected={checked} aria-label={`${member.name}，${checked ? "已选择" : "未选择"}`} className={cn("min-h-11 gap-2.5 rounded-lg px-2.5 py-2", checked && "bg-primary/10")}>
                        <span aria-hidden="true" className={cn("flex size-4 shrink-0 items-center justify-center rounded border transition", checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40")}>{checked && <Check className="size-3" />}</span>
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">{member.name.slice(0, 1)}</span>
                        <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-foreground">{member.name}</span><span className="block truncate text-[11px] text-muted-foreground">{member.title}</span></span>
                      </CommandItem>
                    )
                  })}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  )
}

interface FlagEditorProps {
  period: FlagPeriod
  items: FlagConfig[]
  onAdd: () => void
  onChange: (id: string, patch: Partial<FlagConfig>) => void
  onRemove: (id: string) => void
}

function FlagEditor({ period, items, onAdd, onChange, onRemove }: FlagEditorProps) {
  const isWeek = period === "week"
  const title = isWeek ? "周流动红旗" : "月流动红旗"
  const description = isWeek ? "每周评选一次，适合即时班级表现反馈。" : "每月评选一次，适合阶段性班级荣誉。"
  const [imageError, setImageError] = useState("")

  const handleFlagImage = (id: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      event.target.value = ""
      setImageError("流动红旗图片不能超过 2MB")
      return
    }
    setImageError("")
    const reader = new FileReader()
    reader.onload = () => onChange(id, { image: typeof reader.result === "string" ? reader.result : null })
    reader.readAsDataURL(file)
  }

  return (
    <section className="config-editor-panel rounded-2xl p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", isWeek ? "bg-brand-yellow/15 text-brand-yellow" : "bg-brand-orange/15 text-brand-orange")}>
            <Flag className="size-5" />
          </span>
          <div>
            <h2 className="text-base font-bold">{title}</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={onAdd} className="h-10 shrink-0 rounded-lg bg-transparent px-3 text-xs">
          <Plus className="size-3.5" />新增
        </Button>
      </div>

      <div className="mt-4 space-y-2.5">
        {items.map((item) => (
          <div key={item.id} className={cn("rounded-xl border p-3 transition", item.enabled ? "border-primary/30 bg-primary/[0.06] shadow-[0_8px_18px_-18px_rgba(82,95,184,0.75)]" : "border-[#e0e5fa] bg-white")}>
            <div className="flex items-center gap-2.5">
              <input
                aria-label={`${title}${item.name}名称`}
                name={`${period}-${item.id}-name`}
                autoComplete="off"
                value={item.name}
                onChange={(event) => onChange(item.id, { name: event.target.value })}
                className="h-9 min-w-0 flex-1 rounded-lg border border-border/70 bg-white px-2.5 text-sm font-semibold outline-none transition focus:border-primary"
              />
              <label className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <span>积分</span>
                <input
                  aria-label={`${title}${item.name}奖励积分`}
                  name={`${period}-${item.id}-points`}
                  autoComplete="off"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="100"
                  step="1"
                  value={item.points ?? 1}
                  onChange={(event) => {
                    const points = Number(event.target.value)
                    if (Number.isInteger(points) && points >= 1 && points <= 100) onChange(item.id, { points })
                  }}
                  className="h-9 w-16 rounded-lg border border-border/70 bg-white px-2 text-center text-sm font-semibold text-foreground outline-none transition focus:border-primary"
                />
                <span>分</span>
              </label>
              <button
                type="button"
                aria-label={`删除${item.name}`}
                onClick={() => onRemove(item.id)}
                className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border/50 pt-3">
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <img src={item.image ?? `${DEFAULT_ICON_PATH}/flag-unissued.svg`} alt="" width={40} height={40} className="size-10 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">{item.image ? "已上传流动红旗图片" : "使用默认状态图标"}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">未上传时按发放状态显示灰色或红色图标</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {item.image && <button type="button" onClick={() => onChange(item.id, { image: null })} className="h-10 rounded-lg border border-border/70 bg-background/55 px-2.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">恢复默认</button>}
                <label className="flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-primary/20 bg-primary/[0.04] px-3 text-xs font-semibold text-primary transition hover:bg-primary/10 focus-within:ring-2 focus-within:ring-primary/30"><ImagePlus aria-hidden="true" className="size-3.5" />{item.image ? "更换图片" : "上传图片"}<input name={`${period}-${item.id}-image`} type="file" accept="image/*" onChange={(event) => handleFlagImage(item.id, event)} className="sr-only" /></label>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{item.enabled ? "已启用，评选时可发放" : "未启用，不在评选列表显示"}</p>
                <p className="mt-1 truncate text-[11px] text-muted-foreground/80">{item.syncFiveEducation ? `同步五育：${[item.syncLevel1, item.syncLevel2, item.syncLevel3].filter(Boolean).join(" / ") || "待配置指标"}` : "不同步五育指标"}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <span className="text-xs font-semibold text-foreground">是否使用</span>
                <ToggleSwitch checked={item.enabled} onChange={() => onChange(item.id, { enabled: !item.enabled })} label={`${item.enabled ? "停用" : "启用"}${item.name}`} />
              </div>
            </div>
          </div>
        ))}
      </div>
      {imageError && <p role="status" aria-live="polite" className="mt-3 text-xs font-medium text-destructive">{imageError}</p>}
    </section>
  )
}

export function ClassConfigTab() {
  const { flagConfigs, updateFlagConfig, addFlagConfig, removeFlagConfig, classRatingConfigs: appearances, updateClassRatingConfig, addClassRatingConfig, removeClassRatingConfig } = useEvaluation()
  const { role } = usePermission()
  const isHomeroomTeacher = role === "homeroom"
  const [page, setPage] = useState<ConfigPage>(() => role === "homeroom" ? "appearance" : "indicator")
  const [tree, setTree] = useState<Level1Node[]>(createInitialTree)
  const [selectedId, setSelectedId] = useState("level1-0")
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const firstLevel1 = createInitialTree()[0]
    return firstLevel1 ? new Set([firstLevel1.id, ...firstLevel1.children.map((level2) => level2.id)]) : new Set()
  })
  const [scoreDraft, setScoreDraft] = useState("-1")
  const [addTarget, setAddTarget] = useState<AddTarget>(null)
  const [newName, setNewName] = useState("")
  const [newPermission, setNewPermission] = useState<Permission>("all")
  const [newMemberIds, setNewMemberIds] = useState<string[]>([])
  const [newScore, setNewScore] = useState("-1")
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [flagDialog, setFlagDialog] = useState<FlagPeriod | null>(null)
  const [newFlagName, setNewFlagName] = useState("")
  const [newFlagPoints, setNewFlagPoints] = useState("1")
  const [newFlagSync, setNewFlagSync] = useState(false)
  const [newFlagLevel1, setNewFlagLevel1] = useState("")
  const [newFlagLevel2, setNewFlagLevel2] = useState("")
  const [newFlagLevel3, setNewFlagLevel3] = useState("")
  const [selectedAppearanceId, setSelectedAppearanceId] = useState("")
  const [appearanceToDelete, setAppearanceToDelete] = useState<string | null>(null)
  const [toast, setToast] = useState("")

  const selected = useMemo(() => findSelectedNode(tree, selectedId) ?? findSelectedNode(tree, tree[0]?.id ?? ""), [tree, selectedId])
  const weeklyFlags = useMemo(() => flagConfigs.filter((item) => item.period === "week"), [flagConfigs])
  const monthlyFlags = useMemo(() => flagConfigs.filter((item) => item.period === "month"), [flagConfigs])
  const selectedKindLabel = selected?.kind === "level1" ? "一级指标" : selected?.kind === "level2" ? "二级指标" : "三级指标"
  const selectedPath = selected ? selected.kind === "level1" ? "顶层指标" : selected.kind === "level2" ? selected.level1.name : `${selected.level1.name} / ${selected.level2.name}` : ""
  const selectedAddLabel = selected?.kind === "level1" ? "新增二级指标" : "新增三级指标"
  const newFlagLevel2Options = newFlagLevel1 ? Object.keys(FIVE_EDUCATION_OPTIONS[newFlagLevel1] ?? {}) : []
  const newFlagLevel3Options = newFlagLevel1 && newFlagLevel2 ? FIVE_EDUCATION_OPTIONS[newFlagLevel1]?.[newFlagLevel2] ?? [] : []
  const selectedAppearance = useMemo(() => appearances.find((item) => item.id === selectedAppearanceId) ?? appearances[0], [appearances, selectedAppearanceId])

  useEffect(() => {
    if (selected?.kind === "level3") setScoreDraft(String(selected.node.defaultScore))
  }, [selectedId])

  useEffect(() => {
    if (appearances.length > 0 && !appearances.some((item) => item.id === selectedAppearanceId)) setSelectedAppearanceId(appearances[0].id)
  }, [appearances, selectedAppearanceId])

  useEffect(() => {
    if (isHomeroomTeacher) setPage("appearance")
  }, [isHomeroomTeacher])

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(""), 2200)
  }

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current)
      const isLevel1 = tree.some((level1) => level1.id === id)
      if (isLevel1 && !next.has(id)) {
        tree.forEach((level1) => next.delete(level1.id))
        next.add(id)
      } else if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectNode = (id: string) => setSelectedId(id)

  const updateSelected = (patch: NodePatch) => {
    if (!selected) return
    setTree((current) => patchNode(current, selected.node.id, patch))
  }

  const openAddDialog = (kind: NodeKind, parentId?: string) => {
    setAddTarget({ kind, parentId })
    setNewName("")
    setNewPermission("all")
    setNewMemberIds([])
    setNewScore("-1")
  }

  const addIndicator = () => {
    if (!addTarget || !newName.trim()) return
    if (newPermission === "specified" && newMemberIds.length === 0) {
      notify("请至少添加一名指定成员")
      return
    }
    const id = `${addTarget.kind}-${Date.now()}`
    const name = newName.trim()
    if (addTarget.kind === "level1") {
      setTree((current) => [...current, { id, name, permission: newPermission, memberIds: newMemberIds, children: [] }])
    }
    if (addTarget.kind === "level2" && addTarget.parentId) {
      setTree((current) => current.map((level1) => level1.id === addTarget.parentId ? { ...level1, children: [...level1.children, { id, name, permission: newPermission, memberIds: newMemberIds, items: [] }] } : level1))
      setExpandedIds((current) => {
        const next = new Set(current)
        tree.forEach((level1) => next.delete(level1.id))
        next.add(addTarget.parentId!)
        return next
      })
    }
    if (addTarget.kind === "level3" && addTarget.parentId) {
      const score = Number(newScore)
      setTree((current) => current.map((level1) => ({
        ...level1,
        children: level1.children.map((level2) => level2.id === addTarget.parentId ? {
          ...level2,
          items: [...level2.items, { id, name, permission: newPermission, memberIds: newMemberIds, defaultScore: Number.isFinite(score) && score !== 0 ? score : -1, description: "新增评价指标" }],
        } : level2),
      })))
      setExpandedIds((current) => new Set([...current, addTarget.parentId!]))
    }
    setSelectedId(id)
    setAddTarget(null)
    notify(`已新增${addTarget.kind === "level1" ? "一级" : addTarget.kind === "level2" ? "二级" : "三级"}指标`)
  }

  const deleteSelected = () => {
    if (!selected) return
    const nextTree = removeNode(tree, selected.node.id)
    setTree(nextTree)
    setSelectedId(nextTree[0]?.id ?? "")
    setConfirmDeleteOpen(false)
    notify("指标已删除")
  }

  const commitScore = () => {
    if (selected?.kind !== "level3") return
    const score = Number(scoreDraft)
    if (!Number.isFinite(score) || score === 0) {
      setScoreDraft(String(selected.node.defaultScore))
      return
    }
    updateSelected({ defaultScore: score })
  }

  const updateFlag = (_period: FlagPeriod, id: string, patch: Partial<FlagConfig>) => {
    updateFlagConfig(id, patch)
  }

  const removeFlag = (_period: FlagPeriod, id: string) => {
    removeFlagConfig(id)
  }

  const addFlag = () => {
    if (!flagDialog) return
    if (!newFlagName.trim()) {
      notify("请输入流动红旗名称")
      return
    }
    const points = Number(newFlagPoints)
    if (!Number.isInteger(points) || points < 1 || points > 100) {
      notify("请输入 1-100 的整数积分")
      return
    }
    if (newFlagSync && !newFlagLevel1) {
      notify("请选择同步的一级指标")
      return
    }
    const newFlag = {
      id: `${flagDialog}-${Date.now()}`,
      period: flagDialog,
      name: newFlagName.trim(),
      points,
      enabled: true,
      syncFiveEducation: newFlagSync,
      syncLevel1: newFlagSync ? newFlagLevel1 : undefined,
      syncLevel2: newFlagSync ? newFlagLevel2 || undefined : undefined,
      syncLevel3: newFlagSync ? newFlagLevel3 || undefined : undefined,
    }
    addFlagConfig(newFlag)
    setFlagDialog(null)
    notify("流动红旗已新增")
  }

  const openFlagDialog = (period: FlagPeriod) => {
    setNewFlagName("")
    setNewFlagPoints("1")
    setNewFlagSync(false)
    setNewFlagLevel1("")
    setNewFlagLevel2("")
    setNewFlagLevel3("")
    setFlagDialog(period)
  }

  const updateAppearance = updateClassRatingConfig

  const addAppearance = () => {
    const id = `appearance-${Date.now()}`
    const nextAppearance: ClassRatingConfig = {
      id,
      name: "新班级评级",
      description: "填写该形象的简介信息。",
      image: null,
      defaultImage: "smile",
      autoIssueDay: "saturday",
      ruleType: "rank",
      rankStart: "11",
      rankEnd: "20",
      scoreStart: "0",
      scoreEnd: "79.9",
      theme: "blue",
    }
    addClassRatingConfig(nextAppearance)
    setSelectedAppearanceId(id)
    notify("已新增班级评级")
  }

  const handleAppearanceImage = (id: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return notify("评级图片不能超过 2MB")
    const reader = new FileReader()
    reader.onload = () => updateAppearance(id, { image: typeof reader.result === "string" ? reader.result : null })
    reader.readAsDataURL(file)
  }

  const saveAppearance = () => {
    if (!selectedAppearance) return
    if (!selectedAppearance.name.trim()) return notify("请填写形象名称")
    if (!selectedAppearance.description.trim()) return notify("请填写简介信息")
    const start = Number(selectedAppearance.ruleType === "score" ? selectedAppearance.scoreStart : selectedAppearance.rankStart)
    const end = Number(selectedAppearance.ruleType === "score" ? selectedAppearance.scoreEnd : selectedAppearance.rankEnd)
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < 0) return notify(selectedAppearance.ruleType === "score" ? "请填写有效的分数区间" : "请填写有效的排名区间")
    if (selectedAppearance.ruleType === "rank" && (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < 1)) return notify("排名区间必须为正整数")
    if (start > end) return notify(selectedAppearance.ruleType === "score" ? "分数起始值不能大于结束值" : "排名起始名次不能大于结束名次")
    notify("班级评级已保存")
  }

  const deleteAppearance = () => {
    if (!appearanceToDelete) return
    if (appearances.length <= 1) {
      setAppearanceToDelete(null)
      notify("请至少保留一条班级评级配置")
      return
    }
    const nextAppearance = appearances.find((item) => item.id !== appearanceToDelete)
    removeClassRatingConfig(appearanceToDelete)
    setSelectedAppearanceId(nextAppearance?.id ?? "")
    setAppearanceToDelete(null)
    notify("班级评级已删除")
  }

  const addDialogTitle = addTarget?.kind === "level1" ? "新增一级指标" : addTarget?.kind === "level2" ? "新增二级指标" : "新增三级指标"
  return (
    <div className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <a href="#config-content" className="sr-only z-[60] rounded-md bg-background px-3 py-2 text-sm font-semibold text-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">跳转到主要内容</a>
      <main id="config-content" tabIndex={-1} className="config-page-shell mx-auto flex w-full max-w-[1440px] flex-col gap-5 rounded-3xl p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e4e9fa] pb-5">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background/60 text-muted-foreground transition hover:border-primary/35 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" aria-label="返回学生综评首页">
              <ArrowLeft className="size-4" aria-hidden="true" />
            </Link>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-2 text-primary-foreground shadow-lg shadow-primary/25"><Settings2 className="size-4" aria-hidden="true" /></span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">班级评价 / 配置中心</p>
              <h1 className="truncate text-lg font-bold tracking-tight">班级评价配置</h1>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-right text-sm font-bold">{isHomeroomTeacher ? "班级评级配置" : "统一维护班级评价规则"}</p>
            <p className="mt-1 text-right text-xs text-muted-foreground">{isHomeroomTeacher ? "维护班级评级图片、自动发放时间及排名/分数区间。" : "维护评价指标、流动红旗和班级评级三类配置。"}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          {!isHomeroomTeacher && <div className="inline-flex max-w-full flex-wrap gap-1 rounded-xl border border-[#dce2fa] bg-[#eef1ff] p-1" role="tablist" aria-label="班级评价配置分类">
            {([
              { key: "indicator" as const, label: "指标配置", icon: Settings2 },
              { key: "flag" as const, label: "流动红旗配置", icon: Flag },
              { key: "appearance" as const, label: "班级评级配置", icon: Smile },
            ]).map((tab) => {
              const Icon = tab.icon
              return <button key={tab.key} type="button" role="tab" aria-selected={page === tab.key} onClick={() => setPage(tab.key)} className={cn("flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50", page === tab.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}><Icon className="size-3.5" />{tab.label}</button>
            })}
          </div>}
        </div>

        {page === "indicator" && (
          <div className="grid min-h-[650px] gap-4 xl:grid-cols-[minmax(330px,.82fr)_minmax(0,1.18fr)]">
            <aside className="config-subpanel min-w-0 rounded-2xl p-4">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Settings2 className="size-4" /></span><p className="text-sm font-bold">评价指标树</p></div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">一级指标下展开二级与三级指标；选中任一层级可在右侧编辑。</p>
                </div>
                <Button type="button" variant="outline" onClick={() => openAddDialog("level1")} className="h-10 shrink-0 rounded-lg bg-transparent px-3 text-xs"><Plus className="size-3.5" />新增</Button>
              </div>

              <div role="tree" aria-label="评价指标层级" className="config-inset overflow-hidden rounded-xl">
                {tree.map((level1) => {
                  const level1Expanded = expandedIds.has(level1.id)
                  return (
                    <div key={level1.id} role="treeitem" aria-expanded={level1Expanded} aria-selected={selectedId === level1.id}>
                      <button type="button" onClick={() => { selectNode(level1.id); toggleExpanded(level1.id) }} className={cn("flex min-h-11 w-full items-center gap-2 border-b border-border/45 px-3 text-left text-sm font-bold transition", selectedId === level1.id ? "bg-primary/10 text-primary" : "bg-primary/[0.035] hover:bg-primary/[0.07]")}>
                        {level1Expanded ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
                        <span className="size-2 shrink-0 rounded-full bg-primary" />
                        <span className="min-w-0 flex-1 truncate">{level1.name}</span>
                        <span className="shrink-0 text-xs font-normal text-muted-foreground">{level1.children.length} 个子级指标</span>
                      </button>
                      {level1Expanded && <div role="group">{level1.children.map((level2) => {
                        const level2Expanded = expandedIds.has(level2.id)
                        return <div key={level2.id} role="treeitem" aria-expanded={level2Expanded} aria-selected={selectedId === level2.id}>
                          <button type="button" onClick={() => { selectNode(level2.id); toggleExpanded(level2.id) }} className={cn("flex min-h-10 w-full items-center gap-2 border-b border-border/35 py-1.5 pr-3 pl-8 text-left text-xs font-semibold transition", selectedId === level2.id ? "bg-primary/10 text-primary" : "hover:bg-primary/[0.045]")}>
                            {level2Expanded ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
                            <span className="min-w-0 flex-1 truncate">{level2.name}</span>
                            <span className="shrink-0 text-xs font-normal text-muted-foreground">{level2.items.length} 个子级指标</span>
                          </button>
                          {level2Expanded && <div role="group">{level2.items.map((item) => <button key={item.id} type="button" role="treeitem" aria-selected={selectedId === item.id} onClick={() => selectNode(item.id)} className={cn("flex min-h-10 w-full items-center gap-2 border-b border-border/25 py-1.5 pr-3 pl-14 text-left text-xs transition last:border-b-0", selectedId === item.id ? "bg-primary/10 font-semibold text-primary" : "text-foreground hover:bg-primary/[0.045]")}><span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/50" /><span className="min-w-0 flex-1 truncate">{item.name}</span><span className={cn("shrink-0 font-semibold", item.defaultScore > 0 ? "text-brand-green" : "text-brand-orange")}>{item.defaultScore > 0 ? "+" : ""}{item.defaultScore}</span></button>)}</div>}
                        </div>
                      })}</div>}
                    </div>
                  )
                })}
              </div>
            </aside>

            <section className="config-editor-panel min-w-0 rounded-2xl p-4 sm:p-5">
              {selected ? <>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
                  <div>
                    <p className="text-xs font-semibold text-primary">{selectedKindLabel}</p>
                    <h2 className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-lg font-bold">
                      <span>{selected.node.name}</span>
                      {selected.kind !== "level3" && <span className="text-sm font-medium text-muted-foreground">{selected.kind === "level1" ? selected.node.children.length : selected.node.items.length} 个子级指标</span>}
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">{selectedPath}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selected.kind !== "level3" && <Button type="button" variant="outline" onClick={() => openAddDialog(selected.kind === "level1" ? "level2" : "level3", selected.node.id)} className="h-10 rounded-lg bg-transparent px-3 text-xs"><Plus className="size-3.5" />{selectedAddLabel}</Button>}
                    <Button type="button" variant="outline" onClick={() => setConfirmDeleteOpen(true)} className="h-10 rounded-lg bg-transparent px-3 text-xs text-destructive hover:text-destructive"><Trash2 className="size-3.5" />删除</Button>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground sm:col-span-2">指标名称
                    <input name="indicator-name" autoComplete="off" value={selected.node.name} onChange={(event) => updateSelected({ name: event.target.value })} className="h-10 rounded-lg border border-border/70 bg-background/55 px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" />
                  </label>
                  <div className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground"><span>指标权限</span><PermissionControl name="selected-indicator-permission" value={selected.node.permission} memberIds={selected.node.memberIds} onChange={(permission) => updateSelected({ permission })} onMemberIdsChange={(memberIds) => updateSelected({ memberIds })} /></div>
                  {selected.kind === "level3" && <>
                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">单次默认分值
                      <input name="indicator-default-score" autoComplete="off" aria-describedby="score-help" type="number" step="0.5" value={scoreDraft} onChange={(event) => setScoreDraft(event.target.value)} onBlur={commitScore} className="h-10 rounded-lg border border-border/70 bg-background/55 px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" />
                    </label>
                    <p id="score-help" className="self-end text-xs font-normal leading-5 text-muted-foreground">负数表示扣分，正数表示加分。</p>
                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground sm:col-span-2">指标说明
                      <textarea name="indicator-description" autoComplete="off" value={selected.node.description} onChange={(event) => updateSelected({ description: event.target.value })} className="min-h-24 resize-none rounded-lg border border-border/70 bg-background/55 px-3 py-2 text-sm font-normal text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" />
                    </label>
                  </>}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/[0.035] p-4">
                  <div className="flex items-start gap-2.5"><span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><ShieldCheck className="size-4" /></span><p className="text-xs leading-5 text-muted-foreground">名称与权限修改将作用于当前层级；三级指标仅通过带符号的默认分值区分扣分和加分。</p></div>
                  <Button type="button" onClick={() => { if (selected.node.permission === "specified" && selected.node.memberIds.length === 0) { notify("请至少添加一名指定成员"); return }; commitScore(); notify("指标配置已保存") }} className="h-10 rounded-lg px-3 text-xs"><Save className="size-3.5" />保存指标</Button>
                </div>
              </> : <p className="py-20 text-center text-sm text-muted-foreground">暂无可编辑指标</p>}
            </section>
          </div>
        )}

        {page === "flag" && <div className="grid gap-4 xl:grid-cols-2"><FlagEditor period="week" items={weeklyFlags} onAdd={() => openFlagDialog("week")} onChange={(id, patch) => updateFlag("week", id, patch)} onRemove={(id) => removeFlag("week", id)} /><FlagEditor period="month" items={monthlyFlags} onAdd={() => openFlagDialog("month")} onChange={(id, patch) => updateFlag("month", id, patch)} onRemove={(id) => removeFlag("month", id)} /></div>}

        {page === "appearance" && selectedAppearance && <section className="grid gap-4 xl:grid-cols-[minmax(280px,.72fr)_minmax(0,1.28fr)]">
          <div className="space-y-4">
            <div className="relative min-h-[300px] overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-2 p-5 text-white shadow-lg">
              {selectedAppearance.image ? <img src={selectedAppearance.image} alt={`${selectedAppearance.name}展示图片`} width={1200} height={675} className="absolute inset-0 size-full object-cover opacity-55" /> : <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/10 text-white/75"><img src={defaultRatingImage[selectedAppearance.defaultImage]} alt="" width={96} height={96} className="size-20" /><span className="text-xs">当前使用默认评级图片</span></div>}
              <div className="absolute inset-0 bg-slate-950/20" />
              <div className="relative flex h-full min-h-[260px] flex-col justify-between">
                <div className="flex items-center justify-between"><span className="rounded-full border border-white/30 bg-white/15 px-2.5 py-1 text-xs font-semibold backdrop-blur">班级评级预览</span><Smile aria-hidden="true" className="size-5" /></div>
                <div><p className="text-2xl font-bold tracking-tight">{selectedAppearance.name || "评级名称"}</p><p className="mt-2 text-sm font-medium text-white/90">{selectedAppearance.ruleType === "score" ? `班级分数 ${selectedAppearance.scoreStart || "—"} 至 ${selectedAppearance.scoreEnd || "—"} 分` : `班级排名第 ${selectedAppearance.rankStart || "—"} 至 ${selectedAppearance.rankEnd || "—"} 名`}</p><p className="mt-3 max-w-sm text-xs leading-5 text-white/80">{selectedAppearance.description || "填写评级简介信息。"}</p><span className="mt-4 inline-flex rounded-full border border-white/25 bg-white/15 px-2.5 py-1.5 text-[11px] font-semibold backdrop-blur">自动发放 · {autoIssueOptions.find((item) => item.id === selectedAppearance.autoIssueDay)?.label}</span></div>
              </div>
            </div>

            <section className="config-subpanel rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-bold">评级档案</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">可按班级排名或分数区间匹配不同评级。</p></div><Button type="button" variant="outline" onClick={addAppearance} className="h-10 shrink-0 rounded-lg bg-transparent px-3 text-xs"><Plus aria-hidden="true" className="size-3.5" />新增评级</Button></div>
              <div className="mt-4 space-y-2">
                {appearances.map((item) => <button key={item.id} type="button" aria-pressed={selectedAppearanceId === item.id} onClick={() => setSelectedAppearanceId(item.id)} className={cn("flex min-h-16 w-full items-center gap-3 rounded-xl border p-2.5 text-left transition hover:border-primary/35 hover:bg-primary/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30", selectedAppearanceId === item.id ? "border-primary/35 bg-primary/[0.06]" : "border-border/60 bg-background/25")}>
                  <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-primary to-primary-2"><img src={item.image ?? defaultRatingImage[item.defaultImage]} alt="" width={44} height={44} className="size-full object-cover" /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-foreground">{item.name || "未命名评级"}</span><span className="mt-1 block truncate text-[11px] text-muted-foreground">{item.ruleType === "score" ? `分数 ${item.scoreStart || "—"} 至 ${item.scoreEnd || "—"} 分` : `排名第 ${item.rankStart || "—"} 至 ${item.rankEnd || "—"} 名`} · {autoIssueOptions.find((option) => option.id === item.autoIssueDay)?.label}</span></span>
                  {selectedAppearanceId === item.id && <Check aria-hidden="true" className="size-4 shrink-0 text-primary" />}
                </button>)}
              </div>
            </section>
          </div>

          <section className="config-editor-panel rounded-2xl p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="flex size-10 items-center justify-center rounded-xl bg-brand-pink/15 text-brand-pink"><Palette aria-hidden="true" className="size-5" /></span><div><h2 className="text-base font-bold">班级评级配置</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">配置评级名称、匹配方式、区间、评级图片和自动发放时间。</p></div></div></div><div className="flex shrink-0 items-center gap-2"><span className="hidden rounded-full bg-primary/10 px-2.5 py-1.5 text-[11px] font-semibold text-primary sm:inline-flex">正在编辑</span><Button type="button" variant="outline" onClick={() => setAppearanceToDelete(selectedAppearance.id)} className="h-10 rounded-lg border-destructive/30 bg-transparent px-3 text-xs text-destructive hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"><Trash2 aria-hidden="true" className="size-3.5" />删除评级</Button></div></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground sm:col-span-2">评级名称<input name={`appearance-${selectedAppearance.id}-name`} autoComplete="off" value={selectedAppearance.name} onChange={(event) => updateAppearance(selectedAppearance.id, { name: event.target.value })} placeholder="例如：优雅示范…" className="h-10 rounded-lg border border-border/70 bg-background/55 px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /></label>

              <fieldset className="rounded-xl border border-border/60 bg-background/35 p-3 sm:col-span-2"><legend className="px-1 text-xs font-semibold text-muted-foreground">匹配方式</legend><div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="班级评级匹配方式">{ratingRuleOptions.map((option) => <button key={option.id} type="button" role="radio" aria-checked={selectedAppearance.ruleType === option.id} onClick={() => updateAppearance(selectedAppearance.id, { ruleType: option.id })} className={cn("rounded-lg border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30", selectedAppearance.ruleType === option.id ? "border-primary/35 bg-primary/10 text-primary" : "border-border/60 bg-background/45 text-muted-foreground hover:border-primary/25 hover:text-foreground")}><span className="block text-xs font-bold">{option.label}</span><span className="mt-1 block text-[11px] font-normal leading-4">{option.description}</span></button>)}</div></fieldset>

              {selectedAppearance.ruleType === "score" ? <fieldset className="rounded-xl border border-border/60 bg-background/35 p-3 sm:col-span-2"><legend className="px-1 text-xs font-semibold text-muted-foreground">班级分数区间</legend><div className="mt-1 flex items-center gap-2"><label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-muted-foreground"><span>从</span><input name={`appearance-${selectedAppearance.id}-score-start`} autoComplete="off" inputMode="decimal" type="number" min="0" step="0.1" value={selectedAppearance.scoreStart} onChange={(event) => updateAppearance(selectedAppearance.id, { scoreStart: event.target.value })} aria-label="分数起始值" className="h-10 min-w-0 w-full rounded-lg border border-border/70 bg-background/55 px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /><span>分</span></label><span className="text-sm font-semibold text-muted-foreground">至</span><label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-muted-foreground"><span>到</span><input name={`appearance-${selectedAppearance.id}-score-end`} autoComplete="off" inputMode="decimal" type="number" min="0" step="0.1" value={selectedAppearance.scoreEnd} onChange={(event) => updateAppearance(selectedAppearance.id, { scoreEnd: event.target.value })} aria-label="分数结束值" className="h-10 min-w-0 w-full rounded-lg border border-border/70 bg-background/55 px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /><span>分</span></label></div></fieldset> : <fieldset className="rounded-xl border border-border/60 bg-background/35 p-3 sm:col-span-2"><legend className="px-1 text-xs font-semibold text-muted-foreground">班级排名区间</legend><div className="mt-1 flex items-center gap-2"><label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-muted-foreground"><span>第</span><input name={`appearance-${selectedAppearance.id}-rank-start`} autoComplete="off" inputMode="numeric" type="number" min="1" step="1" value={selectedAppearance.rankStart} onChange={(event) => updateAppearance(selectedAppearance.id, { rankStart: event.target.value })} aria-label="排名起始名次" className="h-10 min-w-0 w-full rounded-lg border border-border/70 bg-background/55 px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /><span>名</span></label><span className="text-sm font-semibold text-muted-foreground">至</span><label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-muted-foreground"><span>第</span><input name={`appearance-${selectedAppearance.id}-rank-end`} autoComplete="off" inputMode="numeric" type="number" min="1" step="1" value={selectedAppearance.rankEnd} onChange={(event) => updateAppearance(selectedAppearance.id, { rankEnd: event.target.value })} aria-label="排名结束名次" className="h-10 min-w-0 w-full rounded-lg border border-border/70 bg-background/55 px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /><span>名</span></label></div></fieldset>}

              <fieldset className="rounded-xl border border-border/60 bg-background/35 p-3 sm:col-span-2"><legend className="px-1 text-xs font-semibold text-muted-foreground">自动发放时间</legend><div className="mt-1 grid gap-2 sm:grid-cols-3">{autoIssueOptions.map((option) => <label key={option.id} className={cn("flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition", selectedAppearance.autoIssueDay === option.id ? "border-primary/35 bg-primary/10 text-primary" : "border-border/60 bg-background/45 text-muted-foreground hover:border-primary/25 hover:text-foreground")}><input type="radio" name={`appearance-${selectedAppearance.id}-auto-issue-day`} value={option.id} checked={selectedAppearance.autoIssueDay === option.id} onChange={() => updateAppearance(selectedAppearance.id, { autoIssueDay: option.id })} className="size-4 shrink-0 accent-[var(--primary)]" />{option.label}</label>)}</div></fieldset>

              <fieldset className="rounded-xl border border-border/60 bg-background/35 p-3 sm:col-span-2"><legend className="px-1 text-xs font-semibold text-muted-foreground">默认评级图片</legend><div className="mt-1 grid gap-2 sm:grid-cols-2">{([{ value: "smile" as const, label: "笑脸默认图" }, { value: "cry" as const, label: "哭脸默认图" }]).map((option) => <button key={option.value} type="button" aria-pressed={selectedAppearance.defaultImage === option.value} onClick={() => updateAppearance(selectedAppearance.id, { defaultImage: option.value })} className={cn("flex min-h-12 items-center gap-2 rounded-lg border px-3 text-left text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30", selectedAppearance.defaultImage === option.value ? "border-primary/35 bg-primary/10 text-primary" : "border-border/60 bg-background/45 text-muted-foreground hover:border-primary/25 hover:text-foreground")}><img src={defaultRatingImage[option.value]} alt="" width={28} height={28} className="size-7" />{option.label}</button>)}</div><p className="mt-2 text-[11px] font-normal text-muted-foreground">未上传自定义图片时，排行榜将展示此默认图片。</p></fieldset>

              <div className="flex flex-col gap-2 text-xs font-semibold text-muted-foreground sm:col-span-2"><span>自定义评级图片</span><div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border/80 bg-background/35 p-3"><div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-primary-2 text-white"><img src={selectedAppearance.image ?? defaultRatingImage[selectedAppearance.defaultImage]} alt={`${selectedAppearance.name}评级图片缩略图`} width={80} height={80} className="size-full object-cover" /></div><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-foreground">{selectedAppearance.image ? "已上传自定义图片" : "当前使用默认 SVG 图标"}</p><p className="mt-1 text-[11px] font-normal leading-4 text-muted-foreground">上传后将优先在周榜、月榜的班级评级中展示，图片不超过 2MB。</p></div><div className="flex items-center gap-2">{selectedAppearance.image && <button type="button" onClick={() => updateAppearance(selectedAppearance.id, { image: null })} className="min-h-10 rounded-lg border border-border/70 bg-background/55 px-3 text-xs font-semibold text-muted-foreground transition hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">恢复默认</button>}<label className="flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border/70 bg-background/55 px-3 text-xs font-semibold text-foreground transition hover:border-primary/45 hover:bg-primary/[0.035] focus-within:ring-2 focus-within:ring-primary/30"><ImagePlus aria-hidden="true" className="size-4 text-primary" />{selectedAppearance.image ? "更换图片" : "上传图片"}<input name={`appearance-${selectedAppearance.id}-image`} type="file" accept="image/*" onChange={(event) => handleAppearanceImage(selectedAppearance.id, event)} className="sr-only" /></label></div></div></div>

              <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground sm:col-span-2">简介信息<textarea name={`appearance-${selectedAppearance.id}-description`} autoComplete="off" value={selectedAppearance.description} onChange={(event) => updateAppearance(selectedAppearance.id, { description: event.target.value })} placeholder="介绍该评级对应的班级气质与展示场景…" className="min-h-28 resize-none rounded-lg border border-border/70 bg-background/55 px-3 py-2 text-sm font-normal leading-6 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /></label>

            </div>
            <div className="mt-5 flex justify-end"><Button type="button" onClick={saveAppearance} className="h-10 rounded-lg px-3 text-xs"><Save aria-hidden="true" className="size-3.5" />保存班级评级</Button></div>
          </section>
        </section>}
      </main>

      {toast && <div role="status" aria-live="polite" className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-xl">{toast}</div>}

      <Dialog open={addTarget !== null} onOpenChange={(open) => { if (!open) setAddTarget(null) }}>
        <DialogContent className="glass-surface sm:max-w-md"><DialogHeader><DialogTitle>{addDialogTitle}</DialogTitle></DialogHeader><div className="grid gap-4">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">指标名称<input name="new-indicator-name" autoComplete="off" autoFocus value={newName} onChange={(event) => setNewName(event.target.value)} placeholder={addTarget?.kind === "level1" ? "例如：学习发展…" : addTarget?.kind === "level2" ? "例如：学习习惯…" : "例如：主动完成预习…"} className="h-10 rounded-lg border border-border/70 bg-background/55 px-3 text-sm font-normal text-foreground outline-none focus:border-primary" /></label>
          <div className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground"><span>指标权限</span><PermissionControl name="new-indicator-permission" value={newPermission} memberIds={newMemberIds} onChange={setNewPermission} onMemberIdsChange={setNewMemberIds} /></div>
          {addTarget?.kind === "level3" && <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">单次默认分值<input name="new-indicator-default-score" autoComplete="off" type="number" step="0.5" value={newScore} onChange={(event) => setNewScore(event.target.value)} className="h-10 rounded-lg border border-border/70 bg-background/55 px-3 text-sm font-normal text-foreground outline-none focus:border-primary" /><span className="font-normal leading-5">负数表示扣分，正数表示加分。</span></label>}
        </div><DialogFooter><Button type="button" variant="outline" className="bg-transparent text-xs" onClick={() => setAddTarget(null)}>取消</Button><Button type="button" className="text-xs" onClick={addIndicator}>新增指标</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={flagDialog !== null} onOpenChange={(open) => { if (!open) setFlagDialog(null) }}>
        <DialogContent className="glass-surface sm:max-w-lg"><DialogHeader><DialogTitle>新增{flagDialog === "week" ? "周" : "月"}流动红旗</DialogTitle></DialogHeader><div className="grid gap-4">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">红旗名称<input name="new-flag-name" autoComplete="off" autoFocus value={newFlagName} onChange={(event) => setNewFlagName(event.target.value)} placeholder="例如：阅读推广示范班…" className="h-10 rounded-lg border border-border/70 bg-background/55 px-3 text-sm font-normal text-foreground outline-none focus:border-primary" /></label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">奖励积分<input name="new-flag-points" autoComplete="off" type="number" inputMode="numeric" min="1" max="100" step="1" value={newFlagPoints} onChange={(event) => setNewFlagPoints(event.target.value)} className="h-10 rounded-lg border border-border/70 bg-background/55 px-3 text-sm font-normal text-foreground outline-none focus:border-primary" /><span className="font-normal leading-5">颁发该流动红旗时，每位学生获得的积分，支持 1-100 的整数。</span></label>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/25 p-3"><div><p className="text-xs font-semibold text-foreground">同步到五育指标</p><p className="mt-1 text-[11px] leading-4 text-muted-foreground">开启后可选择同步的一级、二级和三级指标。</p></div><ToggleSwitch checked={newFlagSync} onChange={() => setNewFlagSync((current) => !current)} label="新增流动红旗同步到五育指标" /></div>
          {newFlagSync && <div className="grid gap-3 rounded-xl border border-primary/20 bg-primary/[0.035] p-3">
            <div><p className="text-xs font-semibold text-foreground">同步指标范围</p><p className="mt-1 text-[11px] leading-4 text-muted-foreground">一级指标为必选项，二级和三级指标可按需细化。</p></div>
            <div className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground"><span>一级指标 <span className="text-destructive">*</span></span><Select value={newFlagLevel1} onValueChange={(value) => { setNewFlagLevel1(String(value ?? "")); setNewFlagLevel2(""); setNewFlagLevel3("") }}><SelectTrigger aria-label="选择一级指标" className="w-full font-normal"><SelectValue placeholder="请选择一级指标" /></SelectTrigger><SelectContent>{Object.keys(FIVE_EDUCATION_OPTIONS).map((level1) => <SelectItem key={level1} value={level1}>{level1}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground"><span>二级指标 <span className="font-normal text-muted-foreground">（可选）</span></span><Select value={newFlagLevel2} disabled={!newFlagLevel1} onValueChange={(value) => { setNewFlagLevel2(String(value ?? "")); setNewFlagLevel3("") }}><SelectTrigger aria-label="选择二级指标" className="w-full font-normal"><SelectValue placeholder="不指定二级指标" /></SelectTrigger><SelectContent>{newFlagLevel2Options.map((level2) => <SelectItem key={level2} value={level2}>{level2}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground"><span>三级指标 <span className="font-normal text-muted-foreground">（可选）</span></span><Select value={newFlagLevel3} disabled={!newFlagLevel2} onValueChange={(value) => setNewFlagLevel3(String(value ?? ""))}><SelectTrigger aria-label="选择三级指标" className="w-full font-normal"><SelectValue placeholder="不指定三级指标" /></SelectTrigger><SelectContent>{newFlagLevel3Options.map((level3) => <SelectItem key={level3} value={level3}>{level3}</SelectItem>)}</SelectContent></Select></div>
          </div>}
        </div><DialogFooter><Button type="button" variant="outline" className="bg-transparent text-xs" onClick={() => setFlagDialog(null)}>取消</Button><Button type="button" className="text-xs" onClick={addFlag}>新增红旗</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="glass-surface sm:max-w-md"><DialogHeader><DialogTitle>确认删除指标</DialogTitle></DialogHeader><p className="text-sm leading-6 text-muted-foreground">删除“{selected?.node.name}”后，其下级指标也会一并移除；历史评价记录不受影响。</p><DialogFooter><Button type="button" variant="outline" className="bg-transparent text-xs" onClick={() => setConfirmDeleteOpen(false)}>取消</Button><Button type="button" variant="destructive" className="text-xs" onClick={deleteSelected}>确认删除</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={appearanceToDelete !== null} onOpenChange={(open) => !open && setAppearanceToDelete(null)}>
        <DialogContent className="glass-surface sm:max-w-md"><DialogHeader><DialogTitle>确认删除班级评级</DialogTitle></DialogHeader><p className="text-sm leading-6 text-muted-foreground">删除“{appearances.find((item) => item.id === appearanceToDelete)?.name}”后，该评级将不再用于班级排行榜展示。</p><DialogFooter><Button type="button" variant="outline" className="bg-transparent text-xs" onClick={() => setAppearanceToDelete(null)}>取消</Button><Button type="button" variant="destructive" className="text-xs" onClick={deleteAppearance}>确认删除</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  )
}
