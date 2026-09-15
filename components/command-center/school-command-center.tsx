"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import type { EChartsOption } from "echarts"
import {
  Award,
  ArrowLeft,
  CalendarDays,
  ChartNoAxesCombined,
  Clock3,
  Medal,
  Sparkles,
  Trophy,
  UsersRound,
} from "lucide-react"
import { EChart } from "./echart"
import styles from "./school-command-center.module.css"

const gridLine = "rgba(151, 201, 255, 0.12)"
const textMuted = "rgba(211, 231, 255, 0.64)"
const basePath = "/xszp"
const assetPath = (path: string) => `${basePath}${path}`
const classGrades = [
  { name: "六年级 2班", score: 96.8, tag: "卓越" },
  { name: "五年级 1班", score: 94.6, tag: "优秀" },
  { name: "四年级 3班", score: 92.4, tag: "优秀" },
  { name: "三年级 4班", score: 90.8, tag: "良好" },
  { name: "二年级 2班", score: 89.3, tag: "良好" },
]

const awardSlides = [
  {
    student: "陈思远",
    className: "五年级 2班",
    award: "求知奖卡",
    tag: "探究力",
    points: "+8",
    time: "09:42",
    activity: "科学探究 · 校园气象站",
    story: "连续记录 7 天数据，并主动把观察方法分享给同学。",
    image: "/images/award-cards/id_04b68e512fb74c3c8f962c843e25a571.jpg",
    activityImage: "/images/activity-gallery/activity-makerspace.png",
    tone: "cyan",
  },
  {
    student: "林芷晴",
    className: "四年级 1班",
    award: "责任奖卡",
    tag: "责任担当",
    points: "+6",
    time: "10:16",
    activity: "班级共建 · 图书角整理",
    story: "主动认领整理任务，让每一本书都回到自己的位置。",
    image: "/images/award-cards/id_07bc8e6a63d54766a07a51d7c095e17f.jpg",
    activityImage: "/images/activity-gallery/activity-storybook.png",
    tone: "amber",
  },
  {
    student: "周子墨",
    className: "六年级 3班",
    award: "合作奖卡",
    tag: "协作共创",
    points: "+7",
    time: "11:08",
    activity: "绿色校园 · 节水倡议",
    story: "完成小组倡议展示，并在分工协作中帮助伙伴完成最后的创作。",
    image: "/images/award-cards/id_0cbf803e9d124e5fb55a3dd82efb8050.jpg",
    activityImage: "/images/activity-gallery/activity-recycling.png",
    tone: "violet",
  },
  {
    student: "沈安然",
    className: "三年级 4班",
    award: "实践奖卡",
    tag: "生活实践",
    points: "+5",
    time: "13:27",
    activity: "自然观察 · 秋日植物",
    story: "完成校园植物观察记录，清晰介绍了 3 种秋日植物。",
    image: "/images/award-cards/id_1a8d550b3d6545cd8c02317e274bc028.jpg",
    activityImage: "/images/activity-gallery/activity-garden.png",
    tone: "mint",
  },
  {
    student: "王一诺",
    className: "二年级 2班",
    award: "悦动奖卡",
    tag: "坚持运动",
    points: "+4",
    time: "14:05",
    activity: "阳光体育 · 跳绳挑战",
    story: "坚持完成 200 次练习，用行动完成了给自己的小目标。",
    image: "/images/award-cards/id_1eb89b94b046454dacad132448b60d08.jpg",
    activityImage: "/images/activity-gallery/activity-sports.png",
    tone: "rose",
  },
]

const metricCards = [
  { label: "参评班级", value: "18", suffix: "个", detail: "覆盖率 100%", icon: UsersRound, tone: "cyan" },
  { label: "班级评价达标", value: "91.6", suffix: "%", detail: "16 班表现优秀", icon: Medal, tone: "violet" },
  { label: "本周奖卡发放", value: "199", suffix: "张", detail: "较上周 +18%", icon: Award, tone: "amber" },
  { label: "活动参与人次", value: "156", suffix: "人", detail: "本周开展 42 场", icon: CalendarDays, tone: "mint" },
  { label: "本月新增荣誉", value: "186", suffix: "项", detail: "市级以上 31 项", icon: Trophy, tone: "rose" },
]

