"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Boxes,
  CalendarClock,
  Check,
  ChevronDown,
  CirclePlus,
  ClipboardList,
  Coins,
  Download,
  Package,
  Pencil,
  Plus,
  Search,
  Settings2,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { StandalonePageShell } from "@/components/evaluation/standalone-page-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AWARD_LEVEL1_LIST } from "@/lib/award-utils";
import { useEvaluation } from "@/lib/evaluation-context";
import { usePermission } from "@/lib/use-permission";
import { cn } from "@/lib/utils";
import type { MallPointRequirement, MallProduct } from "@/lib/types";

type ManagerTab = "products" | "records" | "config";
type RedemptionStatusFilter = "all" | "redeemed" | "unredeemed";

type ProductDraft = {
  name: string;
  category: string;
  description: string;
  image: string;
  initialStock: string;
  pointsCost: string;
  gradeIds: string[];
  requirementsEnabled: boolean;
  requirementMode: "all" | "any";
  requirements: MallPointRequirement[];
};

const PRODUCT_IMAGES = [
  "/xszp/images/activity-gallery/activity-storybook.png",
  "/xszp/images/activity-gallery/activity-sports.png",
  "/xszp/images/activity-gallery/activity-recycling.png",
  "/xszp/images/activity-gallery/activity-makerspace.png",
  "/xszp/images/activity-gallery/activity-garden.png",
];

const INITIAL_DRAFT: ProductDraft = {
  name: "",
  category: "成长用品",
  description: "",
  image: PRODUCT_IMAGES[0],
  initialStock: "20",
  pointsCost: "10",
  gradeIds: [],
  requirementsEnabled: false,
  requirementMode: "all",
  requirements: [],
};

