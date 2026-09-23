"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import type { EChartsOption } from "echarts"
import type { LucideIcon } from "lucide-react"
import {
  ArrowLeft,
  Award,
  BookOpenCheck,
  CalendarDays,
  ChartNoAxesCombined,
  Clock3,
  HeartPulse,
  Medal,
  Sparkles,
  Trophy,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react"
import { ACADEMIC_GRADES, getAcademicGradeIndex } from "@/lib/academic-scores"
import { EChart } from "@/components/command-center/echart"
import { useEvaluation } from "@/lib/evaluation-context"
import { AWARD_LEVEL1_LIST } from "@/lib/award-utils"
import { buildPointEntries, getSemesterRange, inRange } from "@/lib/points-utils"
import {
  getHistoricalFiveEducation,
  getStudentAcademicHistory,
  getStudentFitnessHistory,
  getStudentSemesterOptions,
} from "@/lib/student-semester-history"
import styles from "./student-command-center.module.css"

const gridLine = "rgba(86, 113, 171, 0.16)"
const muted = "#73809a"
const FIVE_EDUCATION_COLORS = ["#4d8dff", "#32c79a", "#ffb542", "#f4779b", "#a875f5"]

function formatSemester(value: string) {
  return value.replace(" 学年", "").replace("第一学期", "秋").replace("第二学期", "春")
}

function useViewportScale() {
  const [state, setState] = useState({ scale: 1, scaled: false })
  useEffect(() => {
    const update = () => {
      const width = window.visualViewport?.width ?? window.innerWidth
      const height = window.visualViewport?.height ?? window.innerHeight
      const scaled = width > 0 && height > 0
      setState({ scaled, scale: scaled ? Number(Math.min(width / 1920, height / 1080).toFixed(6)) : 1 })
    }
    update()
    window.addEventListener("resize", update)
    window.visualViewport?.addEventListener("resize", update)
    return () => {
      window.removeEventListener("resize", update)
      window.visualViewport?.removeEventListener("resize", update)
    }
  }, [])
  return state
}

function DigitalClock() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  if (!now) return <span className={styles.clock} aria-live="polite"><Clock3 size={14} aria-hidden="true" /> 正在同步…</span>
  const date = new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", weekday: "short" }).format(now)
  const time = new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(now)
  return <span className={styles.clock}><Clock3 size={14} aria-hidden="true" /> {date}&nbsp;&nbsp;{time}</span>
}

function Panel({ id, title, subtitle, icon: Icon, children, action }: { id: string; title: string; subtitle?: string; icon: LucideIcon; children: ReactNode; action?: ReactNode }) {
  return <section className={styles.panel} aria-labelledby={id}>
    <div className={styles.panelHeading}>
      <span className={styles.headingIcon} aria-hidden="true"><Icon size={15} strokeWidth={2.3} /></span>
      <div><h2 id={id}>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div>
      {action ? <div className={styles.panelAction}>{action}</div> : null}
    </div>
    {children}
  </section>
}

function EmptyRecord({ text }: { text: string }) {
  return <div className={styles.emptyRecord}>{text}</div>
}

