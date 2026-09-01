"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * 消息记录类列表的「上拉加载更多」交互：
 * 初始展示 pageSize 条，滚动到容器底部附近时自动加载下一批。
 */
export function useLoadMore<T>(items: T[], pageSize = 8) {
  const [visibleCount, setVisibleCount] = useState(pageSize)

  // 数据源变化（如筛选、身份切换）时重置为初始数量
  useEffect(() => {
    setVisibleCount(pageSize)
  }, [items, pageSize])

  const visible = items.slice(0, visibleCount)
  const hasMore = visibleCount < items.length

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => prev + pageSize)
  }, [pageSize])

  return { visible, hasMore, loadMore, total: items.length }
}

/**
 * 检测滚动容器触底的处理器，配合 useLoadMore 使用。
 * threshold：距底部多少像素时触发加载。
 */
export function useScrollLoadMore(
  hasMore: boolean,
  loadMore: () => void,
  threshold = 60,
) {
  const loadingRef = useRef(false)

  const onScroll = useCallback(
    (e: React.UIEvent<HTMLElement>) => {
      if (!hasMore) return
      const el = e.currentTarget
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight
      if (distance < threshold && !loadingRef.current) {
        loadingRef.current = true
        loadMore()
        // 重置标记，允许下次触发
        requestAnimationFrame(() => {
          loadingRef.current = false
        })
      }
    },
    [hasMore, loadMore, threshold],
  )

  return { onScroll }
}