function dateTimeLocal(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function SectionHeading({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Package;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function RequirementEditor({
  draft,
  setDraft,
}: {
  draft: ProductDraft;
  setDraft: (updater: (value: ProductDraft) => ProductDraft) => void;
}) {
  const setRequirement = (
    index: number,
    field: keyof MallPointRequirement,
    value: string | number,
  ) => {
    setDraft((current) => ({
      ...current,
      requirements: current.requirements.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  };
  return (
    <div className="overflow-hidden rounded-2xl border border-primary/15 bg-white shadow-[0_12px_24px_-24px_rgba(54,91,168,.48)]">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[linear-gradient(110deg,rgba(65,111,225,.10),rgba(65,111,225,.025))] px-4 py-3">
        <div>
          <p className="text-sm font-bold text-foreground">附加兑换条件</p>
          <p className="mt-1 text-xs text-muted-foreground">
            按本学期五育一级指标积分校验
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-xs font-bold",
              draft.requirementsEnabled
                ? "text-primary"
                : "text-muted-foreground",
            )}
          >
            {draft.requirementsEnabled ? "已开启" : "未开启"}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={draft.requirementsEnabled}
            onClick={() =>
              setDraft((current) => ({
                ...current,
                requirementsEnabled: !current.requirementsEnabled,
              }))
            }
            className={cn(
              "relative h-8 w-14 rounded-full border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
              draft.requirementsEnabled
                ? "border-primary bg-primary shadow-[0_5px_12px_rgba(65,111,225,.26)]"
                : "border-slate-200 bg-slate-200",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 flex size-6 items-center justify-center rounded-full bg-white shadow-sm transition-transform",
                draft.requirementsEnabled ? "translate-x-6" : "translate-x-0.5",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  draft.requirementsEnabled ? "bg-primary" : "bg-slate-300",
                )}
              />
            </span>
          </button>
        </div>
      </div>
      {draft.requirementsEnabled && (
        <div className="space-y-3 bg-[#fbfcff] p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-muted-foreground">
                条件满足方式
              </span>
              <span className="rounded-full bg-primary/8 px-2 py-1 text-primary">
                {draft.requirementMode === "all"
                  ? "全部条件同时满足"
                  : "满足任一条件即可"}
              </span>
            </div>
            <div className="inline-flex w-fit rounded-xl border border-[#dce6f5] bg-white p-1">
              {(["all", "any"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      requirementMode: mode,
                    }))
                  }
                  className={cn(
                    "min-h-8 rounded-lg px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                    draft.requirementMode === mode
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-primary/5 hover:text-primary",
                  )}
                >
                  {mode === "all" ? "同时满足" : "满足任一"}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {draft.requirements.length === 0 && (
              <p className="rounded-xl border border-dashed border-primary/20 bg-white px-3 py-3 text-xs text-muted-foreground">
                暂未设置具体指标，添加后才会限制兑换资格。
              </p>
            )}
            {draft.requirements.map((item, index) => (
              <div
                key={`${item.level1}-${index}`}
                className="grid items-center gap-2 rounded-xl border border-[#e0e8f5] bg-white p-2.5 sm:grid-cols-[minmax(0,1fr)_150px_auto]"
              >
                <select
                  aria-label="选择一级指标"
                  value={item.level1}
                  onChange={(event) =>
                    setRequirement(index, "level1", event.target.value)
                  }
                  className="h-10 rounded-lg border border-input bg-[#fbfdff] px-3 text-sm font-medium outline-none focus:border-primary"
                >
                  <option value="">选择一级指标</option>
                  {AWARD_LEVEL1_LIST.map((level1) => (
                    <option key={level1} value={level1}>
                      {level1}
                    </option>
                  ))}
                </select>
                <label className="flex h-10 items-center gap-2 rounded-lg border border-input bg-[#fbfdff] px-3 text-sm">
                  <span className="shrink-0 text-xs text-muted-foreground">
                    最低
                  </span>
                  <Input
                    type="number"
                    min="0"
                    value={item.minimumPoints}
                    aria-label={`${item.level1 || "指标"}最低积分`}
                    onChange={(event) =>
                      setRequirement(
                        index,
                        "minimumPoints",
                        Number(event.target.value),
                      )
                    }
                    className="h-7 border-0 bg-transparent px-0 text-right font-bold shadow-none focus-visible:ring-0"
                  />
                  <span className="shrink-0 text-xs text-muted-foreground">
                    分
                  </span>
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="删除条件"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      requirements: current.requirements.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    }))
                  }
                >
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-dashed border-primary/30 bg-white text-primary hover:bg-primary/5"
            onClick={() =>
              setDraft((current) => ({
                ...current,
                requirements: [
                  ...current.requirements,
                  { level1: "", minimumPoints: 10 },
                ],
              }))
            }
          >
            <Plus className="size-3.5" />
            添加一级指标条件
          </Button>
        </div>
      )}
    </div>
  );
}

function ProductEditor({
  open,
  onOpenChange,
  initialProduct,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialProduct?: MallProduct | null;
  onSubmit: (draft: ProductDraft) => void;
}) {
  const [draft, setDraft] = useState<ProductDraft>(INITIAL_DRAFT);
  const [initializedId, setInitializedId] = useState<string | null>(null);
  const productId = initialProduct?.id ?? "new";
  if (open && initializedId !== productId) {
    setInitializedId(productId);
    setDraft(
      initialProduct
        ? {
            name: initialProduct.name,
            category: initialProduct.category,
            description: initialProduct.description,
            image: initialProduct.image,
            initialStock: String(initialProduct.stock),
            pointsCost: String(initialProduct.pointsCost),
            gradeIds: initialProduct.gradeIds,
            requirementsEnabled: initialProduct.requirementsEnabled,
            requirementMode: initialProduct.requirementMode,
            requirements: initialProduct.requirements,
          }
        : INITIAL_DRAFT,
    );
  }
  const toggleGrade = (id: string) =>
    setDraft((current) => ({
      ...current,
      gradeIds: current.gradeIds.includes(id)
        ? current.gradeIds.filter((item) => item !== id)
        : [...current.gradeIds, id],
    }));
  const { grades } = useEvaluation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bottom-0 left-0 top-auto max-h-[92dvh] max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-b-none border-primary/15 p-5 shadow-[0_-16px_48px_rgba(42,69,130,.18)] sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[45vw] sm:max-w-[45vw] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-7 sm:shadow-[0_24px_64px_rgba(42,69,130,.2)]">
        <DialogHeader className="border-b border-primary/10 pb-4">
          <DialogTitle className="text-xl">
            {initialProduct ? "编辑商品" : "发布新商品"}
          </DialogTitle>
          <DialogDescription>
            完善商品信息、适用范围和兑换资格，发布后将实时同步至家长端。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-1.5 text-sm font-medium text-foreground sm:col-span-2 lg:col-span-2">
            商品名称
            <Input
              value={draft.name}
              placeholder="例如：校园阅读书签"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            商品分类
            <Input
              value={draft.category}
              placeholder="成长用品"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  category: event.target.value,
                }))
              }
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            所需积分
            <Input
              type="number"
              min="1"
              value={draft.pointsCost}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  pointsCost: event.target.value,
                }))
              }
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            {initialProduct ? "当前库存" : "商品初始库存"}
            <Input
              type="number"
              min="0"
              value={draft.initialStock}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  initialStock: event.target.value,
                }))
              }
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            商品图片
            <select
              value={draft.image}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  image: event.target.value,
                }))
              }
              className="h-9 rounded-lg border border-input bg-white px-2 text-sm outline-none focus:border-primary"
            >
              {PRODUCT_IMAGES.map((image, index) => (
                <option key={image} value={image}>
                  配图 {index + 1}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-foreground sm:col-span-2 lg:col-span-4">
            商品介绍
            <textarea
              value={draft.description}
              rows={3}
              placeholder="说明商品用途、领取方式等"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className="w-full resize-none rounded-xl border border-input bg-[#fbfdff] px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </label>
          <div className="sm:col-span-2 lg:col-span-4">
            <p className="mb-1.5 text-sm font-medium text-foreground">
              可兑换年级
            </p>
            <details className="group rounded-xl border border-input bg-[#fbfdff]">
              <summary className="flex h-11 cursor-pointer list-none items-center justify-between px-3 text-sm text-muted-foreground">
                <span>
                  {draft.gradeIds.length === 0
                    ? "全部年级"
                    : `已选择 ${draft.gradeIds.length} 个年级`}
                </span>
                <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
              </summary>
              <div className="grid gap-2 border-t border-border bg-white p-3 sm:grid-cols-3 lg:grid-cols-4">
                {grades.map((grade) => (
                  <label
                    key={grade.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-primary/5"
                  >
                    <Checkbox
                      checked={draft.gradeIds.includes(grade.id)}
                      onCheckedChange={() => toggleGrade(grade.id)}
                    />
                    {grade.name}
                  </label>
                ))}
              </div>
            </details>
            <p className="mt-1 text-xs text-muted-foreground">
              不选择时默认全部年级可兑换。
            </p>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <RequirementEditor draft={draft} setDraft={setDraft} />
          </div>
        </div>
        <DialogFooter className="mt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (
                !draft.name.trim() ||
                Number(draft.initialStock) < 0 ||
                Number(draft.pointsCost) <= 0
              )
                return;
              onSubmit(draft);
              onOpenChange(false);
            }}
          >
            <Check className="size-4" />
            {initialProduct ? "保存商品" : "发布商品"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MallManagement({ embedded = false }: { embedded?: boolean }) {
  const { role } = usePermission();
  const {
    mallProducts,
    mallConfig,
    mallRedemptions,
    students,
    classes,
    grades,
    addMallProduct,
    updateMallProduct,
    removeMallProduct,
    updateMallConfig,
    updateMallOfflineRedeemed,
  } = useEvaluation();
  const [tab, setTab] = useState<ManagerTab>("products");
  const [productCategory, setProductCategory] = useState("全部");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MallProduct | null>(
    null,
  );
  const [deleteProduct, setDeleteProduct] = useState<MallProduct | null>(null);
  const [restockProduct, setRestockProduct] = useState<MallProduct | null>(
    null,
  );
  const [restockAmount, setRestockAmount] = useState("10");
  const [keyword, setKeyword] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [redemptionStatusFilter, setRedemptionStatusFilter] =
    useState<RedemptionStatusFilter>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exportHint, setExportHint] = useState("");
  const [configDraft, setConfigDraft] = useState(() => ({
    startAt: dateTimeLocal(mallConfig.startAt),
    endAt: dateTimeLocal(mallConfig.endAt),
    exchangeLocation: mallConfig.exchangeLocation,
    notice: mallConfig.notice,
  }));
  const listedProducts = mallProducts.filter(
    (product) => product.status === "listed",
  );
  const lowStockProducts = mallProducts.filter(
    (product) => product.status === "listed" && product.stock <= 5,
  );
  const productCategories = useMemo(
    () => [
      "全部",
      ...Array.from(
        new Set(
          mallProducts.map((product) => product.category).filter(Boolean),
        ),
      ),
    ],
    [mallProducts],
  );
  const visibleProducts = useMemo(
    () =>
      productCategory === "全部"
        ? mallProducts
        : mallProducts.filter(
            (product) => product.category === productCategory,
          ),
    [mallProducts, productCategory],
  );
  const records = useMemo(
    () =>
      mallRedemptions.filter((record) => {
        const student = students.find((item) => item.id === record.studentId);
        const matchesStatus =
          redemptionStatusFilter === "all" ||
          (redemptionStatusFilter === "redeemed"
            ? record.offlineRedeemed
            : !record.offlineRedeemed);
        return (
          matchesStatus &&
          (gradeFilter === "all" || record.gradeId === gradeFilter) &&
          (classFilter === "all" || record.classId === classFilter) &&
          (!keyword.trim() ||
            [record.studentName, student?.studentNo ?? ""].some((item) =>
              item.toLowerCase().includes(keyword.trim().toLowerCase()),
            ))
        );
      }),
    [
      classFilter,
      gradeFilter,
      keyword,
      mallRedemptions,
      redemptionStatusFilter,
      students,
    ],
  );
  const studentById = new Map(students.map((student) => [student.id, student]));
  const classOptions = classes.filter(
    (item) => gradeFilter === "all" || item.gradeId === gradeFilter,
  );

  useEffect(() => {
    const visibleIdSet = new Set(records.map((record) => record.id));
    setSelectedIds((current) => current.filter((id) => visibleIdSet.has(id)));
  }, [records]);

  if (role !== "director")
    return (
      <StandalonePageShell
        embedded={embedded}
        mainId="mall-management-main"
        activeLabel="商城管理"
        activeIcon="shopping"
      >
        <main
          id="mall-management-main"
          className="rounded-2xl border border-border bg-white p-8 text-center shadow-sm"
        >
          <ShoppingBag className="mx-auto size-10 text-primary" />
          <h1 className="mt-3 text-xl font-bold">商城管理仅向管理员开放</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            请切换至管理员身份后配置商品与兑换记录。
          </p>
        </main>
      </StandalonePageShell>
    );

  const submitProduct = (draft: ProductDraft) => {
    const data = {
      name: draft.name.trim(),
      category: draft.category.trim() || "成长用品",
      description: draft.description.trim() || "校园成长兑换商品",
      image: draft.image,
      stock: Math.max(0, Number(draft.initialStock)),
      initialStock: Math.max(0, Number(draft.initialStock)),
      pointsCost: Math.max(1, Number(draft.pointsCost)),
      gradeIds: draft.gradeIds,
      requirementsEnabled: draft.requirementsEnabled,
      requirementMode: draft.requirementMode,
      requirements: draft.requirements.filter(
        (item) => item.level1 && item.minimumPoints >= 0,
      ),
    };
    if (editingProduct) updateMallProduct(editingProduct.id, data);
    else addMallProduct({ ...data, status: "listed" });
  };
  const setOffline = (ids: string[], value: boolean) => {
    if (ids.length) {
      updateMallOfflineRedeemed(ids, value);
      setSelectedIds([]);
    }
  };
  const toggleSelected = (id: string) =>
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  const selectAll = () =>
    setSelectedIds(
      selectedIds.length === records.length
        ? []
        : records.map((record) => record.id),
    );
  const exportRecords = () => {
    if (records.length === 0) {
      setExportHint("当前筛选条件下暂无可导出的订单数据");
      return;
    }
    const escapeCell = (value: string | number) => {
      const text = String(value);
      const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${safeText.replaceAll('"', '""')}"`;
    };
    const headers = [
      "订单号",
      "学生姓名",
      "学号",
      "年级",
      "班级",
      "兑换商品",
      "数量",
      "消耗积分",
      "兑换时间",
      "线下兑换状态",
      "线下兑换时间",
    ];
    const rows = records.map((record) => {
      const student = studentById.get(record.studentId);
      const grade = grades.find((item) => item.id === record.gradeId);
      const schoolClass = classes.find((item) => item.id === record.classId);
      return [
        record.orderNo,
        record.studentName,
        student?.studentNo ?? "",
        grade?.name ?? "",
        schoolClass?.name ?? "",
        record.productName,
        record.quantity,
        record.totalPoints,
        formatDate(record.redeemedAt),
        record.offlineRedeemed ? "已兑换" : "未兑换",
        record.offlineRedeemedAt ? formatDate(record.offlineRedeemedAt) : "",
      ];
    });
    const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n")}`;
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `兑换订单_${redemptionStatusFilter === "all" ? "全部" : redemptionStatusFilter === "redeemed" ? "已兑换" : "未兑换"}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setExportHint(`已导出 ${records.length} 条筛选后的订单数据`);
  };

  return (
    <StandalonePageShell
      embedded={embedded}
      mainId="mall-management-main"
      activeLabel="商城管理"
      activeIcon="shopping"
    >
      <main id="mall-management-main" className="space-y-4">
        <section className="overflow-hidden rounded-2xl border border-primary/15 bg-[linear-gradient(120deg,#edf3ff_0%,#fff_62%,#effaf8_100%)] p-4 shadow-[0_12px_32px_rgba(54,91,168,0.08)] sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                <ShoppingBag className="size-3.5" />
                成长积分商城
              </p>
              <h1 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                让每一份成长，兑换成看得见的奖励
              </h1>
            </div>
            <div className="grid min-w-[244px] grid-cols-3 divide-x divide-primary/10 rounded-xl border border-primary/10 bg-white/85 px-1.5 py-2.5 text-center">
              <div>
                <p className="text-lg font-bold text-primary">
                  {listedProducts.length}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  在架商品
                </p>
              </div>
              <div>
                <p className="text-lg font-bold text-amber-600">
                  {lowStockProducts.length}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  库存预警
                </p>
              </div>
              <div>
                <p className="text-lg font-bold text-teal-600">
                  {
                    mallRedemptions.filter((item) => !item.offlineRedeemed)
                      .length
                  }
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  待线下领取
                </p>
              </div>
            </div>
          </div>
        </section>
        <nav
          className="grid w-full grid-cols-3 rounded-xl border border-primary/10 bg-[#edf3ff]/75 p-1 shadow-[0_10px_24px_-24px_rgba(54,91,168,.55)]"
          aria-label="商城管理模块"
        >
          {(
            [
              { value: "products", label: "商品管理", icon: Package },
              { value: "records", label: "兑换记录", icon: ClipboardList },
              { value: "config", label: "开放配置", icon: Settings2 },
            ] as const
          ).map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setTab(item.value)}
              className={cn(
                "relative flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                tab === item.value
                  ? "bg-white text-primary shadow-[0_8px_16px_-12px_rgba(54,91,168,.55)]"
                  : "text-muted-foreground hover:bg-white/60 hover:text-primary",
              )}
            >
              <item.icon className="size-4" aria-hidden="true" />
              {item.label}
              {tab === item.value && (
                <span className="absolute inset-x-8 bottom-1 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </nav>
        {tab === "products" && (
          <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
            <SectionHeading
              icon={Package}
              title="商品中心"
              description="查看实时库存，维护上下架状态，发布新的成长奖励。"
              action={
                <Button
                  onClick={() => {
                    setEditingProduct(null);
                    setEditorOpen(true);
                  }}
                >
                  <CirclePlus className="size-4" />
                  发布新商品
                </Button>
              }
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dfe7f5] bg-[#f8faff] p-1.5">
              <div
                role="tablist"
                aria-label="商品分类筛选"
                className="flex max-w-full gap-1 overflow-x-auto"
              >
                <span className="shrink-0 px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  商品分类
                </span>
                {productCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    role="tab"
                    aria-selected={productCategory === category}
                    onClick={() => setProductCategory(category)}
                    className={cn(
                      "shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                      productCategory === category
                        ? "bg-primary text-primary-foreground shadow-[0_5px_12px_-8px_rgba(54,91,168,.65)]"
                        : "text-muted-foreground hover:bg-white hover:text-primary",
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <p
                aria-live="polite"
                className="shrink-0 px-2 text-xs font-medium text-muted-foreground"
              >
                共{" "}
                <span className="font-bold text-primary">
                  {visibleProducts.length}
                </span>{" "}
                件商品
              </p>
            </div>
            {visibleProducts.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-primary/20 bg-primary/[0.025] px-4 py-12 text-center">
                <Package
                  className="mx-auto size-7 text-primary/55"
                  aria-hidden="true"
                />
                <p className="mt-3 text-sm font-semibold text-foreground">
                  该分类暂未添加商品
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  可切换其他分类，或发布一件新商品。
                </p>
              </div>
            ) : (
              <div className="data-card-grid mt-5 gap-3">
                {visibleProducts.map((product) => (
                  <article
                    key={product.id}
                    className="group overflow-hidden rounded-xl border border-[#dfe7f5] bg-white shadow-[0_10px_22px_-22px_rgba(54,91,168,.58)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_16px_28px_-22px_rgba(54,91,168,.65)] motion-reduce:transform-none"
                  >
                    <div className="relative aspect-[3/2] overflow-hidden bg-primary/[0.04]">
                      <img
                        src={product.image}
                        alt=""
                        width={480}
                        height={270}
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.035] motion-reduce:transform-none"
                      />
                      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2">
                        <span className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-foreground shadow-sm backdrop-blur">
                          {product.category}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-bold shadow-sm",
                            product.status === "listed"
                              ? "bg-teal-50/95 text-teal-700"
                              : "bg-slate-100/95 text-slate-600",
                          )}
                        >
                          {product.status === "listed" ? "已上架" : "已下架"}
                        </span>
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-bold text-foreground">
                            {product.name}
                          </h3>
                          <p className="mt-1 line-clamp-1 text-xs leading-4 text-muted-foreground">
                            {product.description}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-lg bg-amber-50 px-2 py-1 text-xs font-bold text-amber-600">
                          <Coins className="mr-0.5 inline size-3" />
                          {product.pointsCost}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-[#f7f9ff] p-2">
                        <div>
                          <p className="text-[10px] text-muted-foreground">
                            实时库存
                          </p>
                          <p
                            className={cn(
                              "mt-0.5 text-base font-bold tabular-nums",
                              product.stock <= 5
                                ? "text-amber-600"
                                : "text-foreground",
                            )}
                          >
                            {product.stock}
                            <span className="ml-0.5 text-[10px] font-medium text-muted-foreground">
                              件
                            </span>
                          </p>
                        </div>
                        <div className="border-l border-[#dfe7f5] pl-2">
                          <p className="text-[10px] text-muted-foreground">
                            适用年级
                          </p>
                          <p className="mt-1 truncate text-[11px] font-semibold text-foreground">
                            {product.gradeIds.length === 0
                              ? "全部年级"
                              : `${product.gradeIds.length} 个年级`}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 border-t border-[#e4eaf5] bg-[#fbfcff]">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProduct(product);
                          setEditorOpen(true);
                        }}
                        className="flex min-h-10 items-center justify-center gap-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                      >
                        <Pencil className="size-3" aria-hidden="true" />
                        编辑
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRestockProduct(product);
                          setRestockAmount("10");
                        }}
                        className="flex min-h-10 items-center justify-center gap-1 border-l border-[#e4eaf5] text-[11px] font-semibold text-amber-600 transition-colors hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500"
                      >
                        <Boxes className="size-3" aria-hidden="true" />
                        补货
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateMallProduct(product.id, {
                            status:
                              product.status === "listed"
                                ? "unlisted"
                                : "listed",
                          })
                        }
                        className={cn(
                          "flex min-h-10 items-center justify-center gap-1 border-l border-[#e4eaf5] text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset",
                          product.status === "listed"
                            ? "text-slate-500 hover:bg-slate-100 focus-visible:ring-slate-400"
                            : "text-teal-600 hover:bg-teal-50 focus-visible:ring-teal-500",
                        )}
                      >
                        {product.status === "listed" ? "下架" : "上架"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteProduct(product)}
                        className="flex min-h-10 items-center justify-center gap-1 border-l border-[#e4eaf5] text-[11px] font-semibold text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500"
                      >
                        <Trash2 className="size-3" aria-hidden="true" />
                        删除
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
        {tab === "config" && (
          <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
            <SectionHeading
              icon={CalendarClock}
              title="商城开放配置"
              description="设置家长端可兑换时间与线下兑换提示。"
            />
            <div className="mt-6 grid max-w-3xl gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium">
                开放开始时间
                <Input
                  type="datetime-local"
                  value={configDraft.startAt}
                  onChange={(event) =>
                    setConfigDraft((current) => ({
                      ...current,
                      startAt: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                开放结束时间
                <Input
                  type="datetime-local"
                  value={configDraft.endAt}
                  onChange={(event) =>
                    setConfigDraft((current) => ({
                      ...current,
                      endAt: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
                线下兑换地点
                <Input
                  value={configDraft.exchangeLocation}
                  placeholder="例如：一楼成长中心"
                  onChange={(event) =>
                    setConfigDraft((current) => ({
                      ...current,
                      exchangeLocation: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
                兑换说明
                <textarea
                  value={configDraft.notice}
                  rows={4}
                  onChange={(event) =>
                    setConfigDraft((current) => ({
                      ...current,
                      notice: event.target.value,
                    }))
                  }
                  className="w-full resize-none rounded-lg border border-input bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </label>
            </div>
            <Button
              className="mt-5"
              onClick={() =>
                updateMallConfig({
                  ...configDraft,
                  startAt: new Date(configDraft.startAt).toISOString(),
                  endAt: new Date(configDraft.endAt).toISOString(),
                })
              }
            >
              <Check className="size-4" />
              保存开放配置
            </Button>
          </section>
        )}
        {tab === "records" && (
          <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
            <SectionHeading
              icon={ClipboardList}
              title="本学期学生兑换记录"
              description="可按年级、班级、兑换状态及学生姓名/学号筛选，支持导出当前筛选后的订单数据和批量更新线下领取状态。"
            />
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <select
                aria-label="筛选年级"
                value={gradeFilter}
                onChange={(event) => {
                  setGradeFilter(event.target.value);
                  setClassFilter("all");
                }}
                className="h-10 rounded-lg border border-input bg-white px-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15"
              >
                <option value="all">全部年级</option>
                {grades.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="筛选班级"
                value={classFilter}
                onChange={(event) => setClassFilter(event.target.value)}
                className="h-10 rounded-lg border border-input bg-white px-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15"
              >
                <option value="all">全部班级</option>
                {classOptions.map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.id}>
                    {schoolClass.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="筛选兑换状态"
                value={redemptionStatusFilter}
                onChange={(event) =>
                  setRedemptionStatusFilter(
                    event.target.value as RedemptionStatusFilter,
                  )
                }
                className="h-10 rounded-lg border border-input bg-white px-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15"
              >
                <option value="all">全部兑换状态</option>
                <option value="redeemed">已兑换</option>
                <option value="unredeemed">未兑换</option>
              </select>
              <label className="relative min-w-[220px] flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  aria-label="搜索学生姓名或学号"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="搜索学生姓名 / 学号"
                  className="pl-9"
                />
              </label>
              <Button
                type="button"
                variant="outline"
                className="border-primary/25 bg-white"
                onClick={exportRecords}
              >
                <Download className="size-4" aria-hidden="true" />
                导出订单
              </Button>
            </div>
            {exportHint && (
              <p
                role="status"
                aria-live="polite"
                className="mt-2 text-xs font-medium text-brand-green"
              >
                {exportHint}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary/[0.045] px-3 py-2.5">
              <span className="text-sm text-muted-foreground">
                已选择 <b className="text-primary">{selectedIds.length}</b>{" "}
                条记录
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={selectedIds.length === 0}
                  onClick={() => setOffline(selectedIds, false)}
                >
                  标为未兑换
                </Button>
                <Button
                  size="sm"
                  disabled={selectedIds.length === 0}
                  onClick={() => setOffline(selectedIds, true)}
                >
                  批量标为已兑换
                </Button>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[940px] text-left text-sm">
                <caption className="sr-only">
                  当前筛选条件下的学生兑换订单记录
                </caption>
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="w-11 px-3 py-3">
                      <Checkbox
                        aria-label="选择全部兑换记录"
                        checked={
                          records.length > 0 &&
                          selectedIds.length === records.length
                        }
                        onCheckedChange={selectAll}
                      />
                    </th>
                    <th className="px-3 py-3 font-medium">学生信息</th>
                    <th className="px-3 py-3 font-medium">年级班级</th>
                    <th className="px-3 py-3 font-medium">兑换商品</th>
                    <th className="px-3 py-3 font-medium">兑换时间</th>
                    <th className="px-3 py-3 font-medium">消耗积分</th>
                    <th className="px-3 py-3 font-medium">线下兑换</th>
                    <th className="px-3 py-3 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-3 py-12 text-center text-sm text-muted-foreground"
                      >
                        当前筛选条件下暂无兑换记录
                      </td>
                    </tr>
                  ) : (
                    records.map((record) => {
                      const student = studentById.get(record.studentId);
                      const schoolClass = classes.find(
                        (item) => item.id === record.classId,
                      );
                      const grade = grades.find(
                        (item) => item.id === record.gradeId,
                      );
                      return (
                        <tr
                          key={record.id}
                          className="border-t border-border hover:bg-primary/[0.025]"
                        >
                          <td className="px-3 py-3">
                            <Checkbox
                              aria-label={`选择${record.studentName}的记录`}
                              checked={selectedIds.includes(record.id)}
                              onCheckedChange={() => toggleSelected(record.id)}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <p className="font-semibold text-foreground">
                              {record.studentName}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {student?.studentNo ?? "—"}
                            </p>
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">
                            {grade?.name ?? "—"}
                            <br />
                            {schoolClass?.name ?? "—"}
                          </td>
                          <td className="px-3 py-3">
                            <p className="font-medium text-foreground">
                              {record.productName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {record.quantity} 件 · {record.orderNo}
                            </p>
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">
                            {formatDate(record.redeemedAt)}
                          </td>
                          <td className="px-3 py-3 font-semibold text-amber-600">
                            <Coins className="mr-1 inline size-3.5" />
                            {record.totalPoints}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={cn(
                                "rounded-full px-2 py-1 text-xs font-semibold",
                                record.offlineRedeemed
                                  ? "bg-teal-50 text-teal-700"
                                  : "bg-amber-50 text-amber-700",
                              )}
                            >
                              {record.offlineRedeemed ? "已兑换" : "未兑换"}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <Button
                              size="sm"
                              variant={
                                record.offlineRedeemed ? "outline" : "default"
                              }
                              onClick={() =>
                                setOffline([record.id], !record.offlineRedeemed)
                              }
                            >
                              {record.offlineRedeemed
                                ? "标为未兑换"
                                : "标为已兑换"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              当前筛选结果共 {records.length}{" "}
              条记录，状态变更会记录实际操作时间。
            </p>
          </section>
        )}
      </main>
      <ProductEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initialProduct={editingProduct}
        onSubmit={submitProduct}
      />
      <Dialog
        open={Boolean(restockProduct)}
        onOpenChange={(open) => !open && setRestockProduct(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>库存录入</DialogTitle>
            <DialogDescription>
              {restockProduct?.name} 当前库存 {restockProduct?.stock ?? 0} 件
            </DialogDescription>
          </DialogHeader>
          <label className="grid gap-1.5 text-sm font-medium">
            补录数量
            <Input
              type="number"
              min="1"
              value={restockAmount}
              onChange={(event) => setRestockAmount(event.target.value)}
            />
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestockProduct(null)}>
              取消
            </Button>
            <Button
              onClick={() => {
                if (restockProduct && Number(restockAmount) > 0) {
                  updateMallProduct(restockProduct.id, {
                    stock: restockProduct.stock + Number(restockAmount),
                  });
                  setRestockProduct(null);
                }
              }}
            >
              确认录入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(deleteProduct)}
        onOpenChange={(open) => !open && setDeleteProduct(null)}
      >
        <DialogContent className="max-w-sm border-red-100 p-5">
          <DialogHeader>
            <DialogTitle>确认删除商品？</DialogTitle>
            <DialogDescription>
              “{deleteProduct?.name}”将从商城和购物车中移除，此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-red-100 bg-red-50/70 p-3 text-sm text-red-700">
            删除后，家长端将不再展示该商品。
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteProduct(null)}>
              取消
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                if (deleteProduct) {
                  removeMallProduct(deleteProduct.id);
                  setDeleteProduct(null);
                }
              }}
            >
              <Trash2 className="size-4" />
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StandalonePageShell>
  );
}
