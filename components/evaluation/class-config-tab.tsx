"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Check,
  ChevronDown,
  ChevronRight,
  Flag,
  ImagePlus,
  Palette,
  Pencil,
  Plus,
  Save,
  Settings2,
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
  smile: `${DEFAULT_ICON_PATH}/rating-smile-generated.png`,
  neutral: `${DEFAULT_ICON_PATH}/rating-neutral-generated.png`,
  cry: `${DEFAULT_ICON_PATH}/rating-cry-generated.png`,
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
  onEdit: (item: FlagConfig) => void
}

function FlagEditor({ period, items, onAdd, onEdit }: FlagEditorProps) {
  const isWeek = period === "week"
  const title = isWeek ? "周流动红旗" : "月流动红旗"

  return (
    <section className="config-editor-panel rounded-2xl p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", isWeek ? "bg-brand-yellow/15 text-brand-yellow" : "bg-brand-orange/15 text-brand-orange")}>
            <Flag aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold">{title}</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">共 {items.length} 项配置</p>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={onAdd} className="h-9 shrink-0 rounded-lg bg-transparent px-2.5 text-xs">
          <Plus className="size-3.5" />新增
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        {items.map((item) => <article key={item.id} className={cn("min-h-[112px] min-w-0 rounded-2xl border p-4 transition", item.enabled ? "border-primary/30 bg-primary/[0.055]" : "border-[#e0e5fa] bg-white")}>
          <div className="flex items-start gap-3">
            <span className={cn("flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl", isWeek ? "bg-brand-yellow/15 text-brand-yellow" : "bg-brand-orange/15 text-brand-orange")}>{item.image ? <img src={item.image} alt={`${item.name}流动红旗图标`} width={44} height={44} className="size-full object-cover" /> : <Flag aria-hidden="true" className="size-5" />}</span>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-foreground">{item.name}</p><p className="mt-1.5 truncate text-xs text-muted-foreground">{item.syncFiveEducation ? [item.syncLevel1, item.syncLevel2, item.syncLevel3].filter(Boolean).join(" / ") : "未关联五育指标"}</p></div>
            <button type="button" aria-label={`编辑${item.name}`} onClick={() => onEdit(item)} className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background/55 text-muted-foreground transition hover:border-primary/35 hover:bg-primary/[0.06] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"><Pencil aria-hidden="true" className="size-3.5" /></button>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/50 pt-3"><span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", item.enabled ? "bg-brand-green/15 text-brand-green" : "bg-muted text-muted-foreground")}>{item.enabled ? "已启用" : "未启用"}</span><span className="text-xs font-semibold text-primary">发放积分 {item.points ?? 1} 分</span></div>
        </article>)}
      </div>
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
  const [editingFlagId, setEditingFlagId] = useState<string | null>(null)
  const [flagToDelete, setFlagToDelete] = useState<string | null>(null)
  const [newFlagName, setNewFlagName] = useState("")
  const [newFlagPoints, setNewFlagPoints] = useState("1")
  const [newFlagSync, setNewFlagSync] = useState(false)
  const [newFlagEnabled, setNewFlagEnabled] = useState(true)
  const [newFlagLevel1, setNewFlagLevel1] = useState("")
  const [newFlagLevel2, setNewFlagLevel2] = useState("")
  const [newFlagLevel3, setNewFlagLevel3] = useState("")
  const [newFlagImage, setNewFlagImage] = useState<string | null>(null)
  const [newFlagImageError, setNewFlagImageError] = useState("")
  const [selectedAppearanceId, setSelectedAppearanceId] = useState("")
  const [appearanceDraft, setAppearanceDraft] = useState<ClassRatingConfig | null>(null)
  const [appearanceDrawerOpen, setAppearanceDrawerOpen] = useState(false)
  const [editingAppearanceId, setEditingAppearanceId] = useState<string | null>(null)
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
  const appearanceEditor = appearanceDraft ?? selectedAppearance
  const isNewAppearance = editingAppearanceId === null

  useEffect(() => {
    if (appearances.length > 0 && !appearances.some((item) => item.id === selectedAppearanceId)) setSelectedAppearanceId(appearances[0].id)
  }, [appearances, selectedAppearanceId])

  useEffect(() => {
    if (selected?.kind === "level3") setScoreDraft(String(selected.node.defaultScore))
  }, [selectedId])

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

  const handleNewFlagImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      event.target.value = ""
      setNewFlagImageError("流动红旗图片不能超过 2MB")
      return
    }
    setNewFlagImageError("")
    const reader = new FileReader()
    reader.onload = () => setNewFlagImage(typeof reader.result === "string" ? reader.result : null)
    reader.readAsDataURL(file)
  }

  const saveFlag = () => {
    if (!flagDialog) return
    if (!newFlagName.trim()) {
      notify("请输入流动红旗名称")
      return
    }
    const points = Number(newFlagPoints)
    if (newFlagSync && (!Number.isInteger(points) || points < 1 || points > 100)) {
      notify("请输入 1-100 的整数积分")
      return
    }
    if (newFlagSync && !newFlagLevel1) {
      notify("请选择同步的一级指标")
      return
    }
    const existingFlag = editingFlagId ? flagConfigs.find((item) => item.id === editingFlagId) : undefined
    const nextFlag = {
      period: flagDialog,
      name: newFlagName.trim(),
      points: newFlagSync ? points : 1,
      image: newFlagImage,
      enabled: newFlagEnabled,
      syncFiveEducation: newFlagSync,
      syncLevel1: newFlagSync ? newFlagLevel1 : undefined,
      syncLevel2: newFlagSync ? newFlagLevel2 || undefined : undefined,
      syncLevel3: newFlagSync ? newFlagLevel3 || undefined : undefined,
    }
    if (existingFlag) updateFlagConfig(existingFlag.id, nextFlag)
    else addFlagConfig({ id: `${flagDialog}-${Date.now()}`, ...nextFlag })
    setFlagDialog(null)
    setEditingFlagId(null)
    notify(existingFlag ? "流动红旗已保存" : "流动红旗已新增")
  }

  const openFlagDialog = (period: FlagPeriod, item?: FlagConfig) => {
    setEditingFlagId(item?.id ?? null)
    setNewFlagName(item?.name ?? "")
    setNewFlagPoints(String(item?.points ?? 1))
    setNewFlagSync(item?.syncFiveEducation ?? false)
    setNewFlagEnabled(item?.enabled ?? true)
    setNewFlagLevel1(item?.syncLevel1 ?? "")
    setNewFlagLevel2(item?.syncLevel2 ?? "")
    setNewFlagLevel3(item?.syncLevel3 ?? "")
    setNewFlagImage(item?.image ?? null)
    setNewFlagImageError("")
    setFlagDialog(period)
  }

  const updateAppearance = (target: string | Partial<ClassRatingConfig>, legacyPatch?: Partial<ClassRatingConfig>) => {
    if (typeof target === "string") {
      if (appearanceDraft?.id === target) setAppearanceDraft((current) => current ? { ...current, ...(legacyPatch ?? {}) } : current)
      else updateClassRatingConfig(target, legacyPatch ?? {})
      return
    }
    setAppearanceDraft((current) => current ? { ...current, ...target } : current)
  }

  const openAppearanceDrawer = (item?: ClassRatingConfig) => {
    const id = `appearance-${Date.now()}`
    setEditingAppearanceId(item?.id ?? null)
    setAppearanceDraft(item ? { ...item } : {
      id,
      name: "新班级评级",
      description: "",
      image: null,
      defaultImage: "smile",
      autoIssueEnabled: false,
      autoIssueDay: "saturday",
      ruleType: "rank",
      rankStart: "1",
      rankEnd: "1",
      scoreStart: "0",
      scoreEnd: "100",
      theme: "blue",
    })
    setAppearanceDrawerOpen(true)
  }

  const addAppearance = () => openAppearanceDrawer()

  const closeAppearanceDrawer = () => {
    setAppearanceDrawerOpen(false)
    setAppearanceDraft(null)
    setEditingAppearanceId(null)
  }

  const handleAppearanceImage = (target: React.ChangeEvent<HTMLInputElement> | string, legacyEvent?: React.ChangeEvent<HTMLInputElement>) => {
    const event = typeof target === "string" ? legacyEvent : target
    if (!event) return
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return notify("评级图片不能超过 2MB")
    const reader = new FileReader()
    reader.onload = () => typeof target === "string" ? updateAppearance(target, { image: typeof reader.result === "string" ? reader.result : null }) : updateAppearance({ image: typeof reader.result === "string" ? reader.result : null })
    reader.readAsDataURL(file)
  }

  const saveAppearance = () => {
    if (!appearanceEditor) return
    if (!appearanceEditor.name.trim()) return notify("请填写等级名称")
    if (appearanceEditor.autoIssueEnabled) {
      const start = Number(appearanceEditor.ruleType === "score" ? appearanceEditor.scoreStart : appearanceEditor.rankStart)
      const end = Number(appearanceEditor.ruleType === "score" ? appearanceEditor.scoreEnd : appearanceEditor.rankEnd)
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < 0) return notify(appearanceEditor.ruleType === "score" ? "请填写有效的分数区间" : "请填写有效的排名区间")
      if (appearanceEditor.ruleType === "rank" && (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < 1)) return notify("排名区间必须为正整数")
      if (start > end) return notify(appearanceEditor.ruleType === "score" ? "分数起始值不能大于结束值" : "排名起始名次不能大于结束名次")
    }
    if (isNewAppearance) addClassRatingConfig(appearanceEditor)
    else if (editingAppearanceId) updateClassRatingConfig(editingAppearanceId, appearanceEditor)
    closeAppearanceDrawer()
    notify("班级评级已保存")
  }

  const deleteAppearance = () => {
    if (!appearanceToDelete) return
    if (appearances.length <= 1) {
      setAppearanceToDelete(null)
      notify("请至少保留一条班级评级配置")
      return
    }
    removeClassRatingConfig(appearanceToDelete)
    setAppearanceToDelete(null)
    closeAppearanceDrawer()
    notify("班级评级已删除")
  }

  const addDialogTitle = addTarget?.kind === "level1" ? "新增一级指标" : addTarget?.kind === "level2" ? "新增二级指标" : "新增三级指标"
  return (
    <div className="w-full">
      <a href="#class_config-main" className="sr-only z-[60] rounded-md bg-background px-3 py-2 text-sm font-semibold text-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">跳转到主要内容</a>
      <main id="class_config-main" tabIndex={-1} className="flex w-full min-w-0 flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e4e9fa] pb-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-2 text-primary-foreground shadow-lg shadow-primary/25"><Settings2 className="size-4" aria-hidden="true" /></span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">班级评价 / 配置中心</p>
              <h1 className="truncate text-lg font-bold tracking-tight">班级评价配置</h1>
            </div>
          </div>
          <div className="min-w-0">
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
          </div>
        </div>

      

        {page === "indicator" && (
          <div className="grid gap-4 xl:grid-cols-[minmax(330px,.82fr)_minmax(0,1.18fr)]">
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

            <section className="config-editor-panel flex min-w-0 flex-col rounded-2xl p-4 sm:p-5">
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
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      {selected.kind !== "level3" && <Button type="button" variant="outline" onClick={() => openAddDialog(selected.kind === "level1" ? "level2" : "level3", selected.node.id)} className="h-10 rounded-lg bg-transparent px-3 text-xs"><Plus className="size-3.5" />{selectedAddLabel}</Button>}
                      <Button type="button" variant="outline" onClick={() => setConfirmDeleteOpen(true)} className="h-10 rounded-lg bg-transparent px-3 text-xs text-destructive hover:text-destructive"><Trash2 className="size-3.5" />删除</Button>
                    </div>
                    <Button type="button" onClick={() => { if (selected.node.permission === "specified" && selected.node.memberIds.length === 0) { notify("请至少添加一名指定成员"); return }; commitScore(); notify("指标配置已保存") }} className="h-10 rounded-lg px-3 text-xs"><Save className="size-3.5" />保存指标</Button>
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

              </> : <p className="py-20 text-center text-sm text-muted-foreground">暂无可编辑指标</p>}
            </section>
          </div>
        )}

        {page === "flag" && <div className="grid gap-4 xl:grid-cols-2"><FlagEditor period="week" items={weeklyFlags} onAdd={() => openFlagDialog("week")} onEdit={(item) => openFlagDialog(item.period, item)} /><FlagEditor period="month" items={monthlyFlags} onAdd={() => openFlagDialog("month")} onEdit={(item) => openFlagDialog(item.period, item)} /></div>}

        {page === "appearance" && appearanceEditor && false && <section className="grid gap-4 xl:grid-cols-[minmax(280px,.72fr)_minmax(0,1.28fr)]">
          <aside className="config-subpanel min-w-0 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-bold">已配置评级</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">选择一项后可在右侧编辑发放规则与评级图片。</p></div><Button type="button" variant="outline" onClick={addAppearance} className="h-10 shrink-0 rounded-lg bg-transparent px-3 text-xs"><Plus aria-hidden="true" className="size-3.5" />新增评级</Button></div>
            <div className="mt-4 space-y-2">
              {appearances.map((item) => <button key={item.id} type="button" aria-pressed={!isNewAppearance && selectedAppearanceId === item.id} onClick={() => { setAppearanceDraft(null); setSelectedAppearanceId(item.id) }} className={cn("flex min-h-16 w-full items-center gap-3 rounded-xl border p-2.5 text-left transition hover:border-primary/35 hover:bg-primary/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30", !isNewAppearance && selectedAppearanceId === item.id ? "border-primary/35 bg-primary/[0.06]" : "border-border/60 bg-background/25")}>
                <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-primary to-primary-2"><img src={item.image ?? defaultRatingImage[item.defaultImage]} alt="" width={44} height={44} className="size-full object-cover" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-foreground">{item.name || "未命名评级"}</span><span className="mt-1 block truncate text-[11px] text-muted-foreground">{item.autoIssueEnabled === false ? "未开启自动发放" : `${item.ruleType === "score" ? `分数 ${item.scoreStart || "—"}–${item.scoreEnd || "—"} 分` : `排名 ${item.rankStart || "—"}–${item.rankEnd || "—"} 名`} · ${autoIssueOptions.find((option) => option.id === item.autoIssueDay)?.label}`}</span></span>
                {!isNewAppearance && selectedAppearanceId === item.id && <Check aria-hidden="true" className="size-4 shrink-0 text-primary" />}
              </button>)}
            </div>
          </aside>

          <section className="config-editor-panel min-w-0 rounded-2xl p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-4"><div className="flex min-w-0 items-center gap-2"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-pink/15 text-brand-pink"><Palette aria-hidden="true" className="size-5" /></span><div className="min-w-0"><h2 className="text-base font-bold">{isNewAppearance ? "新增班级评级" : "编辑班级评级"}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">配置名称、图片和自动发放规则。</p></div></div>{isNewAppearance ? <Button type="button" onClick={saveAppearance} className="h-10 shrink-0 rounded-lg px-3 text-xs"><Save aria-hidden="true" className="size-3.5" />保存评级</Button> : <Button type="button" variant="outline" onClick={() => setAppearanceToDelete(appearanceEditor.id)} className="h-10 shrink-0 rounded-lg border-destructive/30 bg-transparent px-3 text-xs text-destructive hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"><Trash2 aria-hidden="true" className="size-3.5" />删除评级</Button>}</div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground sm:col-span-2">等级名称<input name={`appearance-${appearanceEditor.id}-name`} autoComplete="off" value={appearanceEditor.name} onChange={(event) => updateAppearance(appearanceEditor.id, { name: event.target.value })} placeholder="例如：优雅示范…" className="h-10 rounded-lg border border-border/70 bg-background/55 px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /></label>

              <fieldset className="rounded-xl border border-border/60 bg-background/35 p-3 sm:col-span-2"><legend className="px-1 text-xs font-semibold text-muted-foreground">评级图片</legend><div className="mt-1 grid gap-2 sm:grid-cols-3">{([{ value: "smile" as const, label: "笑脸" }, { value: "neutral" as const, label: "平脸" }, { value: "cry" as const, label: "哭脸" }]).map((option) => <button key={option.value} type="button" aria-pressed={appearanceEditor.defaultImage === option.value} onClick={() => updateAppearance(appearanceEditor.id, { defaultImage: option.value })} className={cn("flex min-h-12 items-center gap-2 rounded-lg border px-3 text-left text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30", appearanceEditor.defaultImage === option.value ? "border-primary/35 bg-primary/10 text-primary" : "border-border/60 bg-background/45 text-muted-foreground hover:border-primary/25 hover:text-foreground")}><img src={defaultRatingImage[option.value]} alt="" width={28} height={28} className="size-7" />{option.label}</button>)}</div></fieldset>

              <div className="flex flex-col gap-2 text-xs font-semibold text-muted-foreground sm:col-span-2"><span>自定义评级图片</span><div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border/80 bg-background/35 p-3"><div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-primary-2 text-white"><img src={appearanceEditor.image ?? defaultRatingImage[appearanceEditor.defaultImage]} alt={`${appearanceEditor.name || "班级评级"}图片缩略图`} width={80} height={80} className="size-full object-cover" /></div><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-foreground">{appearanceEditor.image ? "已上传自定义图片" : "当前使用默认表情图片"}</p><p className="mt-1 text-[11px] font-normal leading-4 text-muted-foreground">支持常见图片格式，单张不超过 2MB。</p></div><div className="flex items-center gap-2">{appearanceEditor.image && <button type="button" onClick={() => updateAppearance(appearanceEditor.id, { image: null })} className="min-h-10 rounded-lg border border-border/70 bg-background/55 px-3 text-xs font-semibold text-muted-foreground transition hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">恢复默认</button>}<label className="flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border/70 bg-background/55 px-3 text-xs font-semibold text-foreground transition hover:border-primary/45 hover:bg-primary/[0.035] focus-within:ring-2 focus-within:ring-primary/30"><ImagePlus aria-hidden="true" className="size-4 text-primary" />{appearanceEditor.image ? "更换图片" : "上传图片"}<input name={`appearance-${appearanceEditor.id}-image`} type="file" accept="image/*" onChange={(event) => handleAppearanceImage(appearanceEditor.id, event)} className="sr-only" /></label></div></div></div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/25 p-3 sm:col-span-2"><div><p className="text-xs font-semibold text-foreground">是否自动发放</p><p className="mt-1 text-[11px] leading-4 text-muted-foreground">开启后按所选规则自动匹配班级评级。</p></div><ToggleSwitch checked={appearanceEditor.autoIssueEnabled} onChange={() => updateAppearance(appearanceEditor.id, { autoIssueEnabled: !appearanceEditor.autoIssueEnabled })} label={`${appearanceEditor.name || "班级评级"}自动发放`} /></div>

              {appearanceEditor.autoIssueEnabled && <><fieldset className="rounded-xl border border-border/60 bg-background/35 p-3 sm:col-span-2"><legend className="px-1 text-xs font-semibold text-muted-foreground">发放方式</legend><div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="班级评级自动发放方式">{ratingRuleOptions.map((option) => <button key={option.id} type="button" role="radio" aria-checked={appearanceEditor.ruleType === option.id} onClick={() => updateAppearance(appearanceEditor.id, { ruleType: option.id })} className={cn("rounded-lg border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30", appearanceEditor.ruleType === option.id ? "border-primary/35 bg-primary/10 text-primary" : "border-border/60 bg-background/45 text-muted-foreground hover:border-primary/25 hover:text-foreground")}><span className="block text-xs font-bold">{option.label}</span><span className="mt-1 block text-[11px] font-normal leading-4">{option.description}</span></button>)}</div></fieldset>
              {appearanceEditor.ruleType === "score" ? <fieldset className="rounded-xl border border-border/60 bg-background/35 p-3 sm:col-span-2"><legend className="px-1 text-xs font-semibold text-muted-foreground">分数区间</legend><div className="mt-1 grid gap-3 sm:grid-cols-2"><label className="flex flex-col gap-1.5 text-xs text-muted-foreground">起始分数<input name={`appearance-${appearanceEditor.id}-score-start`} autoComplete="off" inputMode="decimal" type="number" min="0" step="0.1" value={appearanceEditor.scoreStart} onChange={(event) => updateAppearance(appearanceEditor.id, { scoreStart: event.target.value })} className="h-10 rounded-lg border border-border/70 bg-background/55 px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /></label><label className="flex flex-col gap-1.5 text-xs text-muted-foreground">结束分数（包含）<input name={`appearance-${appearanceEditor.id}-score-end`} autoComplete="off" inputMode="decimal" type="number" min="0" step="0.1" value={appearanceEditor.scoreEnd} onChange={(event) => updateAppearance(appearanceEditor.id, { scoreEnd: event.target.value })} className="h-10 rounded-lg border border-border/70 bg-background/55 px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /></label></div></fieldset> : <fieldset className="rounded-xl border border-border/60 bg-background/35 p-3 sm:col-span-2"><legend className="px-1 text-xs font-semibold text-muted-foreground">年级排名区间</legend><div className="mt-1 grid gap-3 sm:grid-cols-2"><label className="flex flex-col gap-1.5 text-xs text-muted-foreground">开始排名<input name={`appearance-${appearanceEditor.id}-rank-start`} autoComplete="off" inputMode="numeric" type="number" min="1" step="1" value={appearanceEditor.rankStart} onChange={(event) => updateAppearance(appearanceEditor.id, { rankStart: event.target.value })} className="h-10 rounded-lg border border-border/70 bg-background/55 px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /></label><label className="flex flex-col gap-1.5 text-xs text-muted-foreground">结束排名（包含）<input name={`appearance-${appearanceEditor.id}-rank-end`} autoComplete="off" inputMode="numeric" type="number" min="1" step="1" value={appearanceEditor.rankEnd} onChange={(event) => updateAppearance(appearanceEditor.id, { rankEnd: event.target.value })} className="h-10 rounded-lg border border-border/70 bg-background/55 px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /></label></div></fieldset>}
              <fieldset className="rounded-xl border border-border/60 bg-background/35 p-3 sm:col-span-2"><legend className="px-1 text-xs font-semibold text-muted-foreground">自动发放时间</legend><div className="mt-1 grid gap-2 sm:grid-cols-3">{autoIssueOptions.map((option) => <label key={option.id} className={cn("flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition", appearanceEditor.autoIssueDay === option.id ? "border-primary/35 bg-primary/10 text-primary" : "border-border/60 bg-background/45 text-muted-foreground hover:border-primary/25 hover:text-foreground")}><input type="radio" name={`appearance-${appearanceEditor.id}-auto-issue-day`} value={option.id} checked={appearanceEditor.autoIssueDay === option.id} onChange={() => updateAppearance(appearanceEditor.id, { autoIssueDay: option.id })} className="size-4 shrink-0 accent-[var(--primary)]" />{option.label}</label>)}</div></fieldset></>}
            </div>
          </section>
        </section>}

        {page === "appearance" && <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-xs font-semibold text-primary">班级评价 / 评级管理</p><h2 className="mt-1 text-lg font-bold tracking-tight text-foreground">班级评级配置</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">维护评级图片及自动发放规则，评级会同步用于班级排行榜展示。</p></div>
            <Button type="button" onClick={() => openAppearanceDrawer()} className="h-10 rounded-lg px-3 text-xs"><Plus aria-hidden="true" className="size-3.5" />新增班级评级</Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {appearances.map((item) => {
              const ruleLabel = item.ruleType === "score" ? "分数区间" : "年级排名"
              const ruleRange = item.ruleType === "score" ? `${item.scoreStart || "—"}–${item.scoreEnd || "—"} 分` : `${item.rankStart || "—"}–${item.rankEnd || "—"} 名`
              const issueDay = autoIssueOptions.find((option) => option.id === item.autoIssueDay)?.label ?? "—"
              return <article key={item.id} className="group flex min-h-[252px] flex-col rounded-2xl border border-border/70 bg-background/65 p-4 shadow-[0_10px_28px_rgba(32,58,105,0.06)] transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_14px_34px_rgba(47,102,230,0.12)]">
                <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-primary/15 bg-primary/[0.06] text-primary"><img src={item.image ?? defaultRatingImage[item.defaultImage]} alt={`${item.name || "班级评级"}图片`} width={56} height={56} className="size-full object-cover" /></span><div className="min-w-0"><h3 className="truncate text-base font-bold text-foreground">{item.name || "未命名评级"}</h3><p className="mt-1 text-[11px] text-muted-foreground">{item.image ? "已上传评级图片" : "默认等级图片"}</p></div></div><button type="button" aria-label={`编辑${item.name || "班级评级"}`} onClick={() => openAppearanceDrawer(item)} className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background/65 text-muted-foreground transition hover:border-primary/35 hover:bg-primary/[0.06] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"><Pencil aria-hidden="true" className="size-4" /></button></div>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/35 px-3 py-2.5"><span className="text-xs font-semibold text-foreground">自动发放</span><span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", item.autoIssueEnabled ? "bg-emerald-500/12 text-emerald-700" : "bg-muted text-muted-foreground")}>{item.autoIssueEnabled ? "已开启" : "未开启"}</span></div>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3 text-xs"><div><dt className="text-[11px] text-muted-foreground">发放方式</dt><dd className="mt-1 font-semibold text-foreground">{item.autoIssueEnabled ? ruleLabel : "—"}</dd></div><div><dt className="text-[11px] text-muted-foreground">匹配范围</dt><dd className="mt-1 font-semibold text-foreground">{item.autoIssueEnabled ? ruleRange : "—"}</dd></div><div className="col-span-2 flex items-center justify-between gap-3 border-t border-border/55 pt-3"><dt className="text-[11px] text-muted-foreground">自动发放时间</dt><dd className="font-semibold text-foreground">{item.autoIssueEnabled ? issueDay : "未设置"}</dd></div></dl>
              </article>
            })}
          </div>
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

      <Dialog open={flagDialog !== null} onOpenChange={(open) => { if (!open) { setFlagDialog(null); setEditingFlagId(null) } }}>
        <DialogContent className="fixed inset-y-0 right-0 left-auto top-0 flex h-full max-h-full w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden overscroll-contain rounded-none rounded-l-[24px] border-l border-[#d5ddf7] bg-white p-0 shadow-[-24px_0_60px_-32px_rgba(48,62,139,0.78)] data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right sm:w-[640px] sm:max-w-none"><DialogHeader className="border-b border-[#dce4fa] px-5 py-4"><DialogTitle>{editingFlagId ? "编辑" : "新增"}{flagDialog === "week" ? "周" : "月"}流动红旗</DialogTitle></DialogHeader><div className="min-h-0 flex-1 overflow-y-auto px-5 py-5"><div className="grid gap-4">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">红旗名称<input name="flag-name" autoComplete="off" value={newFlagName} onChange={(event) => setNewFlagName(event.target.value)} placeholder="例如：阅读推广示范班…" className="h-10 rounded-lg border border-border/70 bg-background/55 px-3 text-sm font-normal text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /></label>
          <div className="rounded-xl border border-border/60 bg-background/35 p-3"><div className="flex flex-wrap items-center gap-3"><div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/[0.08] text-primary">{newFlagImage ? <img src={newFlagImage} alt="待新增流动红旗图片预览" width={64} height={64} className="size-full object-cover" /> : <Flag aria-hidden="true" className="size-6" />}</div><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-foreground">流动红旗图片</p><p className="mt-1 text-[11px] leading-4 text-muted-foreground">未上传时使用默认状态图标，支持常见图片格式，单张不超过 2MB。</p></div><div className="flex shrink-0 items-center gap-2">{newFlagImage && <button type="button" onClick={() => { setNewFlagImage(null); setNewFlagImageError("") }} className="h-10 rounded-lg border border-border/70 bg-background/55 px-2.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">恢复默认</button>}<label className="flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-primary/20 bg-primary/[0.04] px-3 text-xs font-semibold text-primary transition hover:bg-primary/10 focus-within:ring-2 focus-within:ring-primary/30"><ImagePlus aria-hidden="true" className="size-3.5" />{newFlagImage ? "更换图片" : "上传图片"}<input name="new-flag-image" type="file" accept="image/*" onChange={handleNewFlagImage} className="sr-only" /></label></div></div>{newFlagImageError && <p role="alert" className="mt-2 text-xs text-destructive">{newFlagImageError}</p>}</div>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/25 p-3"><div><p className="text-xs font-semibold text-foreground">启用流动红旗</p><p className="mt-1 text-[11px] leading-4 text-muted-foreground">关闭后不在评选和发放列表中展示。</p></div><ToggleSwitch checked={newFlagEnabled} onChange={() => setNewFlagEnabled((current) => !current)} label="启用流动红旗" /></div>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/25 p-3"><div><p className="text-xs font-semibold text-foreground">发放五育积分</p><p className="mt-1 text-[11px] leading-4 text-muted-foreground">发放流动红旗后自动为对应班级去全部学生增加五育积分</p></div><ToggleSwitch checked={newFlagSync} onChange={() => setNewFlagSync((current) => !current)} label="新增流动红旗同步到五育指标" /></div>
          {newFlagSync && <div className="grid gap-3 rounded-xl border border-primary/20 bg-primary/[0.035] p-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">奖励积分* <input name="new-flag-points" autoComplete="off" required type="number" inputMode="numeric" min="1" max="100" step="1" value={newFlagPoints} onChange={(event) => setNewFlagPoints(event.target.value)} className="h-10 rounded-lg border border-border/70 bg-background/55 px-3 text-sm font-normal text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" /><span className="font-normal leading-5">班级每位学生都获得该积分，支持 1–100 的整数。</span></label>
            <div className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground"><span>一级指标 <span className="text-destructive">*</span></span><Select value={newFlagLevel1} onValueChange={(value) => { setNewFlagLevel1(String(value ?? "")); setNewFlagLevel2(""); setNewFlagLevel3("") }}><SelectTrigger aria-label="选择一级指标" className="w-full font-normal"><SelectValue placeholder="请选择一级指标" /></SelectTrigger><SelectContent>{Object.keys(FIVE_EDUCATION_OPTIONS).map((level1) => <SelectItem key={level1} value={level1}>{level1}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground"><span>二级指标 <span className="font-normal text-muted-foreground">（可选）</span></span><Select value={newFlagLevel2} disabled={!newFlagLevel1} onValueChange={(value) => { setNewFlagLevel2(String(value ?? "")); setNewFlagLevel3("") }}><SelectTrigger aria-label="选择二级指标" className="w-full font-normal"><SelectValue placeholder="不指定二级指标" /></SelectTrigger><SelectContent>{newFlagLevel2Options.map((level2) => <SelectItem key={level2} value={level2}>{level2}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground"><span>三级指标 <span className="font-normal text-muted-foreground">（可选）</span></span><Select value={newFlagLevel3} disabled={!newFlagLevel2} onValueChange={(value) => setNewFlagLevel3(String(value ?? ""))}><SelectTrigger aria-label="选择三级指标" className="w-full font-normal"><SelectValue placeholder="不指定三级指标" /></SelectTrigger><SelectContent>{newFlagLevel3Options.map((level3) => <SelectItem key={level3} value={level3}>{level3}</SelectItem>)}</SelectContent></Select></div>
          </div>}
        </div></div><DialogFooter className="mx-0 mb-0 flex-row justify-between gap-2 border-t border-[#dce4fa] bg-white px-5 py-4">{editingFlagId ? <Button type="button" variant="outline" className="border-destructive/30 bg-transparent text-xs text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setFlagToDelete(editingFlagId)}><Trash2 aria-hidden="true" className="size-3.5" />删除红旗</Button> : <span /> }<div className="flex gap-2"><Button type="button" variant="outline" className="bg-transparent text-xs" onClick={() => { setFlagDialog(null); setEditingFlagId(null) }}>取消</Button><Button type="button" className="text-xs" onClick={saveFlag}>{editingFlagId ? "保存修改" : "新增红旗"}</Button></div></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={flagToDelete !== null} onOpenChange={(open) => !open && setFlagToDelete(null)}>
        <DialogContent className="glass-surface sm:max-w-md"><DialogHeader><DialogTitle>确认删除流动红旗</DialogTitle></DialogHeader><p className="text-sm leading-6 text-muted-foreground">删除“{flagConfigs.find((item) => item.id === flagToDelete)?.name}”后，该红旗将不再用于评选和发放。</p><DialogFooter><Button type="button" variant="outline" className="bg-transparent text-xs" onClick={() => setFlagToDelete(null)}>取消</Button><Button type="button" variant="destructive" className="text-xs" onClick={() => { if (!flagToDelete) return; removeFlagConfig(flagToDelete); setFlagToDelete(null); setFlagDialog(null); setEditingFlagId(null); notify("流动红旗已删除") }}>确认删除</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="glass-surface sm:max-w-md"><DialogHeader><DialogTitle>确认删除指标</DialogTitle></DialogHeader><p className="text-sm leading-6 text-muted-foreground">删除“{selected?.node.name}”后，其下级指标也会一并移除；历史评价记录不受影响。</p><DialogFooter><Button type="button" variant="outline" className="bg-transparent text-xs" onClick={() => setConfirmDeleteOpen(false)}>取消</Button><Button type="button" variant="destructive" className="text-xs" onClick={deleteSelected}>确认删除</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={appearanceDrawerOpen} onOpenChange={(open) => { if (!open) closeAppearanceDrawer() }}>
        <DialogContent className="fixed inset-y-0 right-0 left-auto flex h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden overscroll-contain rounded-none border-l border-[#dce4fa] bg-[#fbfcff] p-0 shadow-[-20px_0_48px_rgba(24,52,104,0.16)] sm:w-[50vw]">
          {appearanceEditor && <>
            <DialogHeader className="border-b border-[#dce4fa] bg-white px-5 py-5 text-left"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-brand-pink/15 text-brand-pink"><Palette aria-hidden="true" className="size-5" /></span><div><DialogTitle>{isNewAppearance ? "新增班级评级" : "编辑班级评级"}</DialogTitle><p className="mt-1 text-xs font-normal leading-5 text-muted-foreground">配置评级图片及自动发放规则。</p></div></div></DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground sm:col-span-2">等级名称<input name={`appearance-${appearanceEditor.id}-name`} autoComplete="off" value={appearanceEditor.name} onChange={(event) => updateAppearance({ name: event.target.value })} placeholder="例如：优雅示范…" className="h-10 rounded-lg border border-border/70 bg-white px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /></label>
                <div className="flex flex-col gap-2 text-xs font-semibold text-muted-foreground sm:col-span-2"><span>上传评级图片</span><div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border/80 bg-white/80 p-3"><div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-primary/15 bg-primary/[0.06] text-primary"><img src={appearanceEditor.image ?? defaultRatingImage[appearanceEditor.defaultImage]} alt={`${appearanceEditor.name || "班级评级"}图片预览`} width={80} height={80} className="size-full object-cover" /></div><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-foreground">{appearanceEditor.image ? "已上传评级图片" : "当前使用默认等级图片"}</p><p className="mt-1 text-[11px] font-normal leading-4 text-muted-foreground">支持常见图片格式，单张不超过 2MB。</p></div><div className="flex items-center gap-2">{appearanceEditor.image && <button type="button" onClick={() => updateAppearance({ image: null })} className="min-h-10 rounded-lg border border-border/70 bg-white px-3 text-xs font-semibold text-muted-foreground transition hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">恢复默认</button>}<label className="flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border/70 bg-white px-3 text-xs font-semibold text-foreground transition hover:border-primary/45 hover:bg-primary/[0.035] focus-within:ring-2 focus-within:ring-primary/30"><ImagePlus aria-hidden="true" className="size-4 text-primary" />{appearanceEditor.image ? "更换图片" : "上传图片"}<input name={`appearance-${appearanceEditor.id}-image`} type="file" accept="image/*" onChange={handleAppearanceImage} className="sr-only" /></label></div></div></div>
                <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-white p-3 sm:col-span-2"><div><p className="text-xs font-semibold text-foreground">是否自动发放</p><p className="mt-1 text-[11px] leading-4 text-muted-foreground">开启后按所选规则自动匹配班级评级。</p></div><ToggleSwitch checked={appearanceEditor.autoIssueEnabled} onChange={() => updateAppearance({ autoIssueEnabled: !appearanceEditor.autoIssueEnabled })} label={`${appearanceEditor.name || "班级评级"}自动发放`} /></div>
                {appearanceEditor.autoIssueEnabled && <><fieldset className="rounded-xl border border-border/60 bg-white p-3 sm:col-span-2"><legend className="px-1 text-xs font-semibold text-muted-foreground">发放方式</legend><div className="mt-1 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="班级评级自动发放方式">{ratingRuleOptions.map((option) => <button key={option.id} type="button" role="radio" aria-checked={appearanceEditor.ruleType === option.id} onClick={() => updateAppearance({ ruleType: option.id })} className={cn("rounded-lg border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30", appearanceEditor.ruleType === option.id ? "border-primary/35 bg-primary/10 text-primary" : "border-border/60 bg-background/45 text-muted-foreground hover:border-primary/25 hover:text-foreground")}><span className="block text-xs font-bold">{option.label}</span><span className="mt-1 block text-[11px] font-normal leading-4">{option.description}</span></button>)}</div></fieldset>
                {appearanceEditor.ruleType === "score" ? <fieldset className="rounded-xl border border-border/60 bg-white p-3 sm:col-span-2"><legend className="px-1 text-xs font-semibold text-muted-foreground">分数区间</legend><div className="mt-1 grid gap-3 sm:grid-cols-2"><label className="flex flex-col gap-1.5 text-xs text-muted-foreground">起始分数<input name={`appearance-${appearanceEditor.id}-score-start`} autoComplete="off" inputMode="decimal" type="number" min="0" step="0.1" value={appearanceEditor.scoreStart} onChange={(event) => updateAppearance({ scoreStart: event.target.value })} className="h-10 rounded-lg border border-border/70 bg-background/55 px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /></label><label className="flex flex-col gap-1.5 text-xs text-muted-foreground">结束分数（包含）<input name={`appearance-${appearanceEditor.id}-score-end`} autoComplete="off" inputMode="decimal" type="number" min="0" step="0.1" value={appearanceEditor.scoreEnd} onChange={(event) => updateAppearance({ scoreEnd: event.target.value })} className="h-10 rounded-lg border border-border/70 bg-background/55 px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /></label></div></fieldset> : <fieldset className="rounded-xl border border-border/60 bg-white p-3 sm:col-span-2"><legend className="px-1 text-xs font-semibold text-muted-foreground">年级排名区间</legend><div className="mt-1 grid gap-3 sm:grid-cols-2"><label className="flex flex-col gap-1.5 text-xs text-muted-foreground">开始排名<input name={`appearance-${appearanceEditor.id}-rank-start`} autoComplete="off" inputMode="numeric" type="number" min="1" step="1" value={appearanceEditor.rankStart} onChange={(event) => updateAppearance({ rankStart: event.target.value })} className="h-10 rounded-lg border border-border/70 bg-background/55 px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /></label><label className="flex flex-col gap-1.5 text-xs text-muted-foreground">结束排名（包含）<input name={`appearance-${appearanceEditor.id}-rank-end`} autoComplete="off" inputMode="numeric" type="number" min="1" step="1" value={appearanceEditor.rankEnd} onChange={(event) => updateAppearance({ rankEnd: event.target.value })} className="h-10 rounded-lg border border-border/70 bg-background/55 px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /></label></div></fieldset>}
                <fieldset className="rounded-xl border border-border/60 bg-white p-3 sm:col-span-2"><legend className="px-1 text-xs font-semibold text-muted-foreground">自动发放时间</legend><div className="mt-1 grid gap-2 sm:grid-cols-3">{autoIssueOptions.map((option) => <label key={option.id} className={cn("flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition", appearanceEditor.autoIssueDay === option.id ? "border-primary/35 bg-primary/10 text-primary" : "border-border/60 bg-background/45 text-muted-foreground hover:border-primary/25 hover:text-foreground")}><input type="radio" name={`appearance-${appearanceEditor.id}-auto-issue-day`} value={option.id} checked={appearanceEditor.autoIssueDay === option.id} onChange={() => updateAppearance({ autoIssueDay: option.id })} className="size-4 shrink-0 accent-[var(--primary)]" />{option.label}</label>)}</div></fieldset></>}
              </div>
            </div>
            <DialogFooter className="mx-0 mb-0 flex-row justify-between gap-2 border-t border-[#dce4fa] bg-white px-5 py-4">{!isNewAppearance ? <Button type="button" variant="outline" className="border-destructive/30 bg-transparent text-xs text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setAppearanceToDelete(appearanceEditor.id)}><Trash2 aria-hidden="true" className="size-3.5" />删除评级</Button> : <span /> }<div className="flex gap-2"><Button type="button" variant="outline" className="bg-transparent text-xs" onClick={closeAppearanceDrawer}>取消</Button><Button type="button" className="text-xs" onClick={saveAppearance}><Save aria-hidden="true" className="size-3.5" />{isNewAppearance ? "保存评级" : "保存修改"}</Button></div></DialogFooter>
          </>}
        </DialogContent>
      </Dialog>

      <Dialog open={appearanceToDelete !== null} onOpenChange={(open) => !open && setAppearanceToDelete(null)}>
        <DialogContent className="glass-surface sm:max-w-md"><DialogHeader><DialogTitle>确认删除班级评级</DialogTitle></DialogHeader><p className="text-sm leading-6 text-muted-foreground">删除“{appearances.find((item) => item.id === appearanceToDelete)?.name}”后，该评级将不再用于班级排行榜展示。</p><DialogFooter><Button type="button" variant="outline" className="bg-transparent text-xs" onClick={() => setAppearanceToDelete(null)}>取消</Button><Button type="button" variant="destructive" className="text-xs" onClick={deleteAppearance}>确认删除</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  )
}
