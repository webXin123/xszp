"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  LayoutGrid,
  ListChecks,
  Medal,
  MinusCircle,
  PlusCircle,
  RefreshCw,
  Search,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEvaluation } from "@/lib/evaluation-context";
import { usePermission } from "@/lib/use-permission";
import {
  getISOWeekKey,
  getRecordsForWeek,
  getWeekRange,
} from "@/lib/scoring-utils";
import { TIME_RANGE_LABEL, type TimeRange } from "@/lib/points-utils";
import { PointsRankingTab } from "./points-ranking-tab";
import { HonorUploadTab } from "../evaluation/honor-upload-tab";
import { ParentHonorReview } from "./parent-honor-review";
import { useDraggableFab } from "../ui/use-draggable-fab";
import type { MainTab } from "../evaluation/evaluation-dashboard";
import styles from "../role-home.module.css";

interface HomeroomDashboardProps {
  onNavigate: (tab: MainTab) => void;
}

interface DashboardTodo {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  onClick?: () => void;
}

const RANGES: TimeRange[] = ["week", "month", "semester"];
const DASHBOARD_TODO_PAGE_SIZE = 5;
const WEEK_EVALUATION_PAGE_SIZE = 5;

const HOMEROOM_REFERENCE_DATE = new Date("2026-09-21T04:00:00.000Z");
const EVALUATION_DATE_FORMATTER = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function formatEvaluationDate(value: string) {
  const date = new Date(value + "T00:00:00");
  return Number.isNaN(date.getTime()) ? value : EVALUATION_DATE_FORMATTER.format(date);
}

