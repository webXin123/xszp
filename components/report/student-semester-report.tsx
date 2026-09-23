"use client"

import {
  BookOpenText,
  CalendarDays,
  GraduationCap,
  HeartPulse,
  Medal,
  MessageCircle,
  Music2,
  PenLine,
  Sprout,
  Trophy,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Activity, HonorRecord } from "@/lib/types"

type AcademicScoreRow = { subject: string; grade: string }
type FitnessMetrics = {
  height: number
  weight: number
  run: string
  rope: number
  level: string
  score?: number
  vitalCapacity?: number
  sitAndReach?: string
  standingLongJump?: number
  vision?: string
}

export interface StudentSemesterReportData {
  semesterLabel: string
  student: { name: string; gender: string; studentNo: string }
  className: string
  gradeName: string
  homeroomTeacher: string
  semesterPoints: number
  totalPoints: number
  fiveEducation: number[]
  academicScores: AcademicScoreRow[]
  fitnessMetrics: FitnessMetrics
  honors: HonorRecord[]
  activities: Activity[]
}

export type StudentSemesterReportProps = StudentSemesterReportData

const ASSET_ROOT = "/xszp/report-assets"
const RADAR_LABELS = ["德育", "智育", "体育", "美育", "劳动"]
const ACTIVITY_ICONS = [Sprout, PenLine, Music2]

function RadarChart({ values }: { values: number[] }) {
  const center = 150
  const radius = 90
  const pointsFor = (scale: number) => RADAR_LABELS.map((_, index) => {
    const angle = -Math.PI / 2 + index * (Math.PI * 2 / RADAR_LABELS.length)
    const value = radius * scale
    return `${center + Math.cos(angle) * value},${center + Math.sin(angle) * value}`
  }).join(" ")
  const valuePoints = RADAR_LABELS.map((_, index) => {
    const angle = -Math.PI / 2 + index * (Math.PI * 2 / RADAR_LABELS.length)
    const value = radius * Math.min(1, Math.max(0.16, (values[index] ?? 0) / 120))
    return `${center + Math.cos(angle) * value},${center + Math.sin(angle) * value}`
  }).join(" ")

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[310px]">
      <svg viewBox="0 0 300 300" className="size-full" role="img" aria-label="本学期五育发展雷达图">
        {[0.25, 0.5, 0.75, 1].map((scale) => <polygon key={scale} points={pointsFor(scale)} fill="none" stroke="#73b7e6" strokeOpacity=".45" strokeWidth="1" />)}
        {RADAR_LABELS.map((label, index) => {
          const angle = -Math.PI / 2 + index * (Math.PI * 2 / RADAR_LABELS.length)
          const x = center + Math.cos(angle) * radius
          const y = center + Math.sin(angle) * radius
          return <line key={label} x1={center} y1={center} x2={x} y2={y} stroke="#73b7e6" strokeOpacity=".45" strokeWidth="1" />
        })}
        <polygon points={valuePoints} fill="#50a6dd" fillOpacity=".34" stroke="#0784cc" strokeWidth="3" />
        {RADAR_LABELS.map((label, index) => {
          const angle = -Math.PI / 2 + index * (Math.PI * 2 / RADAR_LABELS.length)
          const x = center + Math.cos(angle) * (radius + 21)
          const y = center + Math.sin(angle) * (radius + 21)
          return <g key={label}><circle cx={center + Math.cos(angle) * radius * Math.min(1, Math.max(0.16, (values[index] ?? 0) / 120))} cy={center + Math.sin(angle) * radius * Math.min(1, Math.max(0.16, (values[index] ?? 0) / 120))} r="5" fill="#097ec2" /><text x={x} y={y - 4} textAnchor="middle" fill="#174d91" fontSize="14" fontWeight="700">{label}</text><text x={x} y={y + 15} textAnchor="middle" fill="#174d91" fontSize="17" fontWeight="700">{values[index] ?? 0}</text></g>
        })}
      </svg>
    </div>
  )
}

function Section({ icon: Icon, title, aside, children, className }: { icon: typeof Trophy; title: string; aside?: string; children: React.ReactNode; className?: string }) {
  return <section className={cn("relative overflow-hidden rounded-[18px] border border-[#b5dcfa] bg-white/90 shadow-[0_6px_18px_-14px_rgba(42,122,190,.55)]", className)}><div className="flex items-center justify-between gap-2 px-3 pt-3 sm:gap-3 sm:px-5 sm:pt-4"><h2 className="flex min-w-0 items-center gap-1.5 text-base font-bold tracking-wide text-[#174d91] sm:gap-2 sm:text-[21px]"><Icon className="size-6 shrink-0 text-[#0784cc] sm:size-9" strokeWidth={1.8} aria-hidden="true" />{title}</h2>{aside && <span className="shrink-0 text-[11px] font-semibold tracking-normal text-[#5597c5] sm:text-sm sm:tracking-wider">{aside}</span>}</div>{children}</section>
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return <div className="flex min-w-0 items-baseline gap-2 border-b border-[#cfe6f8] pb-2 sm:gap-3"><span className="shrink-0 text-xs font-semibold text-[#174d91] sm:text-sm">{label}</span><span className="truncate text-base font-bold text-[#174d91] sm:text-[21px]">{value}</span></div>
}