const semesterActivities = [
  { date: "09.09", title: "校园农场收获季", detail: "六年级 · 132 人参与", tag: "劳动实践", state: "已举办" },
  { date: "09.06", title: "秋日植物观察周", detail: "四年级 · 96 人参与", tag: "自然探索", state: "已举办" },
  { date: "09.03", title: "开学成长营", detail: "全校 · 518 人参与", tag: "主题活动", state: "已举办" },
  { date: "08.28", title: "小小讲解员训练营", detail: "五年级 · 48 人参与", tag: "表达实践", state: "已举办" },
  { date: "08.23", title: "阳光体育挑战赛", detail: "三年级 · 104 人参与", tag: "体育社团", state: "已举办" },
  { date: "08.16", title: "科学创想工作坊", detail: "二年级 · 72 人参与", tag: "学科拓展", state: "已举办" },
]

const weeklyClassEvaluations = [
  { className: "六年级 2班", progress: "38 / 38", score: "96.8", state: "卓越" },
  { className: "五年级 1班", progress: "36 / 36", score: "94.6", state: "优秀" },
  { className: "四年级 3班", progress: "35 / 36", score: "92.4", state: "优秀" },
  { className: "三年级 4班", progress: "34 / 35", score: "90.8", state: "良好" },
  { className: "二年级 2班", progress: "32 / 34", score: "89.3", state: "良好" },
  { className: "一年级 1班", progress: "30 / 32", score: "88.7", state: "良好" },
]

const schoolPointRankings = [
  { rank: 1, name: "彭皓轩", className: "六年级 1班", points: "186", award: "责任担当" },
  { rank: 2, name: "吕婉清", className: "五年级 2班", points: "172", award: "自主管理" },
  { rank: 3, name: "苏奕辰", className: "六年级 3班", points: "168", award: "实践创新" },
  { rank: 4, name: "蒋欣悦", className: "四年级 1班", points: "161", award: "礼仪之美" },
  { rank: 5, name: "蔡鸿煊", className: "五年级 1班", points: "154", award: "积极心理" },
  { rank: 6, name: "贾沐宸", className: "三年级 4班", points: "149", award: "志愿服务" },
  { rank: 7, name: "丁安琪", className: "四年级 3班", points: "143", award: "健康习惯" },
  { rank: 8, name: "魏泽楷", className: "二年级 2班", points: "138", award: "安全意识" },
  { rank: 9, name: "薛璐瑜", className: "三年级 1班", points: "132", award: "爱国敬业" },
  { rank: 10, name: "叶书豪", className: "二年级 1班", points: "126", award: "诚信友善" },
]

const kaleidoscopeBlades = Array.from({ length: 12 }, (_, index) => index)
const kaleidoscopeScenes = [
  { src: "/images/award-cards/id_04b68e512fb74c3c8f962c843e25a571.jpg", position: "sceneOne" },
  { src: "/images/award-cards/id_07bc8e6a63d54766a07a51d7c095e17f.jpg", position: "sceneTwo" },
  { src: "/images/award-cards/id_0cbf803e9d124e5fb55a3dd82efb8050.jpg", position: "sceneThree" },
  { src: "/images/award-cards/id_1a8d550b3d6545cd8c02317e274bc028.jpg", position: "sceneFour" },
  { src: "/images/award-cards/id_1eb89b94b046454dacad132448b60d08.jpg", position: "sceneFive" },
  { src: "/images/award-cards/id_43dae637895745c3b0fcff2bf4e1d295.jpg", position: "sceneSix" },
]

function useCommandCenterScale() {
  const designWidth = 1920
  const designHeight = 1080
  const [viewport, setViewport] = useState({ scale: 1, isScaled: false })

  useEffect(() => {
    const updateViewport = () => {
      const viewportWidth = window.visualViewport?.width || window.innerWidth
      const viewportHeight = window.visualViewport?.height || window.innerHeight
      const isScaled = viewportWidth > 0 && viewportHeight > 0
      const scale = isScaled ? Math.min(viewportWidth / designWidth, viewportHeight / designHeight) : 1

      setViewport({ scale: Number(scale.toFixed(6)), isScaled })
    }

    updateViewport()
    window.addEventListener("resize", updateViewport)
    window.visualViewport?.addEventListener("resize", updateViewport)

    return () => {
      window.removeEventListener("resize", updateViewport)
      window.visualViewport?.removeEventListener("resize", updateViewport)
    }
  }, [])

  return viewport
}