export function StudentCommandCenter() {
  const { currentUser, students, classes, grades, awardCards, honors, activities, enrollments, getStudentEarned, getStudentBalance } = useEvaluation()
  const { scale, scaled } = useViewportScale()
  const parent = currentUser.kind === "parent" ? currentUser : null
  const children = parent?.children ?? []
  const [selectedStudentId, setSelectedStudentId] = useState("")

  useEffect(() => {
    if (children.length === 0) return setSelectedStudentId("")
    if (!children.some((child) => child.studentId === selectedStudentId)) setSelectedStudentId(children[0].studentId)
  }, [children, selectedStudentId])

  const child = useMemo(() => children.find((item) => item.studentId === selectedStudentId) ?? children[0] ?? null, [children, selectedStudentId])
  const studentId = child?.studentId ?? ""
  const student = useMemo(() => students.find((item) => item.id === studentId) ?? null, [students, studentId])
  const schoolClass = useMemo(() => classes.find((item) => item.id === child?.classId) ?? null, [child, classes])
  const grade = useMemo(() => grades.find((item) => item.id === child?.gradeId) ?? null, [child, grades])
  const semester = useMemo(() => getSemesterRange(new Date()), [])
  const semesterOptions = useMemo(() => getStudentSemesterOptions(new Date()), [])
  const semesterLabel = semesterOptions[0]?.label ?? "本学期"

  const pointEntries = useMemo(() => buildPointEntries(awardCards, honors), [awardCards, honors])
  const semesterPointEntries = useMemo(() => pointEntries.filter((item) => item.studentId === studentId && inRange(item.date, semester.start, semester.end)), [pointEntries, semester, studentId])
  const fiveEducation = useMemo(() => {
    const totals = new Map(AWARD_LEVEL1_LIST.map((item) => [item, 0]))
    semesterPointEntries.forEach((item) => { const level = item.level1 as (typeof AWARD_LEVEL1_LIST)[number]; if (totals.has(level)) totals.set(level, (totals.get(level) ?? 0) + item.points) })
    return AWARD_LEVEL1_LIST.map((item) => totals.get(item) ?? 0)
  }, [semesterPointEntries])
  const totalEarned = getStudentEarned(studentId)
  const balance = getStudentBalance(studentId)
  const semesterPoints = fiveEducation.reduce((sum, item) => sum + item, 0)
  const redeemedPoints = Math.max(0, totalEarned - balance)
  const academicHistory = useMemo(() => student ? getStudentAcademicHistory(student, semesterOptions) : [], [semesterOptions, student])
  const fitnessHistory = useMemo(() => getStudentFitnessHistory(studentId, semesterOptions), [semesterOptions, studentId])
  const academicScores = academicHistory[0]?.scores ?? []
  const fitness = fitnessHistory[0]?.metrics ?? { score: 0, level: "暂无", run: "-", rope: 0, vision: "-" }
  const fiveEducationHistory = useMemo(() => semesterOptions.map((option, index) => ({ label: formatSemester(option.label), values: index === 0 ? fiveEducation : getHistoricalFiveEducation(studentId, option.key) })).reverse(), [fiveEducation, semesterOptions, studentId])
  const awards = useMemo(() => awardCards.filter((item) => item.studentId === studentId).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 2), [awardCards, studentId])
  const studentHonors = useMemo(() => honors.filter((item) => item.studentId === studentId && item.reviewStatus !== "rejected").slice().sort((a, b) => b.awardDate.localeCompare(a.awardDate)).slice(0, 2), [honors, studentId])
  const joinedActivities = useMemo(() => enrollments.filter((item) => item.studentId === studentId && item.status !== "cancelled").map((item) => ({ enrollment: item, activity: activities.find((activity) => activity.id === item.activityId) })).filter((item): item is { enrollment: typeof enrollments[number]; activity: typeof activities[number] } => !!item.activity).sort((a, b) => b.enrollment.enrolledAt.localeCompare(a.enrollment.enrolledAt)).slice(0, 2), [activities, enrollments, studentId])
  const maxFiveEducation = Math.max(20, Math.ceil(Math.max(...fiveEducation, 1) / 10) * 10)
  const radarOption = useMemo<EChartsOption>(() => ({
    radar: { center: ["50%", "57%"], radius: "67%", splitNumber: 4, indicator: AWARD_LEVEL1_LIST.map((name) => ({ name, max: maxFiveEducation })), axisName: { color: "#4b5d7d", fontSize: 12 }, axisLine: { lineStyle: { color: "rgba(92, 119, 180, .22)" } }, splitLine: { lineStyle: { color: "rgba(92, 119, 180, .17)" } }, splitArea: { areaStyle: { color: ["rgba(77, 141, 255, .025)", "rgba(52, 199, 154, .07)"] } } },
    series: [{ type: "radar", data: [{ value: fiveEducation, areaStyle: { color: "rgba(255, 181, 66, .28)" }, lineStyle: { color: "#f39b34", width: 2 }, itemStyle: { color: "#f8b84d" } }], symbol: "circle", symbolSize: 5 }],
  }), [fiveEducation, maxFiveEducation])
  const academicOption = useMemo<EChartsOption>(() => ({
    grid: { left: 26, right: 8, top: 18, bottom: 26, containLabel: true },
    xAxis: { type: "category", data: academicScores.map((item) => item.subject), axisTick: { show: false }, axisLine: { lineStyle: { color: gridLine } }, axisLabel: { color: muted, fontSize: 12, interval: 0 } },
    yAxis: { type: "category", data: ["C", "C+", "B-", "B", "B+", "A-", "A", "A+"], axisLabel: { color: muted, fontSize: 11 }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: gridLine, type: "dashed" } } },
    series: [{ type: "bar", data: academicScores.map((item, index) => ({ value: ACADEMIC_GRADES.length - getAcademicGradeIndex(item.grade), itemStyle: { color: FIVE_EDUCATION_COLORS[index % FIVE_EDUCATION_COLORS.length], borderRadius: [7, 7, 0, 0] }, label: { show: true, position: "top", formatter: item.grade, color: "#44536f", fontSize: 12 } })), barWidth: "42%" }],
  }), [academicScores])
  const growthOption = useMemo<EChartsOption>(() => ({
    grid: { left: 20, right: 12, top: 18, bottom: 24, containLabel: true },
    xAxis: { type: "category", boundaryGap: false, data: fiveEducationHistory.map((item) => item.label), axisTick: { show: false }, axisLine: { lineStyle: { color: gridLine } }, axisLabel: { color: muted, fontSize: 12 } },
    yAxis: { type: "value", minInterval: 10, axisLabel: { color: muted, fontSize: 12 }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: gridLine, type: "dashed" } } },
    series: [{ type: "line", smooth: true, data: fiveEducationHistory.map((item) => item.values.reduce((sum, value) => sum + value, 0)), symbol: "circle", symbolSize: 6, lineStyle: { color: "#4d8dff", width: 2 }, itemStyle: { color: "#fff", borderColor: "#4d8dff", borderWidth: 2 }, areaStyle: { color: "rgba(77, 141, 255, .15)" } }],
  }), [fiveEducationHistory])
  const fitnessOption = useMemo<EChartsOption>(() => ({
    grid: { left: 22, right: 8, top: 12, bottom: 23, containLabel: true },
    xAxis: { type: "category", data: fitnessHistory.slice().reverse().map((item) => formatSemester(item.label)), axisTick: { show: false }, axisLine: { lineStyle: { color: gridLine } }, axisLabel: { color: muted, fontSize: 12 } },
    yAxis: { type: "value", min: 70, max: 100, axisLabel: { color: muted, fontSize: 12 }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: gridLine, type: "dashed" } } },
    series: [{ type: "line", smooth: true, data: fitnessHistory.slice().reverse().map((item) => item.metrics.score), symbol: "circle", symbolSize: 5, lineStyle: { color: "#f4a62c", width: 2 }, itemStyle: { color: "#fff", borderColor: "#f4a62c", borderWidth: 2 }, areaStyle: { color: "rgba(255, 181, 66, .18)" } }],
  }), [fitnessHistory])

  if (!parent || !child || !student) return <main className={styles.guard}><div><UserRound size={28} aria-hidden="true" /><h1>学生成长画像仅向家长开放</h1><Link href="/">返回首页</Link></div></main>

  return <main className={`${styles.screen} ${scaled ? styles.scaledScreen : ""}`} aria-label="学生成长画像">
    <a className={styles.skipLink} href="#student-command-main">跳到主要内容</a>
    <div className={styles.aurora} aria-hidden="true" />
    <div className={styles.gridTexture} aria-hidden="true" />
    <div className={styles.signalTexture} aria-hidden="true" />
    <div className={`${styles.viewport} ${scaled ? styles.scaledViewport : ""}`} style={scaled ? { "--student-screen-scale": scale } as React.CSSProperties : undefined}>
      <div className={`${styles.dashboard} ${scaled ? styles.scaledDashboard : ""}`}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <a className={styles.backLink} href="/xszp/" aria-label="返回家长首页"><ArrowLeft size={18} aria-hidden="true" /></a>
            <span className={styles.liveDot} aria-hidden="true" />
            <span>成长数据实时同步</span>
            <span className={styles.headerDivider} aria-hidden="true" />
            <DigitalClock />
          </div>
          <div className={styles.brandLockup}><span className={styles.brandMark} aria-hidden="true"><Sparkles size={21} /></span><div><p>屹力学生综评 · 家庭成长视图</p><h1>学生成长画像</h1></div></div>
          <div className={styles.headerRight}>
            <span className={styles.headerStudentMeta}>学号 {student.studentNo} · 班主任 {schoolClass?.homeroomTeacher ?? "待分配"}</span>
            <span className={styles.semesterBadge}>{semesterLabel}</span>
            {children.length > 1 ? <label className={styles.studentSwitcher}><Users size={14} aria-hidden="true" /><span className="sr-only">切换学生</span><select value={studentId} onChange={(event) => setSelectedStudentId(event.target.value)} aria-label="切换学生">{children.map((item) => <option key={item.studentId} value={item.studentId}>{item.name} · {item.className}</option>)}</select></label> : <span className={styles.singleStudent}>{child.name}</span>}
          </div>
        </header>

        <section id="student-command-main" className={styles.contentGrid}>
          <div className={styles.leftColumn}>
            <Panel id="five-education-radar" title="五育发展雷达" subtitle="当前学期 · 个人成长画像" icon={ChartNoAxesCombined} action={<span className={styles.dataTag}>个人</span>}><EChart className={styles.chartLarge} option={radarOption} ariaLabel={`${child.name}本学期五育发展雷达图`} /></Panel>
            <Panel id="five-education-trend" title="个人五育成长趋势" subtitle="近五个学期积分总量" icon={Sparkles} action={<span className={styles.dataTag}>持续向上</span>}><EChart className={styles.chartSmall} option={growthOption} ariaLabel={`${child.name}近五个学期五育积分增长趋势`} /></Panel>
          </div>

          <section className={styles.profilePanel} aria-labelledby="student-profile-heading">
            <div className={styles.profileGlow} aria-hidden="true" />
            <div className={styles.profileKicker}>MY GROWTH JOURNEY · 个人成长档案</div>
            <div className={styles.profileIdentity}><div className={styles.avatarOrbit}><span className={styles.orbitRing} aria-hidden="true" /><img className={styles.profileAvatar} src="/xszp/images/student-growth-3d.png" alt={`${child.name}的3D成长形象`} width={420} height={500} fetchPriority="high" /></div><div><p className={styles.profileName} id="student-profile-heading">{child.name}<span>{student.gender}</span></p><p className={styles.profileClass}>{grade?.name ?? "未分配年级"} · {schoolClass?.name ?? child.className}</p><p className={styles.profileStage}>成长阶段 · <b>{totalEarned >= 200 ? "闪耀之星" : totalEarned >= 100 ? "活力进阶" : totalEarned >= 40 ? "向阳成长" : "萌芽起步"}</b></p></div></div>
            <div className={styles.profileMetrics} aria-label="学生积分概览">{[
              { label: "本学期积分", value: semesterPoints, suffix: "分", icon: Sparkles, tone: "cyan" },
              { label: "累计成长积分", value: totalEarned, suffix: "分", icon: Trophy, tone: "mint" },
              { label: "可用积分", value: balance, suffix: "分", icon: WalletCards, tone: "amber" },
              { label: "已兑换积分", value: redeemedPoints, suffix: "分", icon: Award, tone: "violet" },
            ].map(({ label, value, suffix, icon: Icon, tone }) => <article key={label} className={`${styles.metricCard} ${styles[tone]}`}><span className={styles.metricIcon} aria-hidden="true"><Icon size={20} strokeWidth={2.25} /></span><div><p>{label}</p><strong>{value}<small>{suffix}</small></strong></div></article>)}</div>
          </section>

          <div className={styles.rightColumn}>
            <Panel id="academic-score" title="学科等第" subtitle="最新学期科目表现" icon={BookOpenCheck} action={<span className={styles.scoreBadge}>等第制</span>}><EChart className={styles.chartMedium} option={academicOption} ariaLabel={`${child.name}本学期学科等第分布图`} /><div className={styles.scoreList}>{academicScores.slice(0, 4).map((item) => <span key={item.subject}><b>{item.subject}</b><strong>{item.grade}</strong><em>总评</em></span>)}</div></Panel>
            <Panel id="fitness-score" title="体质健康" subtitle="历学期综合评分走势" icon={HeartPulse} action={<span className={styles.fitnessBadge}>{fitness.level}</span>}><div className={styles.fitnessSummary}><strong>{fitness.score}</strong><span>综合评分</span><div><b>{fitness.vision}</b><small>视力</small></div><div><b>{fitness.rope}</b><small>跳绳 / 分</small></div><div><b>{fitness.run}s</b><small>50 米跑</small></div></div><EChart className={styles.chartFitness} option={fitnessOption} ariaLabel={`${child.name}历学期体质健康综合评分走势`} /></Panel>
          </div>

          <div className={styles.recordsRow}>
            <Panel id="award-records" title="奖卡记录" subtitle="最近获得的成长认可" icon={Award} action={<span className={styles.dataTag}>{awards.length} 条</span>}><div className={styles.recordList}>{awards.length ? awards.map((item) => <article key={item.id} className={styles.recordItem}><span className={styles.recordDot} aria-hidden="true"><Award size={12} strokeWidth={2.4} /></span><div><strong>{item.level2 || item.level1}</strong><p>{item.date} · {item.operatorName}</p></div><b>+{item.points}</b></article>) : <EmptyRecord text="暂未获得奖卡记录" />}</div></Panel>
            <Panel id="honor-records" title="荣誉记录" subtitle="每一份努力都值得被看见" icon={Medal} action={<span className={styles.dataTag}>{studentHonors.length} 项</span>}><div className={styles.recordList}>{studentHonors.length ? studentHonors.map((item) => <article key={item.id} className={styles.recordItem}><span className={`${styles.recordDot} ${styles.honorDot}`} aria-hidden="true"><Medal size={12} strokeWidth={2.4} /></span><div><strong>{item.honorName}</strong><p>{item.awardDate} · {item.issuer}</p></div><b>+{item.points}</b></article>) : <EmptyRecord text="暂未获得荣誉记录" />}</div></Panel>
            <Panel id="activity-records" title="参加活动记录" subtitle="记录每一次主动参与" icon={CalendarDays} action={<span className={styles.dataTag}>{joinedActivities.length} 场</span>}><div className={styles.recordList}>{joinedActivities.length ? joinedActivities.map(({ enrollment, activity }) => <article key={enrollment.id} className={styles.recordItem}><span className={`${styles.recordDot} ${styles.activityDot}`} aria-hidden="true"><CalendarDays size={12} strokeWidth={2.4} /></span><div><strong>{activity.title}</strong><p>{activity.startDate} · {enrollment.status === "approved" ? "已通过" : "已报名"}</p></div><b>{activity.pointsCost ? `${activity.pointsCost} 分` : "参与"}</b></article>) : <EmptyRecord text="暂未参加活动" />}</div></Panel>
          </div>
        </section>
        <footer className={styles.footer}><span><i aria-hidden="true" /> 数据源：奖卡中心、荣誉档案、教务成绩、体质健康、活动管理</span><span>当前查看：{child.name} · {semesterLabel}</span></footer>
      </div>
    </div>
  </main>
}
