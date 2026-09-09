"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface MultiSelectDropdownItem {
  id: string
  name: string
}

interface MultiSelectDropdownProps {
  label: string
  description?: string
  items: MultiSelectDropdownItem[]
  selectedIds: string[]
  onToggle: (id: string) => void
  disabled?: boolean
  emptyMessage?: string
  required?: boolean
}

function MultiSelectDropdown({
  label,
  description,
  items,
  selectedIds,
  onToggle,
  disabled = false,
  emptyMessage = "暂无可选项",
  required = true,
}: MultiSelectDropdownProps) {
  const id = React.useId().replace(/:/g, "")
  const selectedNames = items
    .filter((item) => selectedIds.includes(item.id))
    .map((item) => item.name)
  const selectionText = selectedNames.length > 0 ? selectedNames.join("、") : `请选择${label.replace("面向", "")}`

  return (
    <div className="flex flex-col gap-1.5">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {description && <p id={`${id}-description`} className="sr-only">{description}</p>}
      <Popover>
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label={`选择${label}`}
              aria-describedby={description ? `${id}-description` : undefined}
              disabled={disabled}
              className={cn(
                "group flex h-10 w-full items-center justify-between gap-2 rounded-md border px-2.5 text-left text-sm font-normal transition-[border-color,box-shadow,background-color] duration-150 outline-none",
                disabled
                  ? "cursor-not-allowed border-[#e0e4ea] bg-[#f5f6f8] text-muted-foreground"
                  : "border-[#cfd5df] bg-white text-[#30343b] hover:border-[#8ebcf6] focus-visible:border-[#1685f8] focus-visible:ring-2 focus-visible:ring-[#1685f8]/20 data-[popup-open]:border-[#1685f8] data-[popup-open]:ring-2 data-[popup-open]:ring-[#1685f8]/20",
              )}
            />
          }
        >
          <span className={cn("min-w-0 truncate", selectedNames.length === 0 && "text-[#9aa1ac]")}>{selectionText}</span>
          <ChevronDown className="size-4 shrink-0 text-[#a8afba] transition-transform duration-150 group-data-[popup-open]:rotate-180" aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--anchor-width) min-w-36 rounded-lg border border-[#edf0f4] bg-white p-1 shadow-[0_5px_14px_rgba(31,41,55,0.14)]">
          {items.length > 0 ? (
            <div className="max-h-56 overflow-y-auto">
              {items.map((item) => {
                const checked = selectedIds.includes(item.id)
                return (
                  <label
                    key={item.id}
                    htmlFor={`${id}-${item.id}`}
                    className={cn(
                      "group/field flex min-h-8 cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-normal transition-colors",
                      checked
                        ? "bg-[#f3f4f6] text-[#30343b]"
                        : "text-[#4b5563] hover:bg-[#f3f4f6] hover:text-[#30343b]",
                    )}
                  >
                    <Checkbox id={`${id}-${item.id}`} name={id} checked={checked} onCheckedChange={() => onToggle(item.id)} />
                    <span className="min-w-0 truncate">{item.name}</span>
                  </label>
                )
              })}
            </div>
          ) : (
            <p className="px-2.5 py-2 text-sm text-[#9aa1ac]">{emptyMessage}</p>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}

export { MultiSelectDropdown }