export function HomeroomDashboard({ onNavigate }: HomeroomDashboardProps) {
  const {
    records,
    classes,
    students,
    flags,
    flagConfigs,
  } = useEvaluation();
  const { scoringClasses } = usePermission();
  const [classId, setClassId] = useState(scoringClasses[0]?.id ?? "");
  const [range, setRange] = useState<TimeRange>("semester");
  const [studentSearch, setStudentSearch] = useState("");
  const [classSwitchOpen, setClassSwitchOpen] = useState(false);
  const [todoPage, setTodoPage] = useState(1);
  const [evaluationPage, setEvaluationPage] = useState(1);
  const [honorDrawerOpen, setHonorDrawerOpen] = useState(false);
  const {
    offset: honorFabOffset,
    dragging: isHonorFabDragging,
    consumeClick: consumeHonorFabClick,
    onPointerDown: startHonorFabDrag,
    onPointerMove: moveHonorFab,
    onPointerUp: endHonorFabDrag,
  } = useDraggableFab({ size: 52, mobileBottom: 88 });
  const handleHonorFabClick = () => {
    if (consumeHonorFabClick()) return;
    setHonorDrawerOpen(true);
  };

  const currentClass =
    classes.find((item) => item.id === classId) ?? scoringClasses[0];
  const currentClassStudents = useMemo(
    () => students.filter((student) => student.classId === currentClass?.id),
    [currentClass?.id, students],
  );
  const now = HOMEROOM_REFERENCE_DATE;
  const weekKey = getISOWeekKey(now);
  const currentWeek = getWeekRange(now);
  const previousWeekDate = new Date(currentWeek.start);
  previousWeekDate.setDate(previousWeekDate.getDate() - 7);
  const previousWeekKey = getISOWeekKey(previousWeekDate);

  const classFlagConfigs = useMemo(
    () => new Map(flagConfigs.map((item) => [item.id, item])),
    [flagConfigs],
  );
  const flagConfigOrder = useMemo(
    () => new Map(flagConfigs.map((item, index) => [item.id, index] as const)),
    [flagConfigs],
  );

  const weekEvaluations = useMemo(() => {
    if (!currentClass) return [];
    return getRecordsForWeek(records, currentClass.id, weekKey)
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
      );
  }, [currentClass, records, weekKey]);
  const weeklyEvaluationStats = useMemo(() => {
    const additionRecords = weekEvaluations.filter(
      (record) => record.totalDeduction > 0,
    );
    const deductionRecords = weekEvaluations.filter(
      (record) => record.totalDeduction < 0,
    );
    const countAffectedStudents = (evaluationRecords: typeof weekEvaluations) => {
      const affected = new Set<string>();
      const studentIdByName = new Map(
        currentClassStudents.map((student) => [student.name, student.id]),
      );

      evaluationRecords.forEach((record) => {
        if (record.studentIds?.length) {
          record.studentIds.forEach((studentId) => affected.add(studentId));
          return;
        }
        if (record.studentNames.length) {
          record.studentNames.forEach((name) =>
            affected.add(studentIdByName.get(name) ?? `name:${name}`),
          );
          return;
        }
        currentClassStudents.forEach((student) => affected.add(student.id));
      });

      return affected.size;
    };

    return {
      additionStudentCount: countAffectedStudents(additionRecords),
      deductionStudentCount: countAffectedStudents(deductionRecords),
      additionTotal: additionRecords.reduce(
        (total, record) => total + record.totalDeduction,
        0,
      ),
      deductionTotal: Math.abs(
        deductionRecords.reduce(
          (total, record) => total + record.totalDeduction,
          0,
        ),
      ),
    };
  }, [currentClassStudents, weekEvaluations]);
  const evaluationPageCount = Math.max(
    1,
    Math.ceil(weekEvaluations.length / WEEK_EVALUATION_PAGE_SIZE),
  );
  const currentEvaluationPage = Math.min(evaluationPage, evaluationPageCount);
  const visibleWeekEvaluations = weekEvaluations.slice(
    (currentEvaluationPage - 1) * WEEK_EVALUATION_PAGE_SIZE,
    currentEvaluationPage * WEEK_EVALUATION_PAGE_SIZE,
  );

  useEffect(() => {
    if (evaluationPage > evaluationPageCount) setEvaluationPage(evaluationPageCount);
  }, [evaluationPage, evaluationPageCount]);

  useEffect(() => {
    setEvaluationPage(1);
  }, [currentClass?.id]);

  const lastWeekFlags = useMemo(
    () =>
      flags
        .filter(
          (flag) =>
            flag.classId === currentClass?.id &&
            flag.awarded &&
            flag.weekKey === previousWeekKey &&
            (flag.period ?? "week") === "week",
        )
        .map((flag) => ({
          ...flag,
          config: classFlagConfigs.get(flag.configId ?? ""),
        }))
        .sort(
          (a, b) =>
            (flagConfigOrder.get(a.configId ?? "") ?? Number.MAX_SAFE_INTEGER) -
            (flagConfigOrder.get(b.configId ?? "") ?? Number.MAX_SAFE_INTEGER),
        ),
    [classFlagConfigs, currentClass, flagConfigOrder, flags, previousWeekKey],
  );

  const dashboardTodos = useMemo<DashboardTodo[]>(
    () => [
      {
        id: "score-review",
        title: "班级评价待审核",
        description: "检查并确认本班评价记录",
        actionLabel: "去审核",
        onClick: () => onNavigate("score"),
      },
      {
        id: "comment-review",
        title: "学期评语待完成",
        description: "完成本学期教师评语",
        actionLabel: "去完成",
        onClick: () => onNavigate("comment_entry"),
      },
      {
        id: "semester-evaluation",
        title: "学期评价待完成",
        description: "更新本学期学生综合评价",
        actionLabel: "去评价",
        onClick: () => onNavigate("semester_evaluation"),
      },
      {
        id: "honor-entry",
        title: "班级荣誉记录",
        description: "补录获奖学生荣誉信息",
        actionLabel: "去录入",
        onClick: () => setHonorDrawerOpen(true),
      },
      {
        id: "activity-follow-up",
        title: "本周活动待跟进",
        description: "跟进本周班级活动进度",
        actionLabel: "去查看",
        onClick: () => onNavigate("activity"),
      },
    ],
    [onNavigate],
  );
  const todoPageCount = Math.max(
    1,
    Math.ceil(dashboardTodos.length / DASHBOARD_TODO_PAGE_SIZE),
  );
  const currentTodoPage = Math.min(todoPage, todoPageCount);
  const visibleDashboardTodos = dashboardTodos.slice(
    (currentTodoPage - 1) * DASHBOARD_TODO_PAGE_SIZE,
    currentTodoPage * DASHBOARD_TODO_PAGE_SIZE,
  );

  useEffect(() => {
    if (todoPage > todoPageCount) setTodoPage(todoPageCount);
  }, [todoPage, todoPageCount]);

  if (!currentClass) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-[#cfd7f6] bg-white p-12 text-center">
        <LayoutGrid
          className="size-10 text-muted-foreground/40"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground">
          当前班主任未关联班级，暂无首页数据。
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative -m-4 flex w-full max-w-none min-w-0 flex-col gap-5 p-4 sm:-m-6 sm:gap-6 sm:p-6",
        styles.workspaceHome,
        styles.homeroomHome,
      )}
      style={{ padding: "0px", margin: "0 auto" }}
    >
      <section
        className="w-full min-w-0 overflow-hidden rounded-2xl border border-[#cbd6f7] border-t-[3px] border-t-primary bg-white shadow-[0_18px_38px_-30px_rgba(48,62,139,0.72)]"
        aria-label="班主任首页班级信息与班级荣誉"
      >
        <div className="bg-[linear-gradient(135deg,#f5f7ff_0%,#ffffff_72%)] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2">
              <div className="shrink-0">
                <p className="text-xs font-semibold tracking-[0.16em] text-primary">
                  班级工作台
                </p>
                <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground">
                  班主任首页
                </h1>
              </div>
              <div className="min-w-0 border-l border-[#dfe6f7] pl-4">
                <p className="text-sm font-bold text-foreground">
                  {currentClass.homeroomTeacher}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {currentClass.name} 班主任
                </p>
              </div>
              <div
                className="flex basis-full min-w-0 flex-wrap items-center gap-2.5 lg:basis-auto"
                role="group"
                aria-label="班级荣誉与上周流动红旗"
              >
                {lastWeekFlags.length > 0 ? (
                  lastWeekFlags.map((flag, index) => {
                    const flagName = flag.config?.name ?? "流动红旗";
                    return (
                      <div
                        key={flag.configId ?? index}
                        className="flex h-[68px] w-56 shrink-0 items-center gap-2.5 rounded-2xl border border-[#f1dfb7] bg-[#fffaf0] px-3 py-2"
                      >
                        <img
                          src={flag.config?.image ?? "/xszp/images/flag-issued.svg"}
                          alt=""
                          width="38"
                          height="38"
                          className="size-9 shrink-0 object-contain"
                        />
                        <span className="min-w-0">
                          <span className="block text-[11px] font-semibold text-[#a77821]">
                            上周流动红旗
                          </span>
                          <span
                            title={flagName}
                            className="block truncate text-sm font-bold text-foreground"
                          >
                            {flagName}
                          </span>
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex h-[68px] w-56 shrink-0 items-center gap-2.5 rounded-2xl border border-[#f1dfb7] bg-[#fffaf0] px-3 py-2">
                    <img
                      src="/xszp/images/flag-issued.svg"
                      alt=""
                      width="38"
                      height="38"
                      className="size-9 shrink-0 object-contain opacity-70"
                    />
                    <span className="min-w-0">
                      <span className="block text-[11px] font-semibold text-[#a77821]">
                        上周流动红旗
                      </span>
                      <span className="block truncate text-sm font-semibold text-muted-foreground">
                        暂无荣誉
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setClassSwitchOpen(true)}
              aria-haspopup="dialog"
              className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-[#dbe3fa] bg-white px-3 text-left transition-colors hover:border-primary/45 hover:bg-primary/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
            >
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                {currentClass.name.slice(0, 1)}
              </span>
              <span className="text-sm font-bold text-foreground">
                {currentClass.name}
              </span>
              <span className="ml-1 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                切换班级
                <ChevronDown className="size-3.5" aria-hidden="true" />
              </span>
            </button>
          </div>
        </div>
      </section>

      <div className={cn(styles.homeroomOverviewGrid, "gap-4")}>
            <section
              className="flex min-h-[360px] min-w-0 flex-col rounded-2xl border border-[#cbd6f7] bg-white p-4 shadow-[0_16px_32px_-26px_rgba(48,62,139,0.62)] sm:p-5"
              aria-labelledby="week-evaluations-title"
            >
              <SectionHeading
                id="week-evaluations-title"
                icon={ListChecks}
                tone="orange"
                title="本班本周评价明细"
                description={"共 " + weekEvaluations.length + " 条评价记录"}
                descriptionClassName="text-[#111827]"
                action={
                  <div
                    role="group"
                    aria-label="本周班级评价统计"
                    className="flex w-full flex-wrap justify-start gap-x-3 gap-y-1 text-[13px] font-medium leading-5 text-[#111827] sm:w-auto sm:max-w-[62%] sm:justify-end sm:text-sm"
                  >
                    <span className="whitespace-nowrap">
                      本周加分 <strong className="font-bold text-[#111827]">{weeklyEvaluationStats.additionStudentCount}</strong> 人，
                    </span>
                    <span className="whitespace-nowrap">
                      本周扣分 <strong className="font-bold text-[#111827]">{weeklyEvaluationStats.deductionStudentCount}</strong> 人，
                    </span>
                    <span className="whitespace-nowrap">
                      本周总加分 <strong className="font-bold text-[#111827]">{weeklyEvaluationStats.additionTotal}</strong> 分，
                    </span>
                    <span className="whitespace-nowrap">
                      本周总扣分 <strong className="font-bold text-[#111827]">{weeklyEvaluationStats.deductionTotal}</strong> 分
                    </span>
                  </div>
                }
              />
              <div className="mt-3 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#e3e8f5] bg-white">
                <div className="min-h-0 flex-1 overflow-x-auto">
                  <table className="h-full w-full min-w-[520px] table-fixed border-separate border-spacing-0 text-xs">
                    <caption className="sr-only">
                      本班本周评价明细，按评价时间倒序排列
                    </caption>
                    <thead>
                      <tr className="border-b border-[#e3e8f5] bg-[#f7f9ff] text-muted-foreground">
                        <th scope="col" className="sticky left-0 z-20 w-[112px] min-w-[112px] max-w-[112px] bg-[#f7f9ff] px-2 py-2.5 text-center font-semibold">
                          学生
                        </th>
                        <th scope="col" className="w-[27%] px-2 py-2.5 text-center font-semibold">
                          评价指标
                        </th>
                        <th scope="col" className="w-[18%] px-2 py-2.5 text-center font-semibold">
                          评价时间
                        </th>
                        <th scope="col" className="w-[17%] px-2 py-2.5 text-center font-semibold">
                          评价人
                        </th>
                        <th scope="col" className="w-[20%] px-2 py-2.5 text-center font-semibold">
                          加分/扣分
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleWeekEvaluations.length > 0 ? (
                        visibleWeekEvaluations.map((record) => (
                          <tr
                            key={record.id}
                            className="border-b border-[#edf0fa] last:border-0"
                          >
                            <td
                              title={
                                record.studentNames.length > 0
                                  ? record.studentNames.join("、")
                                  : "全班"
                              }
                              className="sticky left-0 z-10 w-[112px] min-w-[112px] max-w-[112px] bg-white px-2 py-2.5 text-center text-muted-foreground shadow-[1px_0_0_#edf0fa]"
                            >
                              <span className="block truncate">
                                {record.studentNames.length > 0
                                  ? record.studentNames.join("、")
                                  : "全班"}
                              </span>
                            </td>
                            <td className="max-w-0 px-2 py-2.5 text-center">
                              <span
                                title={record.level1 + " · " + record.level2}
                                className="block truncate font-semibold text-foreground"
                              >
                                {record.level1} · {record.level2}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-2 py-2.5 text-center tabular-nums text-muted-foreground">
                              {formatEvaluationDate(record.date)}
                            </td>
                            <td className="max-w-0 px-2 py-2.5 text-center text-muted-foreground">
                              <span className="block truncate" title={record.operatorName}>
                                {record.operatorName || "—"}
                              </span>
                            </td>
                            <td className="px-2 py-2.5 text-center font-bold tabular-nums">
                              <span
                                className={cn(
                                  record.totalDeduction > 0
                                    ? "text-emerald-700"
                                    : record.totalDeduction < 0
                                      ? "text-rose-700"
                                      : "text-muted-foreground",
                                )}
                              >
                                {record.totalDeduction > 0
                                  ? "+" + record.totalDeduction
                                  : record.totalDeduction}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-3 py-8 text-center text-xs text-muted-foreground"
                          >
                            本周暂无评价记录
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <nav
                  aria-label="本周评价明细分页"
                  className="flex items-center justify-between gap-2 border-t border-[#edf0fa] px-3 py-2 text-xs text-muted-foreground"
                >
                  <span aria-live="polite" className="whitespace-nowrap">
                    共 <span className="font-semibold tabular-nums text-foreground">{weekEvaluations.length}</span> 条
                  </span>
                  <div className="inline-flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      disabled={currentEvaluationPage <= 1}
                      onClick={() =>
                        setEvaluationPage((page) => Math.max(1, page - 1))
                      }
                      className="inline-flex h-8 items-center justify-center rounded-lg border border-[#dbe3fa] bg-white px-2.5 text-[11px] font-medium text-primary transition-colors hover:bg-[#f3f6ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 disabled:cursor-not-allowed disabled:text-[#aab5ce]"
                    >
                      上一页
                    </button>
                    <span
                      aria-current="page"
                      aria-label={`第 ${currentEvaluationPage} 页，共 ${evaluationPageCount} 页`}
                      className="inline-flex h-8 min-w-10 items-center justify-center rounded-lg bg-[#eef2ff] px-2 text-[11px] font-semibold tabular-nums text-primary"
                    >
                      {currentEvaluationPage} / {evaluationPageCount}
                    </span>
                    <button
                      type="button"
                      disabled={currentEvaluationPage >= evaluationPageCount}
                      onClick={() =>
                        setEvaluationPage((page) =>
                          Math.min(evaluationPageCount, page + 1),
                        )
                      }
                      className="inline-flex h-8 items-center justify-center rounded-lg border border-[#dbe3fa] bg-white px-2.5 text-[11px] font-medium text-primary transition-colors hover:bg-[#f3f6ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 disabled:cursor-not-allowed disabled:text-[#aab5ce]"
                    >
                      下一页
                    </button>
                  </div>
                </nav>
              </div>
            </section>
            <section
              className="flex h-full min-h-[360px] min-w-0 flex-col overflow-hidden rounded-2xl border border-[#e2e7f8] border-t-[3px] border-t-primary bg-[linear-gradient(180deg,#fbfcff_0%,#f5f8ff_100%)] p-4 sm:p-5"
              aria-labelledby="homeroom-todos-title"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#fff3db] text-[#a66a12]">
                    <ClipboardCheck className="size-5" aria-hidden="true" />
                  </span>
                  <h2
                    id="homeroom-todos-title"
                    className="text-[15px] font-bold tracking-tight text-foreground"
                  >
                    待办事项
                  </h2>
                </div>
                <button
                  type="button"
                  aria-label="刷新待办事项"
                  title="刷新待办事项"
                  onClick={() => setTodoPage(1)}
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
                >
                  <RefreshCw className="size-4" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-3 flex min-h-[300px] min-w-0 flex-1 flex-col overflow-hidden">
              {visibleDashboardTodos.length > 0 ? (
                <ul
                  aria-label="待办事项列表"
                  className="min-h-0 flex-1 divide-y divide-[#e7ebfa] overflow-y-auto"
                >
                  {visibleDashboardTodos.map((todo) => (
                    <li key={todo.id}>
                      <TodoItem {...todo} />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex min-h-0 flex-1 items-center justify-center border-y border-dashed border-[#d8e0f3] text-sm text-muted-foreground">
                  当前暂无待处理任务
                </div>
              )}
              {dashboardTodos.length > 0 && (
                <nav
                  aria-label="待办事项分页"
                  className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-[#e7ebfa] pt-2 text-xs text-muted-foreground"
                >
                  <p aria-live="polite" className="whitespace-nowrap">
                    共 {dashboardTodos.length} 项 · 第 {currentTodoPage} / {todoPageCount} 页
                  </p>
                  <span className="inline-flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      aria-label="上一页待办事项"
                      disabled={currentTodoPage <= 1}
                      onClick={() => setTodoPage((page) => Math.max(1, page - 1))}
                      className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#e2e7f8] bg-white px-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 disabled:cursor-not-allowed disabled:text-[#aab5ce]"
                    >
                      上一页
                    </button>
                    {Array.from(
                      { length: todoPageCount },
                      (_, index) => index + 1,
                    ).map((page) => (
                      <button
                        key={page}
                        type="button"
                        aria-label={"第 " + page + " 页"}
                        aria-current={page === currentTodoPage ? "page" : undefined}
                        onClick={() => setTodoPage(page)}
                        className={cn(
                          "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border px-3 text-xs font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45",
                          page === currentTodoPage
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-[#e2e7f8] bg-white text-primary hover:border-primary/30 hover:bg-[#f3f6ff]",
                        )}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      type="button"
                      aria-label="下一页待办事项"
                      disabled={currentTodoPage >= todoPageCount}
                      onClick={() =>
                        setTodoPage((page) => Math.min(todoPageCount, page + 1))
                      }
                      className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#e2e7f8] bg-white px-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 disabled:cursor-not-allowed disabled:text-[#aab5ce]"
                    >
                      下一页
                    </button>
                  </span>
                </nav>
              )}
              </div>
            </section>
      </div>
      <section
        className="rounded-2xl border border-[#cbd6f7] bg-white p-5 shadow-[0_16px_32px_-26px_rgba(48,62,139,0.62)] sm:p-6"
        aria-labelledby="student-ranking-title"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionHeading
            id="student-ranking-title"
            icon={Trophy}
            tone="purple"
            title="班级学生积分排名"
          />
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                name="student-ranking-search"
                autoComplete="off"
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
                placeholder="搜索姓名/学号"
                aria-label="搜索学生姓名或学号"
                className="h-10 w-44 rounded-xl border-[#d8e0f7] bg-[#f8faff] pl-8 text-sm"
              />
            </div>
            <div
              className="flex rounded-xl border border-[#d8e0f7] bg-[#f8faff] p-1"
              role="tablist"
              aria-label="积分查看范围"
            >
              {RANGES.map((item) => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={range === item}
                  onClick={() => setRange(item)}
                  className={cn(
                    "min-h-8 rounded-lg px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45",
                    range === item
                      ? "bg-white text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {TIME_RANGE_LABEL[item]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <PointsRankingTab
            classId={currentClass.id}
            range={range}
            search={studentSearch}
          />
        </div>
      </section>

      <Dialog open={classSwitchOpen} onOpenChange={setClassSwitchOpen}>
        <DialogContent className="max-w-md border border-[#dce3f7] p-0">
          <DialogHeader className="border-b border-[#e8ecf8] bg-[#f8faff] px-5 py-5 pr-12">
            <DialogTitle className="text-lg font-bold">切换班级</DialogTitle>
            <DialogDescription>
              选择后将同步刷新班级评价、奖卡和学生积分数据。
            </DialogDescription>
          </DialogHeader>
          <div className="p-4" role="listbox" aria-label="选择班级">
            <div className="grid gap-2 sm:grid-cols-2">
              {scoringClasses.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={item.id === currentClass.id}
                  onClick={() => {
                    setClassId(item.id);
                    setClassSwitchOpen(false);
                  }}
                  className={cn(
                    "flex min-h-12 items-center justify-between rounded-xl border px-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45",
                    item.id === currentClass.id
                      ? "border-primary/35 bg-primary/10 text-primary"
                      : "border-[#dbe3fa] bg-white text-foreground hover:border-primary/35 hover:bg-primary/[0.04]",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
                        item.id === currentClass.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-primary/10 text-primary",
                      )}
                    >
                      {item.name.slice(0, 1)}
                    </span>
                    <span className="truncate text-sm font-semibold">
                      {item.name}
                    </span>
                  </span>
                  {item.id === currentClass.id && (
                    <CheckCircle2
                      className="size-4 shrink-0"
                      aria-label="当前班级"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <button
        type="button"
        onClick={handleHonorFabClick}
        onPointerDown={startHonorFabDrag}
        onPointerMove={moveHonorFab}
        onPointerUp={endHonorFabDrag}
        onPointerCancel={endHonorFabDrag}
        aria-label="打开荣誉录入"
        title="荣誉录入"
        style={{ transform: `translate3d(${honorFabOffset.x}px, ${honorFabOffset.y}px, 0)` }}
        className={cn("fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-4 z-40 flex size-[52px] touch-none select-none items-center justify-center rounded-2xl border border-white/70 bg-primary text-primary-foreground shadow-[0_14px_28px_-12px_rgba(77,105,225,0.78)] transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:right-5 lg:absolute lg:bottom-auto lg:right-4 lg:top-[54%]", isHonorFabDragging ? "cursor-grabbing" : "cursor-grab")}
      >
        <Medal className="size-6" aria-hidden="true" />
      </button>

      <Dialog open={honorDrawerOpen} onOpenChange={setHonorDrawerOpen}>
        <DialogContent className="!top-0 !right-0 !left-auto !flex !h-[100dvh] !w-full !max-w-full !translate-x-0 !translate-y-0 !flex-col gap-0 overflow-hidden overscroll-contain rounded-none border-l border-[#cfd8f6] bg-[#f7f8ff] p-0 shadow-[-20px_0_56px_-28px_rgba(53,67,150,0.75)] data-open:slide-in-from-right-4 sm:!w-[70vw] sm:!max-w-[70vw]">
          <DialogHeader className="shrink-0 border-b border-[#dbe3f8] bg-gradient-to-r from-[#f1f3ff] via-white to-[#faf8ff] px-5 py-5 pr-14 sm:px-7">
            <DialogTitle className="text-xl font-bold text-foreground">
              荣誉录入
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
            <ParentHonorReview classId={currentClass.id} />
            <HonorUploadTab classId={currentClass.id} compact />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function SectionHeading({
  id,
  icon: Icon,
  tone,
  title,
  description,
  descriptionClassName,
  action,
}: {
  id?: string;
  icon: typeof LayoutGrid;
  tone: "blue" | "green" | "orange" | "purple";
  title: React.ReactNode;
  description: string;
  descriptionClassName?: string;
  action?: React.ReactNode;
}) {
  const styles = {
    blue: "bg-[#eef2ff] text-primary",
    green: "bg-[#eaf8f1] text-brand-green",
    orange: "bg-[#fff1e9] text-brand-orange",
    purple: "bg-[#f2f0ff] text-[#7166b3]",
  };
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            styles[tone],
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id={id} className="text-base font-bold text-foreground">
            {title}
          </h2>
          {description && (
            <p className={cn("mt-1 truncate text-xs text-muted-foreground", descriptionClassName)}>
              {description}
            </p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

function TodoItem({
  title,
  description,
  actionLabel,
  onClick,
}: DashboardTodo) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="group flex min-h-[64px] w-full touch-manipulation items-center gap-3 py-2.5 text-left transition-colors hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/45"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#fff3db] text-[#a66a12]">
        <ClipboardCheck className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground group-hover:text-primary">
          {title}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {description}
        </span>
      </span>
      <span className="shrink-0 text-xs font-semibold text-primary">{actionLabel}</span>
    </button>
  );
}
