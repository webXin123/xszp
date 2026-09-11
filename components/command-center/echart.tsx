"use client"

import { memo, useEffect, useRef } from "react"
import * as echarts from "echarts"
import type { EChartsOption } from "echarts"

type EChartProps = {
  option: EChartsOption
  ariaLabel: string
  className?: string
}

export const EChart = memo(function EChart({ option, ariaLabel, className }: EChartProps) {
  const elementRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const chart = echarts.getInstanceByDom(element) ?? echarts.init(element, undefined, { renderer: "canvas" })
    chartRef.current = chart

    const resizeObserver = new ResizeObserver(() => chart.resize())
    resizeObserver.observe(element)

    return () => {
      resizeObserver.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: true, lazyUpdate: true })
  }, [option])

  return <div ref={elementRef} className={className} role="img" aria-label={ariaLabel} />
})
