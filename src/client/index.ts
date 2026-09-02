/**
 * dsh-smart-reminder 浏览器客户端入口：
 * 挂载到左侧侧边栏（位于「消息平台」下方），点击打开现代全屏日历看板与提醒管理器。
 * @module dsh-smart-reminder/client
 */

import { createElement, useCallback, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ReminderApi } from './api.ts'
import { CalendarView } from './CalendarView.tsx'
import { CalendarClockIcon } from './icons.tsx'

interface ReminderClientContext {
  effect(fn: () => (() => void) | void, name: string): void
  locale?: {
    getLocale(): { active: string }
    subscribe(fn: () => void): () => void
  }
}

export const inject = ['locale']

const BUTTON_STYLE = `
.dsh-rem-open { display:flex; align-items:center; gap:8px; width:100%; padding:8px 12px;
  border:none; background:transparent; color:inherit; cursor:pointer;
  font-size:12px; font-weight:500; border-radius:8px; margin-top:2px; box-sizing:border-box; }
.dsh-rem-open:hover { background:rgba(128,128,128,0.1); }
.dsh-rem-open .icon { font-size:15px; flex:none; display:flex; align-items:center; justify-content:center; }
.dsh-rem-open .label { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis;
  white-space:nowrap; text-align:left; }
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
  const [open, setOpen] = useState(false)
  const close = useCallback((): void => setOpen(false), [])
  ensureButtonStyle()

  return createElement(
    'div',
    null,
    createElement(
      'button',
      { type: 'button', className: 'dsh-rem-open', title: '智能提醒与农历日历', onClick: () => setOpen(true) },
      createElement('span', { className: 'icon' }, createElement(CalendarClockIcon, { size: 15 })),
      createElement('span', { className: 'label' }, '智能提醒日历'),
    ),
    open ? createElement(CalendarView, { api, onClose: close }) : null,
  )
}

export function apply(ctx: ReminderClientContext): void {
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

    // 挂载逻辑：支持多种选择器，持续重试
    const mount = (): boolean => {
      if (host.isConnected) return true

      // 1. 尝试直接挂在 [data-gateway-host] 下方（消息平台正下方）
      const gwHost = document.querySelector<HTMLElement>('[data-gateway-host]')
      if (gwHost !== null && gwHost.parentElement !== null) {
        gwHost.after(host)
        render()
        return true
      }

      // 2. 尝试挂在「消息平台」按钮外层容器
      const gwBtn = document.querySelector<HTMLElement>('.dsh-gw-open')
      if (gwBtn !== null && gwBtn.parentElement !== null && gwBtn.parentElement.parentElement !== null) {
        gwBtn.parentElement.after(host)
        render()
        return true
      }

      // 3. 兜底：挂在「新会话」按钮下方
      const newSessionBtn = document.querySelector<HTMLElement>('[class*="newSession"]')
      if (newSessionBtn !== null && newSessionBtn.parentElement !== null) {
        newSessionBtn.after(host)
        render()
        return true
      }

      return false
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
      if (!host.isConnected) {
        mount()
      }
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
