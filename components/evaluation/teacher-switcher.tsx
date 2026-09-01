"use client"

import { ChevronDown, HeartHandshake, UserRoundCog } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useEvaluation } from "@/lib/evaluation-context"
import { cn } from "@/lib/utils"
import type { CurrentUser, ParentUser, TeacherRole } from "@/lib/types"

const ROLE_STYLES: Record<TeacherRole, { label: string; className: string }> = {
  homeroom: { label: "班主任", className: "bg-brand-blue/15 text-brand-blue" },
  subject: { label: "任课教师", className: "bg-brand-blue/15 text-brand-blue" },
  pe_teacher: { label: "体育老师", className: "bg-brand-green/15 text-brand-green" },
  grade_leader: { label: "年级组长", className: "bg-brand-green/15 text-brand-green" },
  director: { label: "管理员", className: "bg-brand-orange/15 text-brand-orange" },
}

function userLabel(user: CurrentUser): { name: string; sub: string; tag?: string; tagClass?: string } {
  if (user.kind === "parent") {
    const first = user.children[0]
    const sub =
      user.children.length > 1
        ? `${user.children.length} 个孩子的家长`
        : first
          ? `${first.name}的家长`
          : "家长"
    return { name: user.name, sub, tag: "家长", tagClass: "bg-brand-green/15 text-brand-green" }
  }
  const style = ROLE_STYLES[user.role] ?? ROLE_STYLES.subject
  return { name: user.name, sub: user.title, tag: style.label, tagClass: style.className }
}

export function TeacherSwitcher() {
  const { teachers, parentUsers, currentUser, setCurrentUser } = useEvaluation()
  const { name, sub } = userLabel(currentUser)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl px-2 py-1 text-left transition hover:bg-accent/60"
          />
        }
      >
        <Avatar className="size-8 border border-border/60">
          <AvatarFallback
            className={cn(
              "text-xs font-semibold",
              currentUser.kind === "parent"
                ? "bg-brand-green/15 text-brand-green"
                : "bg-primary/15 text-primary",
            )}
          >
            {name.slice(-2)}
          </AvatarFallback>
        </Avatar>
        <div className="hidden flex-col leading-tight sm:flex">
          <span className="text-sm font-semibold text-foreground">{name}</span>
          <span className="text-[11px] text-muted-foreground">{sub}</span>
        </div>
        <ChevronDown className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="glass-surface w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
            <UserRoundCog className="size-3.5" />
            切换身份（演示用）
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {teachers.map((teacher) => {
            const roleStyle = ROLE_STYLES[teacher.role]
            const active = currentUser.kind !== "parent" && currentUser.id === teacher.id
            return (
              <DropdownMenuItem
                key={teacher.id}
                onClick={() => setCurrentUser(teacher as CurrentUser)}
                className={cn("flex items-center gap-3 py-2", active && "bg-accent/70")}
              >
                <Avatar className="size-8 border border-border/60">
                  <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                    {teacher.name.slice(-2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-1 flex-col">
                  <span className="text-sm font-medium text-foreground">{teacher.name}</span>
                  <span className="text-xs text-muted-foreground">{teacher.title}</span>
                </div>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", roleStyle.className)}>
                  {roleStyle.label}
                </span>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
            <HeartHandshake className="size-3.5" />
            家长身份
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {parentUsers.map((pu: ParentUser) => {
            const active = currentUser.kind === "parent" && currentUser.id === pu.id
            const subLabel =
              pu.children.length > 1
                ? `${pu.children.length} 个孩子的家长`
                : `${pu.children[0]?.name ?? ""}的家长`
            return (
              <DropdownMenuItem
                key={pu.id}
                onClick={() => setCurrentUser(pu as CurrentUser)}
                className={cn("flex items-center gap-3 py-2", active && "bg-accent/70")}
              >
                <Avatar className="size-8 border border-border/60">
                  <AvatarFallback className="bg-brand-green/20 text-brand-green text-xs font-semibold">
                    {pu.name.slice(-2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-1 flex-col">
                  <span className="text-sm font-medium text-foreground">{pu.name}</span>
                  <span className="text-xs text-muted-foreground">{subLabel}</span>
                </div>
                <span className="rounded-full bg-brand-green/15 px-2 py-0.5 text-[11px] font-medium text-brand-green">
                  家长
                </span>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