function ChartPanel({
  title,
  subtitle,
  action,
  children,
  icon: Icon,
}: {
  title: string
  subtitle?: string
  action?: string
  children: React.ReactNode
  icon: typeof ChartNoAxesCombined
}) {
  return (
    <section className={styles.panel} aria-labelledby={title.replaceAll(" ", "-")}>
      <div className={styles.panelHeading}>
        <span className={styles.headingIcon} aria-hidden="true"><Icon size={15} strokeWidth={2.2} /></span>
        <div>
          <h2 id={title.replaceAll(" ", "-")}>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {action ? <span className={styles.panelAction}>{action}</span> : null}
      </div>
      {children}
    </section>
  )
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

function ShowcaseSlide({
  slide,
  displayIndex,
  idSuffix,
  isActive,
}: {
  slide: (typeof awardSlides)[number]
  displayIndex: number
  idSuffix: number
  isActive: boolean
}) {
  return (
    <div className={`${styles.carouselSlide} ${isActive ? styles.carouselSlideActive : ""}`} id={`pulse-slide-${idSuffix}`} role="group" aria-hidden={!isActive} aria-label={`${displayIndex + 1} / ${awardSlides.length} 条成长播报`}>
      <div className={styles.signalContent}>
        <div className={styles.recordDeck}>
          <article className={`${styles.recordCard} ${styles.awardRecordCard}`} aria-labelledby={`award-record-${idSuffix}`}><div className={styles.recordCardHeading}><span>奖卡记录</span><b>今日已发</b></div><figure className={styles.recordImageFrame}><img src={assetPath(slide.image)} alt={`${slide.award}奖卡图片`} width={320} height={180} loading={displayIndex === 0 ? "eager" : "lazy"} /><figcaption>学生成长奖卡</figcaption></figure><div className={styles.recordCardBody}><div className={styles.studentIdentity}><strong id={`award-record-${idSuffix}`}>{slide.student}</strong><span>{slide.className}</span></div><div className={styles.awardName}><span>{slide.tag}</span>{slide.award}</div><div className={styles.recordMeta}><span>获得时间</span><b>{slide.time}</b><span>成长积分</span><b>{slide.points} 分</b></div></div></article>
          <article className={`${styles.recordCard} ${styles.achievementRecordCard}`} aria-labelledby={`achievement-record-${idSuffix}`}><div className={styles.recordCardHeading}><span>活动成果</span><b>现场展示</b></div><figure className={styles.recordImageFrame}><img src={assetPath(slide.activityImage)} alt={`${slide.activity}活动图片`} width={320} height={180} loading={displayIndex === 0 ? "eager" : "lazy"} /><figcaption>活动精彩瞬间</figcaption></figure><div className={styles.recordCardBody}><div className={styles.activityName}><span id={`achievement-record-${idSuffix}`}>活动名称</span>{slide.activity}</div><p className={styles.awardStory}><span>成长故事</span>“{slide.story}”</p></div></article>
        </div>
      </div>
    </div>
  )
}

function CarouselGhost({ slide, side }: { slide: (typeof awardSlides)[number]; side: "ghostPrevious" | "ghostNext" }) {
  return <div className={`${styles.carouselGhost} ${styles[side]}`} aria-hidden="true"><figure><img src={assetPath(slide.image)} alt="" width={320} height={180} loading="lazy" /></figure><figure><img src={assetPath(slide.activityImage)} alt="" width={320} height={180} loading="lazy" /></figure></div>
}

function RollingList({ type }: { type: "activity" | "evaluation" }) {
  const activityGroup = (duplicate: boolean) => (
    <div className={styles.rollingGroup} key={duplicate ? "activity-duplicate" : "activity-source"} aria-hidden={duplicate || undefined}>
      {semesterActivities.map((item) => (
        <article className={styles.activityRow} role="listitem" key={`${duplicate}-${item.date}-${item.title}`}>
          <time>{item.date}</time>
          <div><strong>{item.title}</strong><span>{item.detail}</span></div>
          <em>{item.tag}</em><b>{item.state}</b>
        </article>
      ))}
    </div>
  )

  const evaluationGroup = (duplicate: boolean) => (
    <div className={styles.rollingGroup} key={duplicate ? "evaluation-duplicate" : "evaluation-source"} aria-hidden={duplicate || undefined}>
      {weeklyClassEvaluations.map((item) => (
        <article className={styles.evaluationRow} role="listitem" key={`${duplicate}-${item.className}`}>
          <span className={styles.evaluationClass}>{item.className}</span>
          <span className={styles.evaluationProgress}>{item.progress}<small>人已评</small></span>
          <strong>{item.score}</strong><b>{item.state}</b>
        </article>
      ))}
    </div>
  )

  return (
    <div className={`${styles.rollingList} ${type === "activity" ? styles.activityList : styles.evaluationList}`} role="list" tabIndex={0} aria-label={type === "activity" ? "本学期举办活动列表，聚焦后暂停滚动" : "本周班级评价明细列表，聚焦后暂停滚动"}>
      <div className={styles.rollingTrack}>
        {type === "activity" ? [activityGroup(false), activityGroup(true)] : [evaluationGroup(false), evaluationGroup(true)]}
      </div>
    </div>
  )
}

function StudentRankingList() {
  const renderGroup = (duplicate: boolean) => (
    <div className={styles.rankingGroup} key={duplicate ? "ranking-duplicate" : "ranking-source"} aria-hidden={duplicate || undefined}>
      {schoolPointRankings.map((item) => (
        <article className={styles.rankingRow} role="listitem" key={`${duplicate}-${item.rank}`}>
          <span className={`${styles.rankingNumber} ${item.rank <= 3 ? styles.rankingTop : ""}`}>{String(item.rank).padStart(2, "0")}</span>
          <div><strong>{item.name}</strong><span>{item.className} · {item.award}</span></div>
          <b>{item.points}<small>分</small></b>
        </article>
      ))}
    </div>
  )

  return (
    <div className={styles.rankingList} role="list" tabIndex={0} aria-label="本学期五育积分获得总分全校排名前十，聚焦后暂停滚动">
      <div className={styles.rankingTrack}>{renderGroup(false)}{renderGroup(true)}</div>
    </div>
  )
}

export function SchoolCommandCenter() {
  const [trackIndex, setTrackIndex] = useState(0)
  const [isTrackSnapping, setIsTrackSnapping] = useState(false)
  const { scale, isScaled } = useCommandCenterScale()
  const activeSlide = trackIndex % awardSlides.length
  const carouselSlides = [...awardSlides, awardSlides[0]]

  useEffect(() => {
    const timer = window.setInterval(() => setTrackIndex((current) => current + 1), 6000)
    return () => window.clearInterval(timer)
  }, [])

  const handleTrackTransitionEnd = (event: React.TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || trackIndex !== awardSlides.length) return
    setIsTrackSnapping(true)
    setTrackIndex(0)
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => setIsTrackSnapping(false)))
  }

  const classOption = useMemo<EChartsOption>(() => ({
    animationDuration: 700,
    animationEasing: "cubicOut",
    tooltip: {
      trigger: "axis",
      confine: true,
      backgroundColor: "#0d2342",
      borderColor: "#3476aa",
      borderWidth: 1,
      textStyle: { color: "#e8f7ff", fontSize: 11 },
      axisPointer: { type: "shadow", shadowStyle: { color: "rgba(75, 210, 242, .08)" } },
    },
    grid: { left: 8, right: 32, top: 12, bottom: 4, containLabel: true },
    xAxis: { type: "value", min: 80, max: 100, show: false },
    yAxis: {
      type: "category",
      inverse: true,
      data: classGrades.map((item) => item.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: textMuted, fontSize: 11, margin: 12 },
    },
    series: [{
      type: "bar",
      data: classGrades.map((item) => item.score),
      barWidth: 10,
      showBackground: true,
      backgroundStyle: { color: "rgba(255,255,255,0.045)", borderRadius: 10 },
      itemStyle: {
        borderRadius: [0, 10, 10, 0],
        color: {
          type: "linear",
          x: 0,
          y: 0,
          x2: 1,
          y2: 0,
          colorStops: [{ offset: 0, color: "#2bbbe9" }, { offset: 1, color: "#a2f6e9" }],
        },
      },
      emphasis: { focus: "series", itemStyle: { shadowBlur: 16, shadowColor: "rgba(77, 225, 239, .42)" } },
      label: { show: true, position: "right", color: "#dffaff", fontSize: 11, formatter: "{c}" },
    }],
  }), [])

  const awardOption = useMemo<EChartsOption>(() => ({
    animationDuration: 900,
    animationEasing: "cubicOut",
    grid: { left: 4, right: 8, top: 20, bottom: 2, containLabel: true },
    tooltip: { trigger: "axis", confine: true, backgroundColor: "#0d2342", borderColor: "#376fa3", textStyle: { color: "#e8f7ff", fontSize: 11 }, axisPointer: { type: "cross", lineStyle: { color: "rgba(113, 224, 255, .45)" }, crossStyle: { color: "rgba(113, 224, 255, .45)" } } },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: ["3月", "4月", "5月", "6月", "7月", "8月", "9月"],
      axisLine: { lineStyle: { color: gridLine } },
      axisTick: { show: false },
      axisLabel: { color: textMuted, fontSize: 10 },
    },
    yAxis: {
      type: "value",
      splitNumber: 3,
      axisLabel: { color: textMuted, fontSize: 10 },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: gridLine, type: "dashed" } },
    },
    series: [{
      name: "发放量",
      type: "line",
      smooth: 0.45,
      symbol: "circle",
      symbolSize: 5,
      data: [118, 164, 142, 211, 178, 236, 199],
      lineStyle: { width: 2.5, color: "#f7b957" },
      itemStyle: { color: "#ffe39a", borderColor: "#f59e0b", borderWidth: 2 },
      emphasis: { focus: "series", scale: true, itemStyle: { shadowBlur: 12, shadowColor: "rgba(247, 185, 87, .55)" }, lineStyle: { width: 3 } },
      areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(247,185,87,.35)" }, { offset: 1, color: "rgba(247,185,87,0)" }] } },
    }],
  }), [])

  const activityOption = useMemo<EChartsOption>(() => ({
    animationDuration: 900,
    animationEasing: "cubicOut",
    tooltip: { trigger: "item", confine: true, backgroundColor: "#0d2342", borderColor: "#376fa3", textStyle: { color: "#e8f7ff", fontSize: 11 }, formatter: "{b}<br/><strong>{c}</strong> 人次（{d}%）" },
    legend: { bottom: 0, itemWidth: 8, itemHeight: 8, itemGap: 12, selectedMode: false, textStyle: { color: textMuted, fontSize: 10 } },
    series: [{
      type: "pie",
      radius: ["42%", "74%"],
      center: ["50%", "44%"],
      padAngle: 3,
      itemStyle: { borderRadius: 6, borderColor: "#102544", borderWidth: 2 },
      label: { show: false },
      emphasis: { scale: true, scaleSize: 5, itemStyle: { shadowBlur: 18, shadowColor: "rgba(74, 221, 227, .32)" } },
      data: [
        { value: 34, name: "五育实践", itemStyle: { color: "#a685ff" } },
        { value: 26, name: "体育社团", itemStyle: { color: "#3fcde8" } },
        { value: 22, name: "学科拓展", itemStyle: { color: "#f7b957" } },
        { value: 18, name: "家校共育", itemStyle: { color: "#7ee0bf" } },
      ],
    }],
    graphic: [{ type: "text", left: "center", top: "32%", style: { text: "156\\n参与人次", textAlign: "center", fill: "#e6f5ff", font: "600 13px sans-serif", lineHeight: 21 } }],
  }), [])

  const scoreOption = useMemo<EChartsOption>(() => ({
    animationDuration: 900,
    animationEasing: "cubicOut",
    series: [{
      type: "gauge",
      center: ["50%", "55%"],
      radius: "88%",
      startAngle: 205,
      endAngle: -25,
      min: 0,
      max: 100,
      splitNumber: 4,
      axisLine: { lineStyle: { width: 12, color: [[0.6, "rgba(255, 255, 255, .08)"], [0.9, "rgba(118, 226, 189, .18)"], [1, "rgba(255, 255, 255, .08)"]] } },
      progress: { show: true, width: 12, roundCap: true, itemStyle: { color: { type: "linear", x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: "#41cdb2" }, { offset: 1, color: "#d6ffe1" }] } } },
      pointer: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      anchor: { show: false },
      title: { offsetCenter: [0, "39%"], color: textMuted, fontSize: 11 },
      detail: { valueAnimation: true, offsetCenter: [0, "-2%"], formatter: "{value}%", color: "#e9fff7", fontSize: 29, fontWeight: 700 },
      data: [{ value: 91.6, name: "班级评价达标率" }],
    }],
  }), [])

  const honorOption = useMemo<EChartsOption>(() => ({
    animationDuration: 900,
    animationEasing: "cubicOut",
    tooltip: { trigger: "item", confine: true, backgroundColor: "#0d2342", borderColor: "#376fa3", textStyle: { color: "#e8f7ff", fontSize: 12 }, formatter: "{b}：{c} 项（{d}%）" },
    legend: { bottom: 0, itemWidth: 8, itemHeight: 8, itemGap: 10, selectedMode: false, textStyle: { color: textMuted, fontSize: 12 } },
    series: [{
      type: "pie",
      radius: ["42%", "70%"],
      center: ["50%", "43%"],
      padAngle: 3,
      itemStyle: { borderColor: "#102544", borderWidth: 2, borderRadius: 5 },
      label: { show: true, color: "#e8f7ff", fontSize: 12, formatter: "{b}\n{c} 项" },
      labelLine: { length: 7, length2: 6, lineStyle: { color: "rgba(184, 224, 255, .42)" } },
      emphasis: { scale: true, scaleSize: 5, itemStyle: { shadowBlur: 18, shadowColor: "rgba(85, 215, 233, .3)" } },
      data: [
        { value: 31, name: "市级以上", itemStyle: { color: "#ff7597" } },
        { value: 42, name: "区级", itemStyle: { color: "#c998ff" } },
        { value: 68, name: "校级", itemStyle: { color: "#55d7e9" } },
        { value: 45, name: "班级", itemStyle: { color: "#f7b957" } },
      ],
    }],
  }), [])

  const slide = awardSlides[activeSlide]

  return (
    <main className={`${styles.screen} ${isScaled ? styles.scaledScreen : ""}`} aria-label="学生综合评价数据中心">
      <a className={styles.skipLink} href="#command-center-main">跳到主要内容</a>
      <div className={styles.aurora} aria-hidden="true" />
      <div className={styles.gridTexture} aria-hidden="true" />
      <div className={styles.stars} aria-hidden="true" />

      <div
        className={`${styles.scaleViewport} ${isScaled ? styles.scaledViewport : styles.reflowViewport}`}
        style={isScaled ? { "--dashboard-scale": scale } as React.CSSProperties : undefined}
      >
      <div
        className={`${styles.dashboard} ${isScaled ? styles.scaledDashboard : ""}`}
      >
        <header className={styles.header}>
          <div className={styles.headerMeta}>
            <Link className={styles.backLink} href="/" aria-label="返回管理员首页">
              <ArrowLeft size={17} aria-hidden="true" />
            </Link>
            <span className={styles.liveDot} aria-hidden="true" />
            <span>数据实时同步</span>
            <span className={styles.metaDivider} aria-hidden="true" />
            <DigitalClock />
          </div>
          <div className={styles.brandLockup}>
            <span className={styles.brandMark} aria-hidden="true"><Sparkles size={22} /></span>
            <div>
              <p>屹力学校 · 2026 秋季学期</p>
              <h1>学生综合素质数据中心</h1>
            </div>
          </div>
          <div className={styles.headerMetaRight}>
            <span>第 03 教学周</span>
            <span className={styles.headerBadge}>全校视图</span>
          </div>
        </header>

        <section className={styles.metricStrip} aria-label="核心指标">
          {metricCards.map(({ label, value, suffix, detail, icon: Icon, tone }) => (
            <article key={label} className={`${styles.metricCard} ${styles[tone]}`}>
              <span className={styles.metricIcon} aria-hidden="true"><Icon size={19} /></span>
              <div>
                <p>{label}</p>
                <strong>{value}<small>{suffix}</small></strong>
              </div>
              <span className={styles.metricDetail}>{detail}</span>
            </article>
          ))}
        </section>

        <section id="command-center-main" className={styles.contentGrid}>
          <div className={styles.leftColumn}>
            <ChartPanel title="本周班级评价明细" subtitle="班级评价进度与综合表现" action="18 班已同步" icon={ChartNoAxesCombined}>
              <RollingList type="evaluation" />
            </ChartPanel>

            <ChartPanel title="本周全年级班级评价前 5" subtitle="综合表现指数（满分 100）" action="18 班已完成" icon={Medal}>
              <EChart className={styles.chartTall} option={classOption} ariaLabel="本周班级评价前五名及综合表现分数" />
              <div className={styles.gradeLegend}>
                <span><i className={styles.legendExcellent} /> 卓越 3</span>
                <span><i className={styles.legendGood} /> 优秀 8</span>
                <span><i className={styles.legendStandard} /> 良好 7</span>
              </div>
            </ChartPanel>

          </div>

          <section className={styles.pulseStage} aria-labelledby="pulse-heading">
            <div className={styles.stageHeader}>
              <span id="pulse-heading">今日成长播报</span>
            </div>
            <div className={`${styles.orbit} ${styles.orbitOne}`} aria-hidden="true" />
            <div className={`${styles.orbit} ${styles.orbitTwo}`} aria-hidden="true" />
            <div className={`${styles.orbit} ${styles.orbitThree}`} aria-hidden="true" />
            <div className={styles.signalDot} aria-hidden="true" />
            <div className={styles.kaleidoGallery} aria-hidden="true"><div className={styles.galleryHalo} /><div className={styles.galleryBase} />{kaleidoscopeScenes.map((scene, index) => <figure key={scene.src} className={`${styles.kaleidoScene} ${styles[scene.position]}`} style={{ "--scene-delay": `${index * -0.45}s` } as React.CSSProperties}><img src={assetPath(scene.src)} alt="" width={112} height={198} loading="lazy" /></figure>)}</div>

            <article className={`${styles.signalCarousel} ${styles[slide.tone]}`} role="region" aria-roledescription="carousel" aria-label="今日获得奖卡及活动成果轮播">
              <div className={styles.kaleidoscope} aria-hidden="true"><div className={styles.kaleidoCore} /><div className={styles.kaleidoRing} />{kaleidoscopeBlades.map((blade) => <span key={blade} className={styles.kaleidoBlade} style={{ "--blade": blade, "--delay": `${blade * -0.28}s` } as React.CSSProperties} />)}</div>
              <div className={styles.carouselDepth} key={`${activeSlide}-${slide.student}`}><CarouselGhost slide={awardSlides[(activeSlide - 1 + awardSlides.length) % awardSlides.length]} side="ghostPrevious" /><CarouselGhost slide={awardSlides[(activeSlide + 1) % awardSlides.length]} side="ghostNext" /></div>
              <div className={styles.carouselViewport} aria-live="polite"><div className={`${styles.carouselTrack} ${isTrackSnapping ? styles.trackInstant : ""}`} style={{ transform: `translateX(-${trackIndex * 100}%)` }} onTransitionEnd={handleTrackTransitionEnd}>{carouselSlides.map((item, index) => <ShowcaseSlide key={`${item.student}-${item.award}-${index}`} slide={item} displayIndex={index % awardSlides.length} idSuffix={index} isActive={index === trackIndex} />)}</div></div>
            </article>
            <div className={styles.stageAwardTrend}>
              <ChartPanel title="奖卡发放走势" subtitle="近 7 个月累计 1,248 张" action="本月 199" icon={Award}>
                <EChart className={styles.stageTrendChart} option={awardOption} ariaLabel="近七个月奖卡发放数量趋势" />
              </ChartPanel>
            </div>
            <div className={styles.cometTrail} aria-hidden="true" />
          </section>

          <div className={styles.rightColumn}>
            <ChartPanel title="本学期五育积分全校前 10" subtitle="按获得总分实时滚动" action="本学期累计" icon={Trophy}>
              <StudentRankingList />
            </ChartPanel>

            <ChartPanel title="本学期举办活动" subtitle="活动动态持续更新" action="已举办 42 场" icon={CalendarDays}>
              <RollingList type="activity" />
            </ChartPanel>

            <ChartPanel title="荣誉录入分布" subtitle="本月新增 186 项荣誉" action="已审核 91%" icon={Trophy}>
              <EChart className={styles.chartShort} option={honorOption} ariaLabel="本月不同级别荣誉数量分布" />
            </ChartPanel>
          </div>
        </section>

        <footer className={styles.footer}>
          <span><i /> 数据源：班级评价、奖卡中心、活动管理、荣誉档案</span>
          <span>上次同步：刚刚 &nbsp;·&nbsp; 数据范围：2026.09.01 — 2026.09.10</span>
        </footer>
      </div>
      </div>
    </main>
  )
}
