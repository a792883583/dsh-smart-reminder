/**
 * dsh-smart-reminder 浏览器客户端入口：
 * 挂载到左侧侧边栏（位于「消息平台」下方），点击打开现代全屏日历看板与提醒管理器。
 * 注入 locale 服务，实现全生命周期零闪烁跟随 DSH Web 当前语言。
 * @module dsh-smart-reminder/client
 */

import { createElement, useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'
import { ReminderApi } from './api.ts'
import { CalendarView } from './CalendarView.tsx'
import { CalendarClockIcon } from './icons.tsx'
import { initI18n, t, useActiveLang } from './i18n.ts'

interface ReminderClientContext {
  effect(fn: () => (() => void) | void, name: string): void
  locale?: {
    getLocale(): { active: string }
    subscribe(fn: () => void): () => void
  }
}

export const inject = ['locale']

const BUTTON_STYLE = `
/* 日历入口按钮。样式严格对齐官方 workspace 插件的 searchButton：
   wide（宽栏）28x28 / border-radius:50% / color:var(--dsw-alias-label-secondary)
   rail（收起）36x36 / border-radius:50% / color:var(--dsw-alias-label-primary)
   hover 背景统一用官方 --dsw-alias-interactive-bg-hover。 */
.dsh-rem-open {
  display:inline-flex; align-items:center; justify-content:center;
  width:28px; height:28px; flex:none; padding:0; margin:0;
  border:none; background:transparent; color:var(--dsw-alias-label-secondary);
  cursor:pointer; border-radius:50%; box-sizing:border-box;
  transition: background 0.15s ease, color 0.15s ease;
}
.dsh-rem-open:hover { background:var(--dsw-alias-interactive-bg-hover); }
.dsh-rem-open:focus-visible { outline:2px solid var(--dsw-alias-label-primary); outline-offset:1px; }
.dsh-rem-open svg { display:block; }

/* host 作为 flex 项：用 auto 左边距吸收剩余空间（searchSlot 的 auto 已被下面
   这条让出），从而紧贴搜索图标左侧。 */
[data-reminder-host] { display:flex; align-items:center; flex:none; margin-left:auto; }
[data-reminder-host] + [class*="searchSlot"] { margin-left:0 !important; }

/* 搜索展开时隐藏日历按钮（官方此时会隐藏标题与右侧动作组）。 */
[class*="sectionHeader"]:has([class*="searchSlotExpanded"]) [data-reminder-host] { display:none; }

/* rail（侧边栏收起）模式：官方把按钮放大到 36x36 并改用 primary 色，
   日历按钮跟随同样规格，否则会比相邻图标小一圈、颜色也偏淡。 */
[class*="rail"] [data-reminder-host] { margin:0 0 12px; }
[class*="rail"] .dsh-rem-open { width:36px; height:36px; color:var(--dsw-alias-label-primary); }
[class*="rail"] .dsh-rem-open svg { width:18px; height:18px; }

/* 悬停提示：官方图标有样式化 tooltip，这里用 portal 渲染同款浮层。
   必须 portal 到 body——sectionHeader 带 overflow:hidden，留在原地的
   浮层会被裁掉；fixed 定位 + 高 z-index 保证压在侧边栏之上。 */
.dsh-rem-tip {
  position:fixed; z-index:9999; pointer-events:none; white-space:nowrap;
  padding:4px 8px; border-radius:6px; font-size:12px; line-height:1.4;
  /* 侧边栏 tooltip 官方 token：浅色 #f5f6f7（浅底深字）、深色 #353638（深底浅字）。
     此前误用不存在的 --dsw-alias-bg-elevated → 回退白底，深色模式下不可见。 */
  background:var(--dsw-specific-tip, #f5f6f7);
  color:var(--dsw-alias-label-primary, #0f1115);
  border:1px solid var(--dsw-alias-border-l4, rgba(128,128,128,0.28));
  box-shadow:0 4px 12px rgba(0,0,0,0.12);
}
`

let styleInjected = false
function ensureButtonStyle(): void {
  if (styleInjected) return
  styleInjected = true
  const tag = document.createElement('style')
  tag.dataset.plugin = 'dsh-smart-reminder-btn'
  tag.textContent = BUTTON_STYLE
  document.head.appendChild(tag)
}

function ReminderApp(props: { api: ReminderApi }): React.ReactElement {
  const { api } = props
  const lang = useActiveLang()
  const [open, setOpen] = useState(false)
  const [tip, setTip] = useState<{ left: number; top: number; transform: string } | null>(null)
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const close = useCallback((): void => setOpen(false), [])
  ensureButtonStyle()

  const label = t('app.title', lang)

  /**
   * 计算提示浮层位置。
   * 宽栏：按钮下方居中；收起（rail）：按钮右侧垂直居中（窄栏里向下会压住下一个图标）。
   */
  const showTip = useCallback((): void => {
    const el = btnRef.current
    if (el === null) return
    const r = el.getBoundingClientRect()
    const inRail = el.closest('[class*="rail"]') !== null
    if (inRail) {
      setTip({ left: r.right + 8, top: r.top + r.height / 2, transform: 'translateY(-50%)' })
    } else {
      setTip({ left: r.left + r.width / 2, top: r.bottom + 6, transform: 'translateX(-50%)' })
    }
  }, [])

  const hideTip = useCallback((): void => setTip(null), [])

  return createElement(
    'div',
    null,
    createElement(
      'button',
      {
        ref: btnRef,
        type: 'button',
        className: 'dsh-rem-open',
        'aria-label': label,
        onClick: () => setOpen(true),
        onMouseEnter: showTip,
        onMouseLeave: hideTip,
        onFocus: showTip,
        onBlur: hideTip,
      },
      createElement(CalendarClockIcon, { size: 16 }),
    ),
    tip !== null
      ? createPortal(
        createElement(
          'div',
          {
            className: 'dsh-rem-tip',
            role: 'tooltip',
            style: { left: tip.left, top: tip.top, transform: tip.transform },
          },
          label,
        ),
        document.body,
      )
      : null,
    open ? createElement(CalendarView, { api, onClose: close }) : null,
  )
}

export function apply(ctx: ReminderClientContext): void {
  try {
    initI18n(ctx.locale)
  } catch {}

  ctx.effect(() => {
    const host = document.createElement('div')
    host.dataset.reminderHost = ''
    const root: Root = createRoot(host)
    const api = new ReminderApi()
    let disposed = false

    const render = (): void => {
      if (disposed) return
      root.render(createElement(ReminderApp, { api }))
    }

    /**
     * 当前该挂到哪儿：返回期望的前一个兄弟节点的「父容器 + 锚点」。
     * 宽栏用 searchSlot；收起（rail）用搜索按钮所在的 .search 容器。
     */
    const resolveAnchor = (): HTMLElement | null => {
      const searchSlot = document.querySelector<HTMLElement>('[class*="searchSlot"]')
      if (searchSlot !== null) return searchSlot
      const searchBtn = document.querySelector<HTMLElement>('[class*="searchButton"]')
      return searchBtn?.parentElement ?? null
    }

    /**
     * host 当前是否已挂在正确位置。
     * 侧边栏在宽栏 ↔ 收起之间切换时锚点会变（rail 模式官方不渲染 searchSlot），
     * 因此不能只看 isConnected，还要确认它紧挨着当前锚点。
     */
    const isPlacedCorrectly = (): boolean => {
      if (!host.isConnected) return false
      const anchor = resolveAnchor()
      if (anchor === null) return false
      return host.nextElementSibling === anchor
    }

    const mount = (): boolean => {
      if (isPlacedCorrectly()) return true

      // 清理历史 host：hot-reload / 多次挂载会产生多个 host 同时挂在 DOM 上，
      // 它们互相挤位置导致看起来按钮跑到了奇怪的地方。
      document.querySelectorAll<HTMLElement>('[data-reminder-host]').forEach((node) => {
        if (node !== host) node.remove()
      })

      const anchor = resolveAnchor()
      if (anchor === null || anchor.parentElement === null) {
        // 找不到可靠锚点就不挂载，等轮询重试。不做 DOM 猜测——
        // 曾用 [class*="title"] 之类启发式匹配，结果把入口挂到了主区工具栏。
        return false
      }
      anchor.before(host)
      render()
      return true
    }

    let polling = true
    const poll = (): void => {
      if (disposed) return
      if (mount()) {
        polling = false
        return
      }
      if (polling) {
        requestAnimationFrame(poll)
      }
    }
    requestAnimationFrame(poll)

    const timer = window.setInterval(() => {
      if (disposed) return
      // 位置错了也要重挂（宽栏 ↔ 收起 切换后锚点会变）。
      if (!isPlacedCorrectly()) mount()
    }, 1000)

    return () => {
      disposed = true
      polling = false
      window.clearInterval(timer)
      try { root.unmount() } catch {}
      host.remove()
    }
  }, 'dsh-smart-reminder: client nav button & calendar')
}
