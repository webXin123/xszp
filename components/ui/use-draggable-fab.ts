"use client"

import { useCallback, useRef, useState } from "react"

interface DraggableFabOptions {
  size?: number
  mobileRight?: number
  mobileBottom?: number
}

const MOBILE_QUERY = "(max-width: 1023px)"

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

/** Shared pointer-drag behavior for floating actions, with viewport-safe mobile bounds. */
export function useDraggableFab({
  size = 52,
  mobileRight = 16,
  mobileBottom = 84,
}: DraggableFabOptions = {}) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef({ pointerId: -1, startX: 0, startY: 0, offsetX: 0, offsetY: 0 })
  const movedRef = useRef(false)

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    movedRef.current = false
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    }
    setDragging(true)
  }, [offset.x, offset.y])

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!dragging || drag.pointerId !== event.pointerId) return
    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY
    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) movedRef.current = true

    let nextX = drag.offsetX + deltaX
    let nextY = drag.offsetY + deltaY
    if (window.matchMedia(MOBILE_QUERY).matches) {
      nextX = clamp(nextX, -(window.innerWidth - mobileRight - size - 8), mobileRight - 8)
      nextY = clamp(nextY, -(window.innerHeight - mobileBottom - size - 8), mobileBottom - 8)
    }
    setOffset({ x: nextX, y: nextY })
  }, [dragging, mobileBottom, mobileRight, size])

  const onPointerUp = useCallback((event?: React.PointerEvent<HTMLElement>) => {
    if (event && dragRef.current.pointerId !== event.pointerId) return
    setDragging(false)
    dragRef.current.pointerId = -1
  }, [])

  const consumeClick = useCallback(() => {
    if (!movedRef.current) return false
    movedRef.current = false
    return true
  }, [])

  return { offset, dragging, consumeClick, onPointerDown, onPointerMove, onPointerUp }
}