function FitnessCell({ icon: Icon, label, value }: { icon: typeof HeartPulse; label: string; value: string }) {
  return <div className="flex min-h-12 items-center gap-2 rounded-xl border border-[#b9def7] bg-white/75 px-2.5 sm:min-h-[57px] sm:gap-3 sm:px-4"><Icon className="size-6 shrink-0 text-[#3a94c7] sm:size-9" strokeWidth={1.8} aria-hidden="true" /><div className="min-w-0"><p className="truncate text-xs font-semibold text-[#174d91] sm:text-sm">{label}</p><p className="truncate text-sm font-bold tabular-nums text-[#174d91] sm:text-[19px]">{value}</p></div></div>
}

export function StudentSemesterReport({ semesterLabel, student, className, gradeName, homeroomTeacher, semesterPoints, totalPoints, fiveEducation, academicScores, fitnessMetrics, honors, activities }: StudentSemesterReportProps) {
  const latestHonors = honors.slice(0, 2)
  const latestActivities = activities.slice(0, 3)
  const fitnessScore = Math.max(80, Math.min(98, 82 + (fitnessMetrics.height % 14)))
  const termChange = Math.max(8, Math.round(semesterPoints * 0.18))
  const comment = `${student.name}同学品行端正，乐观向上，待人真诚，集体荣誉感强。能积极参与各项活动，在学习与生活中发挥良好的带头作用。愿你继续保持热忱，脚踏实地，向着更广阔的未来勇敢前行！`

  return <article className="report-sheet relative mx-auto w-full max-w-[941px] overflow-hidden bg-[#effaff] font-serif text-[#174d91] shadow-[0_24px_70px_-34px_rgba(38,105,161,.55)]">
    <div className="relative z-10 px-3 pb-4 pt-0 sm:px-[4.46%] sm:pb-6">
      <header className="relative h-[118px] overflow-hidden border-b border-[#bddcf4] text-center sm:h-[170px]">
        <img src={`${ASSET_ROOT}/report-header-background.png`} alt="学生学期报告单顶部背景" width={858} height={170} fetchPriority="high" className="absolute inset-0 size-full object-cover" />
      </header>

      <section className="mt-3 grid min-h-[124px] grid-cols-1 gap-3 rounded-[18px] border border-[#b8ddfa] bg-white/90 p-3 sm:grid-cols-[1fr_250px] sm:p-4">
        <div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-3 sm:gap-x-5"><InfoCell label="姓名" value={student.name} /><InfoCell label="性别" value={student.gender} /><InfoCell label="班级" value={`${gradeName} ${className}`} /><InfoCell label="学籍号" value={student.studentNo} /><InfoCell label="班主任" value={homeroomTeacher || "班主任老师"} /></div>
        <div className="flex min-h-24 flex-col items-center justify-center rounded-xl bg-[linear-gradient(180deg,#f7fcff_0%,#e1f3fe_100%)] px-2 py-3 text-center sm:min-h-0"><p className="text-xs font-semibold sm:text-[15px]">本学期五育奖卡总分</p><p className="mt-1 text-[29px] font-bold leading-none text-[#0d438b] sm:text-[35px]">{semesterPoints}<span className="ml-1 text-base font-semibold text-[#5d93c4] sm:text-[19px]">/ {Math.max(600, semesterPoints + 114)}</span></p><p className="mt-2 text-xs sm:text-[15px]">较上学期 <span className="text-lg font-bold text-[#df8616] sm:text-[21px]">+{termChange}</span></p></div>
      </section>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Section icon={Medal} title="本学期五育发展情况" aside="全面发展　向光而行" className="min-h-[300px] sm:min-h-[340px]"><div className="relative px-3 pb-2 pt-0"><RadarChart values={fiveEducation} /></div></Section>
        <Section icon={HeartPulse} title="体质健康成绩" aside="全面发展　向光而行" className="min-h-[300px] sm:min-h-[340px]"><div className="p-3 sm:p-4"><div className="rounded-xl bg-[#e4f5ff] px-3 py-2.5 text-center sm:px-4 sm:py-3"><span className="text-sm font-semibold sm:text-[17px]">综合评定　</span><strong className="text-xl sm:text-[28px]">{fitnessMetrics.level} · {fitnessScore}分</strong></div><div className="mt-3 grid grid-cols-2 gap-2"><FitnessCell icon={HeartPulse} label="肺活量" value={`${fitnessMetrics.height * 25} ml`} /><FitnessCell icon={Sprout} label="50米跑" value={`${fitnessMetrics.run} s`} /><FitnessCell icon={PenLine} label="坐位体前屈" value={`${(fitnessMetrics.weight / 2).toFixed(1)} cm`} /><FitnessCell icon={Sprout} label="立定跳远" value={`${fitnessMetrics.rope + 30} cm`} /><FitnessCell icon={HeartPulse} label="1分钟跳绳" value={`${fitnessMetrics.rope} 次`} /><FitnessCell icon={MessageCircle} label="视力" value="5.0" /></div></div></Section>
      </div>

      <Section icon={Trophy} title="本学期获得荣誉记录" aside="点亮青春　榜样同行" className="mt-3 min-h-[138px]"><div className="grid grid-cols-1 gap-3 px-3 pb-4 pt-3 sm:grid-cols-2 sm:gap-4 sm:px-5">{latestHonors.length > 0 ? latestHonors.map((honor) => <div key={honor.id} className="flex min-h-[54px] items-center justify-center gap-2 rounded-xl border-2 border-[#f4a638] bg-[#fffaf0] px-3 text-center text-base font-bold text-[#805313] sm:gap-3 sm:px-4 sm:text-[19px]"><Trophy className="size-6 shrink-0 text-[#dc971e] sm:size-8" aria-hidden="true" />{honor.honorName}</div>) : <div className="rounded-xl border border-dashed border-[#efc16b] px-4 py-4 text-center text-sm text-[#b37b32] sm:col-span-2">本学期暂无荣誉记录</div>}</div></Section>

      <Section icon={CalendarDays} title="参加校内活动记录与成果" aside="学生填写的活动成果" className="mt-3 min-h-[257px]"><div className="space-y-2 px-3 pb-4 pt-3 sm:px-4">{latestActivities.length > 0 ? latestActivities.map((activity, index) => { const Icon = ACTIVITY_ICONS[index % ACTIVITY_ICONS.length]; return <div key={activity.id} className="grid grid-cols-[32px_minmax(0,1fr)] items-center gap-2 rounded-xl border border-[#c4e4fa] bg-white/75 px-2.5 py-2.5 sm:grid-cols-[50px_1.05fr_150px_1.45fr] sm:gap-3 sm:px-3"><Icon className="size-6 text-[#087fc5] sm:size-8" strokeWidth={1.8} aria-hidden="true" /><p className="truncate text-sm font-bold text-[#15529b] sm:text-[16px]">{activity.title}</p><p className="col-start-2 text-xs font-semibold tabular-nums text-[#357db7] sm:col-auto sm:text-[15px]">{activity.startDate.slice(0, 10)}</p><p className="col-start-2 line-clamp-2 text-xs leading-5 text-[#3979b4] sm:col-auto sm:text-[14px]">“我和同学完成了活动实践，在参与中学会协作，也更愿意主动解决问题。”</p></div> }) : <p className="rounded-xl border border-dashed border-[#b9dbfa] px-3 py-6 text-center text-sm">本学期暂无活动记录</p>}</div></Section>

      <Section icon={BookOpenText} title="各科期末总评等第" aside="求真笃学　知行合一" className="mt-3"><div className="overflow-x-auto px-3 pb-4 pt-3 sm:px-4"><table className="w-full min-w-[280px] overflow-hidden rounded-xl border border-[#9cc9ea] text-xs sm:text-[16px]"><caption className="sr-only">{student.name}本学期各科总评等第</caption><thead className="bg-[#b9dcf4] text-[#15529b]"><tr><th className="px-2 py-1.5 text-center font-bold sm:px-3">科目</th><th className="px-2 py-1.5 text-center font-bold sm:px-3">总评等第</th></tr></thead><tbody>{academicScores.map((score, index) => <tr key={score.subject} className={cn("border-t border-[#c1dff4]", index % 2 === 1 && "bg-[#eef8ff")}><th className="px-2 py-1 text-center font-semibold sm:px-3">{score.subject}</th><td className="px-2 py-1 text-center font-semibold text-[#0784cc] sm:px-3">{score.grade}</td></tr>)}</tbody></table></div></Section>

      <Section icon={MessageCircle} title="班主任评语" className="mt-3 min-h-[160px]"><div className="relative px-3 pb-5 pt-2 sm:px-5"><p className="max-w-full text-sm font-semibold leading-6 text-[#286aa8] sm:max-w-[86%] sm:text-[16px] sm:leading-7">{comment}</p><div className="mt-2 flex flex-wrap items-center justify-end gap-3 text-xs font-semibold text-[#174d91] sm:gap-8 sm:text-[15px]"><span>班主任　<strong className="text-lg sm:text-[23px]">{homeroomTeacher || "李老师"}</strong></span><span>{semesterLabel.split(" ").slice(-1)[0] || "2026年1月16日"}</span></div></div></Section>

      <footer className="relative mt-0 h-20 overflow-hidden border-t border-[#bddcf4] text-center sm:h-[120px]"><img src={`${ASSET_ROOT}/report-footer-background.png`} alt="报告单底部校园与城市背景" width={858} height={120} loading="lazy" className="absolute inset-0 size-full object-cover" /></footer>
    </div>
  </article>
}
