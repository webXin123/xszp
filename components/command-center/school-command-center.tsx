"use client"

import { useEffect, useMemo, useState } from "react"
import type { EChartsOption } from "echarts"
import {
  Award,
  CalendarDays,
  ChartNoAxesCombined,
  Clock3,
  Medal,
  Sparkles,
  Trophy,
  UsersRound,
  Zap,
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
  { label: "学生活跃度", value: "87.3", suffix: "%", detail: "较上周 +3.2%", icon: Zap, tone: "amber" },
  { label: "进行中活动", value: "28", suffix: "场", detail: "今日新增 5 场", icon: CalendarDays, tone: "violet" },
  { label: "本月新增荣誉", value: "186", suffix: "项", detail: "市级以上 31 项", icon: Trophy, tone: "mint" },
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
  const designHeight = 1180
  const [viewport, setViewport] = useState({ scale: 1, isScaled: false })

  useEffect(() => {
    const updateViewport = () => {
      const { innerWidth, innerHeight } = window
      const isScaled = innerWidth >= 1440 && innerHeight >= 760
      const scale = isScaled ? Math.min(innerWidth / 1920, innerHeight / designHeight) : 1

      setViewport({ scale: Number(scale.toFixed(3)), isScaled })
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

export function SchoolCommandCenter() {
  const [activeSlide, setActiveSlide] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const { scale, isScaled } = useCommandCenterScale()

  useEffect(() => {
    if (isPaused) return
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % awardSlides.length)
    }, 6000)
    return () => window.clearInterval(timer)
  }, [isPaused])

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
      data: [{ value: 96.4, name: "录入完成率" }],
    }],
  }), [])

  const honorOption = useMemo<EChartsOption>(() => ({
    animationDuration: 900,
    animationEasing: "cubicOut",
    grid: { left: 8, right: 28, top: 8, bottom: 4, containLabel: true },
    tooltip: { trigger: "item", confine: true, backgroundColor: "#0d2342", borderColor: "#376fa3", textStyle: { color: "#e8f7ff", fontSize: 11 }, formatter: "{b}：{c} 项" },
    xAxis: { type: "value", show: false },
    yAxis: {
      type: "category",
      inverse: true,
      data: ["市级以上", "区级", "校级", "班级"],
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: textMuted, fontSize: 11, margin: 11 },
    },
    series: [{
      type: "bar",
      barWidth: 11,
      data: [
        { value: 31, itemStyle: { color: "#ff7597" } },
        { value: 42, itemStyle: { color: "#c998ff" } },
        { value: 68, itemStyle: { color: "#55d7e9" } },
        { value: 45, itemStyle: { color: "#f7b957" } },
      ],
      showBackground: true,
      backgroundStyle: { color: "rgba(255,255,255,.045)", borderRadius: 9 },
      itemStyle: {
        borderRadius: [0, 9, 9, 0],
        color: {
          type: "linear",
          x: 0,
          y: 0,
          x2: 1,
          y2: 0,
          colorStops: [{ offset: 0, color: "#ff7597" }, { offset: 1, color: "#ffc2a7" }],
        },
      },
      emphasis: { focus: "series", itemStyle: { shadowBlur: 15, shadowColor: "rgba(255, 117, 151, .34)" } },
      label: { show: true, position: "right", color: "#ffe8ed", fontSize: 11, formatter: "{c}" },
    }],
  }), [])

  const slide = awardSlides[activeSlide]

  return (
    <main className={styles.screen} aria-label="学生综合评价数据中心">
      <a className={styles.skipLink} href="#command-center-main">跳到主要内容</a>
      <div className={styles.aurora} aria-hidden="true" />
      <div className={styles.gridTexture} aria-hidden="true" />
      <div className={styles.stars} aria-hidden="true" />

      <div className={`${styles.scaleViewport} ${isScaled ? styles.scaledViewport : styles.reflowViewport}`}>
      <div
        className={`${styles.dashboard} ${isScaled ? styles.scaledDashboard : ""}`}
        style={isScaled ? { "--dashboard-scale": scale } as React.CSSProperties : undefined}
      >
        <header className={styles.header}>
          <div className={styles.headerMeta}>
            <span className={styles.liveDot} aria-hidden="true" />
            <span>数据实时同步</span>
            <span className={styles.metaDivider} aria-hidden="true" />
            <DigitalClock />
          </div>
          <div className={styles.brandLockup}>
            <span className={styles.brandMark} aria-hidden="true"><Sparkles size={22} /></span>
            <div>
              <p>明珠实验学校 · 2026 秋季学期</p>
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
            <ChartPanel title="班级评级 · 本周 TOP 5" subtitle="综合表现指数（满分 100）" action="18 班已评级" icon={Medal}>
              <EChart className={styles.chartTall} option={classOption} ariaLabel="本周综合评级前五名班级及分数" />
              <div className={styles.gradeLegend}>
                <span><i className={styles.legendExcellent} /> 卓越 3</span>
                <span><i className={styles.legendGood} /> 优秀 8</span>
                <span><i className={styles.legendStandard} /> 良好 7</span>
              </div>
            </ChartPanel>

            <ChartPanel title="奖卡发放走势" subtitle="近 7 个月累计 1,248 张" action="本月 199" icon={Award}>
              <EChart className={styles.chartMedium} option={awardOption} ariaLabel="近七个月奖卡发放数量趋势" />
              <div className={styles.chartNote}><span className={styles.notePulse} /> 9 月日均发放 22.1 张，较 8 月增长 18%</div>
            </ChartPanel>
          </div>

          <section className={styles.pulseStage} aria-labelledby="pulse-heading">
            <div className={styles.stageHeader}>
              <span id="pulse-heading">今日奖卡播报</span>
              <div className={styles.stageHeaderActions}>
                <span className={styles.stageStatus}><i />TODAY</span>
                <span className={`${styles.autoplayStatus} ${isPaused ? styles.autoplayPaused : ""}`} aria-live="polite">
                  <i aria-hidden="true" /> {isPaused ? "轮播已暂停" : "自动轮播 · 6 秒切换"}
                </span>
                <button type="button" className={styles.stagePauseControl} aria-pressed={isPaused} onClick={() => setIsPaused((paused) => !paused)}>
                  {isPaused ? "继续" : "暂停"}
                </button>
              </div>
            </div>
            <div className={`${styles.orbit} ${styles.orbitOne}`} aria-hidden="true" />
            <div className={`${styles.orbit} ${styles.orbitTwo}`} aria-hidden="true" />
            <div className={`${styles.orbit} ${styles.orbitThree}`} aria-hidden="true" />
            <div className={styles.signalDot} aria-hidden="true" />
            <div className={styles.kaleidoGallery} aria-hidden="true">
              <div className={styles.galleryHalo} />
              <div className={styles.galleryBase} />
              {kaleidoscopeScenes.map((scene, index) => (
                <figure key={scene.src} className={`${styles.kaleidoScene} ${styles[scene.position]}`} style={{ "--scene-delay": `${index * -0.45}s` } as React.CSSProperties}>
                  <img src={assetPath(scene.src)} alt="" width={112} height={198} loading="lazy" />
                </figure>
              ))}
            </div>

            <article className={`${styles.signalCarousel} ${styles[slide.tone]}`} role="region" aria-roledescription="carousel" aria-label="今日获得奖卡的学生轮播">
              <div className={styles.kaleidoscope} aria-hidden="true">
                <div className={styles.kaleidoCore} />
                <div className={styles.kaleidoRing} />
                {kaleidoscopeBlades.map((blade) => (
                  <span key={blade} className={styles.kaleidoBlade} style={{ "--blade": blade, "--delay": `${blade * -0.28}s` } as React.CSSProperties} />
                ))}
              </div>
              <div key={slide.student} className={styles.signalContent} id={`pulse-slide-${activeSlide}`} role="tabpanel" aria-live="polite">
                <div className={styles.signalTopline}>
                  <span className={styles.signalLabel}>学生上传 · 活动成功展示</span>
                  <span className={styles.upTrend}>{slide.time} · {slide.points} 分</span>
                </div>
                <div className={styles.recordDeck}>
                  <article className={`${styles.recordCard} ${styles.awardRecordCard}`} aria-labelledby={`award-record-${activeSlide}`}>
                    <div className={styles.recordCardHeading}>
                      <span>奖卡记录</span>
                      <b>今日已发</b>
                    </div>
                    <figure className={styles.recordImageFrame}>
                      <img src={assetPath(slide.image)} alt={`${slide.award}奖卡图片`} width={320} height={180} loading={activeSlide === 0 ? "eager" : "lazy"} />
                      <figcaption>奖卡图片</figcaption>
                    </figure>
                    <div className={styles.recordCardBody}>
                      <div className={styles.studentIdentity}><strong id={`award-record-${activeSlide}`}>{slide.student}</strong><span>{slide.className}</span></div>
                      <div className={styles.awardName}><span>{slide.tag}</span>{slide.award}</div>
                      <div className={styles.recordMeta}><span>获得时间</span><b>{slide.time}</b><span>成长积分</span><b>{slide.points} 分</b></div>
                    </div>
                  </article>
                  <article className={`${styles.recordCard} ${styles.achievementRecordCard}`} aria-labelledby={`achievement-record-${activeSlide}`}>
                    <div className={styles.recordCardHeading}>
                      <span>成果记录</span>
                      <b>成果上传</b>
                    </div>
                    <figure className={styles.recordImageFrame}>
                      <img src={assetPath(slide.activityImage)} alt={`${slide.activity}活动图片`} width={320} height={180} loading={activeSlide === 0 ? "eager" : "lazy"} />
                      <figcaption>活动图片</figcaption>
                    </figure>
                    <div className={styles.recordCardBody}>
                      <div className={styles.activityName}><span id={`achievement-record-${activeSlide}`}>活动名称</span>{slide.activity}</div>
                      <p className={styles.awardStory}><span>成果摘要</span>“{slide.story}”</p>
                    </div>
                  </article>
                </div>
              </div>
            </article>

            <div className={styles.stageFoot}>
              <div><span>今日数据写入</span><strong>428<small>条</small></strong></div>
              <div><span>需要关注</span><strong className={styles.attentionValue}>73<small>项</small></strong></div>
              <div><span>已达成目标</span><strong>94.8<small>%</small></strong></div>
            </div>
            <div className={styles.cometTrail} aria-hidden="true" />
          </section>

          <div className={styles.rightColumn}>
            <ChartPanel title="活动参与构成" subtitle="本周已开展 42 场活动" action="参与 156 人次" icon={CalendarDays}>
              <EChart className={styles.chartMedium} option={activityOption} ariaLabel="本周活动参与类型占比分布" />
            </ChartPanel>

            <ChartPanel title="成绩录入进度" subtitle="当前录入任务完成情况" action="待补录 73 条" icon={ChartNoAxesCombined}>
              <div className={styles.scoreLayout}>
                <EChart className={styles.scoreGauge} option={scoreOption} ariaLabel="本周成绩录入完成率百分之九十六点四" />
                <div className={styles.scoreBreakdown}>
                  <div><span>语文 · 数学 · 英语</span><b>100%</b><i><em style={{ width: "100%" }} /></i></div>
                  <div><span>科学 · 道法</span><b>94%</b><i><em style={{ width: "94%" }} /></i></div>
                  <div><span>体育 · 艺术</span><b>88%</b><i><em style={{ width: "88%" }} /></i></div>
                </div>
              </div>
            </ChartPanel>

            <ChartPanel title="荣誉录入分布" subtitle="本月新增 186 项荣誉" action="已审核 91%" icon={Trophy}>
              <EChart className={styles.chartShort} option={honorOption} ariaLabel="本月不同级别荣誉数量分布" />
            </ChartPanel>
          </div>
        </section>

        <footer className={styles.footer}>
          <span><i /> 数据源：班级评价、奖卡中心、活动管理、成绩管理、荣誉档案</span>
          <span>上次同步：刚刚 &nbsp;·&nbsp; 数据范围：2026.09.01 — 2026.09.10</span>
        </footer>
      </div>
      </div>
    </main>
  )
}
