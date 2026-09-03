/**
 * 现代全屏日历看板与智能提醒管理页面。
 * 深度国际化（支持中文 zh、英语 en、西班牙语 es 动态自适应）。
 * 完整特性：农历/国际节日自适应、即时搜索、状态筛选(All/Pending/Done)、优先级标色、
 * 月度统计概览、全键盘快捷键 (Esc/Cmd+K/←/→)、一键撤销 (Undo)、iCal 导出。
 * 
 * 核心升级：【到期强提醒悬浮卡片 + 系统蜂鸣音】
 * 彻底解决 macOS 系统勿扰模式、专注模式或 TCC 权限静默导致无法弹出横幅的问题：
 * 只要 DSH Web 网页开着，到点/测试时，页面右上角会立即弹出【高亮提醒悬浮卡片】，并伴随蜂鸣提示音，100% 绝对看得见！
 * @module dsh-smart-reminder/client/CalendarView
 */

import { createElement, Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import type { ReminderItem } from '../core/types.ts'
import { getLunarInfo } from '../core/lunar.ts'
import type { ReminderApi } from './api.ts'
import { CalendarClockIcon } from './icons.tsx'
import { detectLanguage, t, GLOBAL_SOLAR_FESTIVALS, type Lang } from './i18n.ts'

const COMMON_TIME_PRESETS = [
  { label: '09:00', time: '09:00' },
  { label: '11:30', time: '11:30' },
  { label: '14:00', time: '14:00' },
  { label: '16:30', time: '16:30' },
  { label: '18:00', time: '18:00' },
  { label: '20:00', time: '20:00' },
]

const MONTH_NAMES_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_NAMES_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const ANIMATION_STYLES = `
@keyframes dshFadeIn {
  from { opacity: 0; transform: scale(0.97) translateY(6px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes dshOverlayFade {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes dshModalPop {
  0% { opacity: 0; transform: scale(0.94) translateY(8px); }
  60% { transform: scale(1.01) translateY(-1px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes dshToastSlide {
  from { opacity: 0; transform: translate(-50%, 12px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}
@keyframes dshPopupSlideIn {
  from { opacity: 0; transform: translateX(50px) scale(0.95); }
  to { opacity: 1; transform: translateX(0) scale(1); }
}

.dsh-rem-cell {
  box-sizing: border-box !important;
  transition: transform 0.14s cubic-bezier(0.4, 0, 0.2, 1),
              background-color 0.16s ease,
              border-color 0.16s ease,
              box-shadow 0.16s ease;
}
.dsh-rem-cell:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  z-index: 2;
}

.dsh-rem-card {
  box-sizing: border-box !important;
  transition: transform 0.14s ease, box-shadow 0.14s ease, border-color 0.14s ease;
}
.dsh-rem-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.06);
}

.dsh-btn-smooth {
  transition: all 0.14s cubic-bezier(0.4, 0, 0.2, 1);
}
.dsh-btn-smooth:hover {
  transform: translateY(-1px);
  filter: brightness(1.06);
}
.dsh-btn-smooth:active {
  transform: translateY(1px) scale(0.98);
}
`

let animStyleInjected = false
function ensureAnimStyles(): void {
  if (animStyleInjected) return
  animStyleInjected = true
  const tag = document.createElement('style')
  tag.dataset.plugin = 'dsh-smart-reminder-animations'
  tag.textContent = ANIMATION_STYLES
  document.head.appendChild(tag)
}

/** 播放优雅清脆的提醒铃声 (Web Audio API) */
function playReminderAudio(): void {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    const now = ctx.currentTime

    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(587.33, now) // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.3) // A5

    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(880, now) // A5
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.3) // D6

    gain.gain.setValueAtTime(0.3, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(ctx.destination)

    osc1.start(now)
    osc2.start(now)
    osc1.stop(now + 0.8)
    osc2.stop(now + 0.8)
  } catch {}
}

/** 全方位检测 DSH Web 是否处于深色模式 */
function detectDshDarkTheme(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return true

  const doc = document.documentElement
  const body = document.body
  const candidates = [
    doc.getAttribute('data-theme'),
    doc.getAttribute('data-ds-dark-theme'),
    body?.getAttribute('data-theme'),
    doc.className,
    body?.className,
  ]

  for (const c of candidates) {
    if (typeof c === 'string') {
      if (c.includes('dark') || c === 'dark') return true
      if (c.includes('light') || c === 'light') return false
    }
  }

  try {
    const bgElem = document.querySelector('[class*="sidebar"], [class*="layout"], body')
    if (bgElem) {
      const bg = window.getComputedStyle(bgElem).backgroundColor
      const rgb = bg.match(/\d+/g)
      if (rgb && rgb.length >= 3) {
        const luma = 0.299 * Number(rgb[0]) + 0.587 * Number(rgb[1]) + 0.114 * Number(rgb[2])
        return luma < 128
      }
    }
  } catch {}

  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function CalendarView(props: { api: ReminderApi; onClose: () => void; localeStr?: string }): React.ReactElement {
  const { api, onClose, localeStr } = props
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [items, setItems] = useState<ReminderItem[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateKey(new Date()))

  // 语言环境（zh / en / es）
  const [lang, setLang] = useState<Lang>(() => detectLanguage(localeStr))

  // 搜索与过滤
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all')

  // 撤销删除缓存 (Undo)
  const [deletedCache, setDeletedCache] = useState<ReminderItem | null>(null)

  // 网页端高亮悬浮提醒横幅
  const [activePopup, setActivePopup] = useState<{ title: string; desc?: string; time: string; id: string } | null>(null)

  ensureAnimStyles()

  // 监听深浅色模式与主题变化
  const [isDark, setIsDark] = useState(detectDshDarkTheme)

  useEffect(() => {
    const updateTheme = () => {
      setIsDark(detectDshDarkTheme())
    }

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', updateTheme)

    const mo = new MutationObserver(() => {
      updateTheme()
      const docLang = document.documentElement.getAttribute('lang')
      if (docLang) setLang(detectLanguage(docLang))
    })
    mo.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['data-theme', 'class', 'lang', 'style'] })

    const interval = setInterval(updateTheme, 800)

    return () => {
      mq.removeEventListener('change', updateTheme)
      mo.disconnect()
      clearInterval(interval)
    }
  }, [])

  // 编辑/新增弹窗
  const [editingItem, setEditingItem] = useState<{
    id?: string
    title: string
    date: string
    time: string
    description: string
    priority: 'high' | 'medium' | 'low'
    repeat: 'none' | 'daily' | 'weekly' | 'monthly'
    notifySystem: boolean
  } | null>(null)

  const [toastMsg, setToastMsg] = useState<{ text: string; showUndo?: boolean } | null>(null)

  const loadItems = useCallback(async () => {
    const list = await api.getList()
    setItems(list)
  }, [api])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  // 前端到期检测（当页面打开时实时触发提醒弹窗与声音）
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now()
      const due = items.find((i) => i.status === 'pending' && i.dueAt <= now)
      if (due && (!activePopup || activePopup.id !== due.id)) {
        playReminderAudio()
        setActivePopup({
          id: due.id,
          title: due.title,
          desc: due.description,
          time: due.dueTimeStr,
        })
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [items, activePopup])

  const showToast = (text: string, showUndo = false) => {
    setToastMsg({ text, showUndo })
    setTimeout(() => setToastMsg(null), 4000)
  }

  const prevMonth = useCallback(() => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }, [])
  const nextMonth = useCallback(() => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }, [])
  const todayMonth = useCallback(() => {
    const now = new Date()
    setCurrentDate(now)
    setSelectedDate(formatDateKey(now))
  }, [])

  // 全键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activePopup) {
        if (e.key === 'Escape' || e.key === 'Enter') setActivePopup(null)
        return
      }
      if (editingItem) {
        if (e.key === 'Escape') setEditingItem(null)
        return
      }
      if (e.key === 'Escape') {
        onClose()
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setEditingItem({
          title: '',
          date: selectedDate,
          time: '09:00',
          description: '',
          priority: 'medium',
          notifySystem: true,
          repeat: 'none',
        })
      } else if (e.key === 'ArrowLeft' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        prevMonth()
      } else if (e.key === 'ArrowRight' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        nextMonth()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editingItem, activePopup, onClose, prevMonth, nextMonth, selectedDate])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1

  // 计算当月日历网格
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay()
  const totalDays = new Date(year, month, 0).getDate()
  const prevMonthDays = new Date(year, month - 1, 0).getDate()

  const calendarCells = []
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const pDay = prevMonthDays - i
    const pMonth = month - 1 === 0 ? 12 : month - 1
    const pYear = month - 1 === 0 ? year - 1 : year
    const pDateKey = `${pYear}-${String(pMonth).padStart(2, '0')}-${String(pDay).padStart(2, '0')}`
    calendarCells.push({ day: pDay, isCurrentMonth: false, dateKey: pDateKey, year: pYear, month: pMonth })
  }
  for (let d = 1; d <= totalDays; d++) {
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    calendarCells.push({ day: d, isCurrentMonth: true, dateKey, year, month })
  }
  const targetTotalCells = calendarCells.length <= 35 ? 35 : 42
  const remaining = targetTotalCells - calendarCells.length
  for (let d = 1; d <= remaining; d++) {
    const nMonth = month + 1 > 12 ? 1 : month + 1
    const nYear = month + 1 > 12 ? year + 1 : year
    const nDateKey = `${nYear}-${String(nMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    calendarCells.push({ day: d, isCurrentMonth: false, dateKey: nDateKey, year: nYear, month: nMonth })
  }

  // 选中的日期的提醒列表
  const selectedDateItems = useMemo(() => {
    return items.filter((i) => {
      if (!i.dueTimeStr.startsWith(selectedDate)) return false
      if (statusFilter === 'pending' && i.status !== 'pending') return false
      if (statusFilter === 'completed' && i.status !== 'completed') return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return i.title.toLowerCase().includes(q) || (i.description && i.description.toLowerCase().includes(q))
      }
      return true
    })
  }, [items, selectedDate, statusFilter, searchQuery])

  // 本月统计
  const monthStats = useMemo(() => {
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`
    const mItems = items.filter((i) => i.dueTimeStr.startsWith(monthPrefix) && i.status !== 'canceled')
    const total = mItems.length
    const completed = mItems.filter((i) => i.status === 'completed').length
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0
    return { total, completed, rate }
  }, [items, year, month])

  const formattedMonthTitle = useMemo(() => {
    if (lang === 'en') return `${MONTH_NAMES_EN[month - 1]} ${year}`
    if (lang === 'es') return `${MONTH_NAMES_ES[month - 1]} de ${year}`
    return `${year} 年 ${month} 月`
  }, [year, month, lang])

  const missedItems = items.filter((i) => i.isMissedCatchup && i.status !== 'completed')

  // 保存提醒
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem?.title || !editingItem.date || !editingItem.time) {
      showToast('请完整填写标题和时间 / Please fill title and time')
      return
    }

    const dueTimeStr = `${editingItem.date} ${editingItem.time}`
    const dueAt = new Date(dueTimeStr.replace(/-/g, '/')).getTime()
    if (isNaN(dueAt)) {
      showToast('时间格式不正确 / Invalid time format')
      return
    }

    const payload: Partial<ReminderItem> = {
      id: editingItem.id,
      title: editingItem.title,
      description: editingItem.description,
      dueTimeStr,
      dueAt,
      priority: editingItem.priority || 'medium',
      repeat: editingItem.repeat,
      notifySystem: editingItem.notifySystem,
    }
    const res = await api.save(payload)
    if (res) {
      showToast(t('toast.saved', lang))
      setEditingItem(null)
      void loadItems()
    }
  }

  // 打勾完成切换
  const handleToggleComplete = async (id: string) => {
    const res = await api.toggleComplete(id)
    if (res) {
      showToast(res.status === 'completed' ? '🎉 ' + t('status.completed', lang) : '↩️ ' + t('status.pending', lang))
      void loadItems()
    }
  }

  // 一键推迟
  const handleSnooze = async (id: string, minutes: number, label: string) => {
    const res = await api.snooze(id, minutes)
    if (res) {
      showToast(`${t('toast.snoozed', lang)} ${label}`)
      void loadItems()
    }
  }

  // 删除提醒
  const handleDelete = async (id: string) => {
    const target = items.find((i) => i.id === id)
    if (!target) return
    const ok = await api.delete(id)
    if (ok) {
      setDeletedCache(target)
      showToast(`${t('toast.deleted', lang)} "${target.title}"`, true)
      void loadItems()
    }
  }

  const handleUndo = async () => {
    if (!deletedCache) return
    const res = await api.save(deletedCache)
    if (res) {
      setDeletedCache(null)
      setToastMsg(null)
      showToast('✅ 已撤销删除')
      void loadItems()
    }
  }

  const handleTestNotify = async () => {
    playReminderAudio()
    // 触发右上角高保真悬浮提醒横幅
    setActivePopup({
      id: 'test-alarm',
      title: '测试提醒：开研发周会',
      desc: '您的 DSH 智能提醒通知与声音服务运行正常！',
      time: '10:30',
    })

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('⏰ DSH 智能提醒', { body: '您的智能提醒通知服务运行正常！' })
    } else if (typeof Notification !== 'undefined' && Notification.permission !== 'denied') {
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted') new Notification('⏰ DSH 智能提醒', { body: '您的智能提醒通知服务运行正常！' })
      })
    }

    const res = await api.testNotify()
    showToast(res.message || 'Notification triggered')
  }

  const handleExportIcs = () => {
    window.open('/api/reminders/export.ics', '_blank')
    showToast(t('toast.exported', lang))
  }

  const theme = isDark
    ? {
        bgOverlay: 'rgba(15, 23, 42, 0.78)',
        bgModal: '#1e293b',
        headerBg: 'linear-gradient(to right, #1e293b, #0f172a)',
        border: '#334155',
        borderLight: '#1e293b',
        textPrimary: '#f8fafc',
        textSecondary: '#cbd5e1',
        textMuted: '#94a3b8',
        textLunarMuted: '#64748b',
        textLunarSpecial: '#fbbf24',
        btnSecondaryBg: '#334155',
        btnSecondaryBorder: '#475569',
        rightPanelBg: '#0f172a',
        cellBgCurrent: '#0f172a',
        cellBgOther: '#090d16',
        cellSelectedBg: '#1e3a8a',
        cellSelectedBorder: '#3b82f6',
        cardBg: '#1e293b',
        inputBg: '#0f172a',
        presetBg: '#334155',
        presetText: '#cbd5e1',
        missedBannerBg: 'rgba(239, 68, 68, 0.12)',
        missedBannerBorder: 'rgba(239, 68, 68, 0.3)',
      }
    : {
        bgOverlay: 'rgba(71, 85, 105, 0.45)',
        bgModal: '#ffffff',
        headerBg: 'linear-gradient(to right, #ffffff, #f8fafc)',
        border: '#e2e8f0',
        borderLight: '#f1f5f9',
        textPrimary: '#0f172a',
        textSecondary: '#334155',
        textMuted: '#64748b',
        textLunarMuted: '#94a3b8',
        textLunarSpecial: '#d97706',
        btnSecondaryBg: '#f1f5f9',
        btnSecondaryBorder: '#cbd5e1',
        rightPanelBg: '#f8fafc',
        cellBgCurrent: '#ffffff',
        cellBgOther: '#f8fafc',
        cellSelectedBg: '#eff6ff',
        cellSelectedBorder: '#3b82f6',
        cardBg: '#ffffff',
        inputBg: '#ffffff',
        presetBg: '#f1f5f9',
        presetText: '#475569',
        missedBannerBg: 'rgba(254, 226, 226, 0.7)',
        missedBannerBorder: '#fca5a5',
      }

  const getPriorityColor = (p?: string) => {
    if (p === 'high') return '#ef4444'
    if (p === 'low') return '#10b981'
    return '#3b82f6'
  }

  return createElement(
    'div',
    {
      className: 'dsh-rem-overlay',
      style: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: theme.bgOverlay,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
        color: theme.textSecondary,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
        animation: 'dshOverlayFade 0.2s ease-out forwards',
      },
    },
    createElement(
      'div',
      {
        className: 'dsh-rem-modal',
        style: {
          width: '980px',
          maxWidth: '94vw',
          height: '660px',
          maxHeight: '90vh',
          backgroundColor: theme.bgModal,
          borderRadius: '16px',
          boxShadow: isDark
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.1)'
            : '0 25px 50px -12px rgba(0, 0, 0, 0.16), 0 0 0 1px rgba(0, 0, 0, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          animation: 'dshFadeIn 0.24s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        },
      },
      // 头部
      createElement(
        'div',
        {
          style: {
            padding: '14px 20px',
            borderBottom: `1px solid ${theme.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: theme.headerBg,
            flex: 'none',
            gap: '12px',
          },
        },
        createElement(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 } },
          createElement('span', { style: { display: 'flex', alignItems: 'center', color: 'inherit', flex: 'none' } }, createElement(CalendarClockIcon, { size: 18 })),
          createElement('h3', { style: { margin: 0, fontSize: '15px', fontWeight: 600, color: theme.textPrimary, whiteSpace: 'nowrap' } }, t('app.title', lang)),
          createElement(
            'span',
            {
              style: {
                fontSize: '11px',
                padding: '3px 10px',
                borderRadius: '12px',
                backgroundColor: isDark ? '#334155' : '#e2e8f0',
                color: theme.textMuted,
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '260px',
              },
            },
            t('stats.summary', lang, { total: monthStats.total, rate: monthStats.rate }),
          ),
        ),
        createElement(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: '8px', flex: 'none' } },
          createElement(
            'select',
            {
              value: lang,
              onChange: (e: any) => setLang(e.target.value as Lang),
              style: {
                padding: '5px 8px',
                fontSize: '11px',
                borderRadius: '6px',
                border: `1px solid ${theme.btnSecondaryBorder}`,
                backgroundColor: theme.btnSecondaryBg,
                color: theme.textSecondary,
                cursor: 'pointer',
                outline: 'none',
                fontWeight: 500,
              },
            },
            createElement('option', { value: 'zh' }, '🇨🇳 中文'),
            createElement('option', { value: 'en' }, '🇺🇸 English'),
            createElement('option', { value: 'es' }, '🇪🇸 Español'),
          ),
          createElement(
            'button',
            {
              className: 'dsh-btn-smooth',
              onClick: handleExportIcs,
              title: '导出为标准 .ics 日历文件，支持同步至 Apple 日历 / Outlook / Google 日历',
              style: {
                padding: '5px 12px',
                fontSize: '12px',
                borderRadius: '6px',
                border: `1px solid ${theme.btnSecondaryBorder}`,
                backgroundColor: theme.btnSecondaryBg,
                color: theme.textSecondary,
                cursor: 'pointer',
                fontWeight: 500,
                whiteSpace: 'nowrap',
              },
            },
            t('btn.exportIcs', lang),
          ),
          createElement(
            'button',
            {
              className: 'dsh-btn-smooth',
              onClick: handleTestNotify,
              style: {
                padding: '5px 12px',
                fontSize: '12px',
                borderRadius: '6px',
                border: `1px solid ${theme.btnSecondaryBorder}`,
                backgroundColor: theme.btnSecondaryBg,
                color: theme.textSecondary,
                cursor: 'pointer',
                fontWeight: 500,
                whiteSpace: 'nowrap',
              },
            },
            t('btn.testNotify', lang),
          ),
          createElement(
            'button',
            {
              className: 'dsh-btn-smooth',
              onClick: onClose,
              style: {
                padding: '5px 14px',
                fontSize: '12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                cursor: 'pointer',
                fontWeight: 500,
                whiteSpace: 'nowrap',
              },
            },
            t('btn.close', lang),
          ),
        ),
      ),

      // 离线漏发横幅提醒
      missedItems.length > 0
        ? createElement(
            'div',
            {
              style: {
                padding: '8px 20px',
                backgroundColor: theme.missedBannerBg,
                borderBottom: `1px solid ${theme.missedBannerBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: isDark ? '#fca5a5' : '#b91c1c',
                flex: 'none',
              },
            },
            createElement('span', null, t('banner.missed', lang, { n: missedItems.length }) + `: ${missedItems.map((m) => m.title).slice(0, 3).join('、')}${missedItems.length > 3 ? '...' : ''}`),
            createElement(
              'button',
              {
                className: 'dsh-btn-smooth',
                onClick: () => {
                  missedItems.forEach((m) => api.toggleComplete(m.id))
                  setTimeout(() => void loadItems(), 100)
                },
                style: {
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                },
              },
              t('btn.completeAll', lang),
            ),
          )
        : null,

      // 主体两栏布局
      createElement(
        'div',
        { style: { flex: 1, display: 'flex', overflow: 'hidden' } },
        // 左侧日历栏
        createElement(
          'div',
          { style: { flex: 58, borderRight: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', padding: '16px', overflowY: 'auto', overflowX: 'hidden' } },
          // 日历月份切换控制器
          createElement(
            'div',
            { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' } },
            createElement(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
              createElement('h3', { style: { margin: 0, fontSize: '16px', fontWeight: 600, color: theme.textPrimary } }, formattedMonthTitle),
              createElement(
                'button',
                {
                  className: 'dsh-btn-smooth',
                  onClick: todayMonth,
                  style: { padding: '2px 8px', fontSize: '11px', borderRadius: '5px', border: '1px solid #3b82f6', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', cursor: 'pointer', fontWeight: 600 },
                },
                t('btn.today', lang),
              ),
            ),
            createElement(
              'div',
              { style: { display: 'flex', gap: '6px' } },
              createElement('button', { className: 'dsh-btn-smooth', onClick: prevMonth, style: { padding: '5px 12px', borderRadius: '6px', border: `1px solid ${theme.btnSecondaryBorder}`, background: theme.btnSecondaryBg, color: theme.textSecondary, cursor: 'pointer', fontSize: '12px' } }, t('btn.prevMonth', lang)),
              createElement('button', { className: 'dsh-btn-smooth', onClick: nextMonth, style: { padding: '5px 12px', borderRadius: '6px', border: `1px solid ${theme.btnSecondaryBorder}`, background: theme.btnSecondaryBg, color: theme.textSecondary, cursor: 'pointer', fontSize: '12px' } }, t('btn.nextMonth', lang)),
            ),
          ),

          // 星期表头
          createElement(
            'div',
            { style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '6px', textAlign: 'center' } },
            [0, 1, 2, 3, 4, 5, 6].map((w) =>
              createElement('div', { key: w, style: { fontSize: '12px', fontWeight: 600, color: w === 0 || w === 6 ? '#ef4444' : theme.textMuted, padding: '2px 0' } }, t(`week.${w}`, lang)),
            ),
          ),

          // 日历网格
          createElement(
            'div',
            { style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', flex: 1 } },
            calendarCells.map((cell) => {
              const mm = String(cell.month).padStart(2, '0')
              const dd = String(cell.day).padStart(2, '0')
              const solarKey = `${mm}${dd}`

              let subtitle = ''
              let isSpecial = false

              if (lang === 'zh') {
                const lunar = getLunarInfo(cell.year, cell.month, cell.day)
                subtitle = lunar.festivalOrDay
                isSpecial = lunar.isSpecial
              } else {
                const globalFest = GLOBAL_SOLAR_FESTIVALS[solarKey]
                if (globalFest) {
                  subtitle = globalFest[lang] || globalFest.en
                  isSpecial = true
                }
              }

              const isSelected = selectedDate === cell.dateKey
              const isToday = formatDateKey(new Date()) === cell.dateKey
              const pendingCount = items.filter((i) => i.dueTimeStr.startsWith(cell.dateKey) && i.status === 'pending').length
              const hasCompleted = items.some((i) => i.dueTimeStr.startsWith(cell.dateKey) && i.status === 'completed')

              return createElement(
                'div',
                {
                  key: cell.dateKey,
                  className: 'dsh-rem-cell',
                  onClick: () => setSelectedDate(cell.dateKey),
                  style: {
                    padding: '6px 4px',
                    borderRadius: '8px',
                    backgroundColor: isSelected
                      ? theme.cellSelectedBg
                      : cell.isCurrentMonth
                        ? theme.cellBgCurrent
                        : theme.cellBgOther,
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    borderColor: isSelected
                      ? theme.cellSelectedBorder
                      : isDark
                        ? theme.borderLight
                        : theme.border,
                    boxShadow: !isDark && cell.isCurrentMonth && !isSelected ? '0 1px 2px rgba(0,0,0,0.02)' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: '58px',
                    boxSizing: 'border-box',
                    opacity: cell.isCurrentMonth ? 1 : 0.35,
                  },
                },
                createElement(
                  'div',
                  { style: { display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', boxSizing: 'border-box' } },
                  createElement(
                    'div',
                    { style: { display: 'flex', alignItems: 'center', gap: '3px' } },
                    createElement('span', { style: { fontSize: '13px', fontWeight: isToday ? 700 : 500, color: isToday ? '#2563eb' : theme.textPrimary } }, cell.day),
                    isToday ? createElement('span', { style: { width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#2563eb', display: 'inline-block' } }) : null,
                  ),
                  pendingCount > 0 ? (
                    createElement('span', { style: { fontSize: '10px', backgroundColor: '#ef4444', color: '#fff', borderRadius: '10px', padding: '0 5px', fontWeight: 700, boxShadow: '0 2px 4px rgba(239,68,68,0.3)' } }, pendingCount)
                  ) : hasCompleted ? (
                    createElement('span', { style: { fontSize: '10px', color: '#10b981', fontWeight: 700 } }, '✓')
                  ) : null,
                ),
                subtitle ? (
                  createElement(
                    'span',
                    {
                      style: {
                        fontSize: '10px',
                        color: isSpecial ? theme.textLunarSpecial : theme.textLunarMuted,
                        fontWeight: isSpecial ? 600 : 400,
                        marginTop: '0px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '92%',
                      },
                    },
                    subtitle,
                  )
                ) : createElement('span', { style: { height: '12px' } }),
              )
            }),
          ),
        ),

        // 右侧事项详情与操作栏
        createElement(
          'div',
          { style: { flex: 42, display: 'flex', flexDirection: 'column', padding: '16px', backgroundColor: theme.rightPanelBg, overflowY: 'auto', overflowX: 'hidden' } },
          // 顶部：日期标题与新建按钮
          createElement(
            'div',
            { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' } },
            createElement('h4', { style: { margin: 0, fontSize: '14px', color: theme.textPrimary } }, `📌 ${selectedDate}`),
            createElement(
              'button',
              {
                className: 'dsh-btn-smooth',
                onClick: () =>
                  setEditingItem({
                    title: '',
                    date: selectedDate,
                    time: '09:00',
                    description: '',
                    priority: 'medium',
                    notifySystem: true,
                    repeat: 'none',
                  }),
                style: {
                  padding: '5px 12px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 5px rgba(37,99,235,0.25)',
                  whiteSpace: 'nowrap',
                },
              },
              t('btn.newReminder', lang),
            ),
          ),

          // 搜索框
          createElement('input', {
            type: 'text',
            placeholder: t('search.placeholder', lang),
            value: searchQuery,
            onChange: (e: any) => setSearchQuery(e.target.value),
            style: {
              padding: '6px 10px',
              fontSize: '12px',
              borderRadius: '6px',
              border: `1px solid ${theme.border}`,
              backgroundColor: theme.inputBg,
              color: theme.textPrimary,
              outline: 'none',
              marginBottom: '8px',
            },
          }),

          // 状态筛选胶囊
          createElement(
            'div',
            { style: { display: 'flex', gap: '4px', marginBottom: '12px' } },
            (['all', 'pending', 'completed'] as const).map((st) =>
              createElement(
                'button',
                {
                  key: st,
                  className: 'dsh-btn-smooth',
                  onClick: () => setStatusFilter(st),
                  style: {
                    flex: 1,
                    fontSize: '11px',
                    padding: '3px 0',
                    borderRadius: '4px',
                    border: statusFilter === st ? '1px solid #3b82f6' : `1px solid ${theme.border}`,
                    backgroundColor: statusFilter === st ? (isDark ? '#1e3a8a' : '#eff6ff') : theme.presetBg,
                    color: statusFilter === st ? '#3b82f6' : theme.presetText,
                    cursor: 'pointer',
                    fontWeight: statusFilter === st ? 600 : 400,
                    whiteSpace: 'nowrap',
                  },
                },
                t(`filter.${st}`, lang),
              ),
            ),
          ),

          // 列表项
          selectedDateItems.length === 0
            ? createElement(
                'div',
                {
                  style: {
                    textAlign: 'center',
                    padding: '48px 12px',
                    color: theme.textMuted,
                    fontSize: '12px',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                    borderRadius: '8px',
                    border: `1px dashed ${theme.border}`,
                  },
                },
                searchQuery ? t('empty.searchNoItems', lang) : t('empty.noItems', lang),
              )
            : createElement(
                'div',
                { style: { display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', overflowX: 'hidden' } },
                selectedDateItems.map((item) => {
                  const isCompleted = item.status === 'completed'
                  const isDone = item.status === 'done'
                  const pColor = getPriorityColor(item.priority)

                  return createElement(
                    'div',
                    {
                      key: item.id,
                      className: 'dsh-rem-card',
                      style: {
                        padding: '10px 12px',
                        backgroundColor: theme.cardBg,
                        borderRadius: '8px',
                        border: `1px solid ${theme.border}`,
                        borderLeft: `4px solid ${isCompleted ? '#94a3b8' : pColor}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        boxShadow: !isDark ? '0 1px 3px rgba(0,0,0,0.03)' : 'none',
                        opacity: isCompleted ? 0.6 : 1,
                        boxSizing: 'border-box',
                        width: '100%',
                      },
                    },
                    createElement(
                      'div',
                      { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                      createElement(
                        'div',
                        { style: { display: 'flex', alignItems: 'center', gap: '7px', flex: 1, minWidth: 0 } },
                        createElement('input', {
                          type: 'checkbox',
                          checked: isCompleted,
                          onChange: () => handleToggleComplete(item.id),
                          style: { cursor: 'pointer', width: '14px', height: '14px', accentColor: '#10b981', flex: 'none' },
                        }),
                        createElement(
                          'span',
                          {
                            style: {
                              fontSize: '12px',
                              fontWeight: 600,
                              color: isCompleted ? theme.textMuted : theme.textPrimary,
                              textDecoration: isCompleted ? 'line-through' : 'none',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            },
                          },
                          item.title,
                        ),
                      ),
                      createElement(
                        'button',
                        {
                          onClick: () => handleDelete(item.id),
                          style: { border: 'none', background: 'transparent', color: theme.textMuted, cursor: 'pointer', fontSize: '12px', padding: '0 3px', flex: 'none' },
                        },
                        '✕',
                      ),
                    ),
                    createElement(
                      'div',
                      { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: theme.textMuted, marginTop: '2px' } },
                      createElement('span', null, `⏰ ${item.dueTimeStr.split(' ')[1] || item.dueTimeStr}${item.repeat && item.repeat !== 'none' ? ` (${t(`repeat.${item.repeat}`, lang)})` : ''}`),
                      createElement(
                        'div',
                        { style: { display: 'flex', gap: '3px', alignItems: 'center' } },
                        !isCompleted ? (
                          createElement(
                            'div',
                            { style: { display: 'flex', gap: '2px' } },
                            createElement(
                              'button',
                              {
                                className: 'dsh-btn-smooth',
                                onClick: () => handleSnooze(item.id, 15, '15m'),
                                title: 'Snooze 15m',
                                style: { fontSize: '9px', padding: '1px 4px', borderRadius: '3px', border: `1px solid ${theme.border}`, background: theme.presetBg, color: theme.textSecondary, cursor: 'pointer' },
                              },
                              '+15m',
                            ),
                            createElement(
                              'button',
                              {
                                className: 'dsh-btn-smooth',
                                onClick: () => handleSnooze(item.id, 60, '1h'),
                                title: 'Snooze 1h',
                                style: { fontSize: '9px', padding: '1px 4px', borderRadius: '3px', border: `1px solid ${theme.border}`, background: theme.presetBg, color: theme.textSecondary, cursor: 'pointer' },
                              },
                              '+1h',
                            ),
                          )
                        ) : null,
                        createElement(
                          'span',
                          { style: { color: isCompleted ? '#10b981' : isDone ? '#94a3b8' : pColor, fontWeight: 600, marginLeft: '3px' } },
                          isCompleted ? t('status.completed', lang) : isDone ? t('status.done', lang) : t('status.pending', lang),
                        ),
                      ),
                    ),
                    item.description ? createElement('p', { style: { margin: '2px 0 0', fontSize: '10px', color: theme.textMuted } }, item.description) : null,
                  )
                }),
              ),
        ),
      ),

      // 新增/编辑弹窗 (Modal)
      editingItem
        ? createElement(
            'div',
            {
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                backdropFilter: 'blur(6px)',
                animation: 'dshOverlayFade 0.18s ease-out forwards',
              },
            },
            createElement(
              'form',
              {
                onSubmit: handleSave,
                style: {
                  width: '420px',
                  backgroundColor: theme.bgModal,
                  borderRadius: '16px',
                  padding: '24px',
                  border: `1px solid ${theme.border}`,
                  boxShadow: '0 25px 35px -5px rgba(0,0,0,0.4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  animation: 'dshModalPop 0.24s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                },
              },
              createElement(
                'div',
                { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                createElement('span', { style: { color: 'inherit', display: 'flex', alignItems: 'center' } }, createElement(CalendarClockIcon, { size: 16 })),
                createElement('h4', { style: { margin: 0, fontSize: '15px', color: theme.textPrimary, fontWeight: 600 } }, t('form.title', lang)),
              ),
              createElement(
                'div',
                { style: { display: 'flex', flexDirection: 'column', gap: '5px' } },
                createElement('label', { style: { fontSize: '12px', fontWeight: 600, color: theme.textSecondary } }, t('form.contentLabel', lang)),
                createElement('input', {
                  type: 'text',
                  placeholder: t('form.contentPlaceholder', lang),
                  value: editingItem.title || '',
                  onChange: (e: any) => setEditingItem({ ...editingItem, title: e.target.value }),
                  required: true,
                  autoFocus: true,
                  style: {
                    padding: '9px 12px',
                    backgroundColor: theme.inputBg,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '8px',
                    color: theme.textPrimary,
                    fontSize: '13px',
                    outline: 'none',
                  },
                }),
              ),
              createElement(
                'div',
                { style: { display: 'flex', flexDirection: 'column', gap: '5px' } },
                createElement('label', { style: { fontSize: '12px', fontWeight: 600, color: theme.textSecondary } }, t('form.timeLabel', lang)),
                createElement(
                  'div',
                  { style: { display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' } },
                  createElement('input', {
                    type: 'date',
                    value: editingItem.date,
                    onChange: (e: any) => setEditingItem({ ...editingItem, date: e.target.value }),
                    required: true,
                    style: {
                      padding: '8px 10px',
                      backgroundColor: theme.inputBg,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '8px',
                      color: theme.textPrimary,
                      fontSize: '13px',
                      outline: 'none',
                    },
                  }),
                  createElement('input', {
                    type: 'time',
                    value: editingItem.time,
                    onChange: (e: any) => setEditingItem({ ...editingItem, time: e.target.value }),
                    required: true,
                    style: {
                      padding: '8px 10px',
                      backgroundColor: theme.inputBg,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '8px',
                      color: theme.textPrimary,
                      fontSize: '13px',
                      outline: 'none',
                    },
                  }),
                ),
                createElement(
                  'div',
                  { style: { display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '3px' } },
                  COMMON_TIME_PRESETS.map((preset) =>
                    createElement(
                      'button',
                      {
                        key: preset.time,
                        type: 'button',
                        className: 'dsh-btn-smooth',
                        onClick: () => setEditingItem({ ...editingItem, time: preset.time }),
                        style: {
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: editingItem.time === preset.time ? '1px solid #3b82f6' : `1px solid ${theme.border}`,
                          backgroundColor: editingItem.time === preset.time ? (isDark ? '#1e3a8a' : '#eff6ff') : theme.presetBg,
                          color: editingItem.time === preset.time ? '#3b82f6' : theme.presetText,
                          cursor: 'pointer',
                          fontWeight: editingItem.time === preset.time ? 600 : 400,
                        },
                      },
                      preset.label,
                    ),
                  ),
                ),
              ),
              createElement(
                'div',
                { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' } },
                createElement(
                  'div',
                  { style: { display: 'flex', flexDirection: 'column', gap: '5px' } },
                  createElement('label', { style: { fontSize: '12px', fontWeight: 600, color: theme.textSecondary } }, t('priority.label', lang)),
                  createElement(
                    'select',
                    {
                      value: editingItem.priority,
                      onChange: (e: any) => setEditingItem({ ...editingItem, priority: e.target.value }),
                      style: {
                        padding: '8px 10px',
                        backgroundColor: theme.inputBg,
                        border: `1px solid ${theme.border}`,
                        borderRadius: '8px',
                        color: theme.textPrimary,
                        fontSize: '12px',
                        outline: 'none',
                      },
                    },
                    createElement('option', { value: 'high' }, t('priority.high', lang)),
                    createElement('option', { value: 'medium' }, t('priority.medium', lang)),
                    createElement('option', { value: 'low' }, t('priority.low', lang)),
                  ),
                ),
                createElement(
                  'div',
                  { style: { display: 'flex', flexDirection: 'column', gap: '5px' } },
                  createElement('label', { style: { fontSize: '12px', fontWeight: 600, color: theme.textSecondary } }, t('repeat.label', lang)),
                  createElement(
                    'select',
                    {
                      value: editingItem.repeat,
                      onChange: (e: any) => setEditingItem({ ...editingItem, repeat: e.target.value }),
                      style: {
                        padding: '8px 10px',
                        backgroundColor: theme.inputBg,
                        border: `1px solid ${theme.border}`,
                        borderRadius: '8px',
                        color: theme.textPrimary,
                        fontSize: '12px',
                        outline: 'none',
                      },
                    },
                    createElement('option', { value: 'none' }, t('repeat.none', lang)),
                    createElement('option', { value: 'daily' }, t('repeat.daily', lang)),
                    createElement('option', { value: 'weekly' }, t('repeat.weekly', lang)),
                    createElement('option', { value: 'monthly' }, t('repeat.monthly', lang)),
                  ),
                ),
              ),
              createElement(
                'div',
                { style: { display: 'flex', flexDirection: 'column', gap: '5px' } },
                createElement('label', { style: { fontSize: '12px', fontWeight: 600, color: theme.textSecondary } }, t('form.descLabel', lang)),
                createElement('textarea', {
                  placeholder: t('form.descPlaceholder', lang),
                  value: editingItem.description || '',
                  onChange: (e: any) => setEditingItem({ ...editingItem, description: e.target.value }),
                  rows: 2,
                  style: {
                    padding: '8px 12px',
                    backgroundColor: theme.inputBg,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '8px',
                    color: theme.textPrimary,
                    fontSize: '12px',
                    resize: 'none',
                    outline: 'none',
                  },
                }),
              ),
              createElement(
                'div',
                { style: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' } },
                createElement('button', { type: 'button', className: 'dsh-btn-smooth', onClick: () => setEditingItem(null), style: { padding: '7px 15px', borderRadius: '8px', border: `1px solid ${theme.btnSecondaryBorder}`, background: theme.btnSecondaryBg, color: theme.textSecondary, cursor: 'pointer', fontSize: '12px', fontWeight: 500 } }, t('btn.cancel', lang)),
                createElement('button', { type: 'submit', className: 'dsh-btn-smooth', style: { padding: '7px 18px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '12px', boxShadow: '0 2px 6px rgba(37,99,235,0.35)' } }, t('btn.save', lang)),
              ),
            ),
          )
        : null,

      // 【核心升级】：页面右上角悬浮提醒卡片 (绝对不会被 macOS 勿扰模式吞掉)
      activePopup
        ? createElement(
            'div',
            {
              style: {
                position: 'absolute',
                top: '20px',
                right: '20px',
                width: '320px',
                backgroundColor: theme.bgModal,
                borderRadius: '12px',
                padding: '16px',
                border: '2px solid #ef4444',
                boxShadow: '0 20px 25px -5px rgba(239, 68, 68, 0.35), 0 0 0 1px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                zIndex: 20000,
                animation: 'dshPopupSlideIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
              },
            },
            createElement(
              'div',
              { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' } },
              createElement(
                'div',
                { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                createElement('span', { style: { fontSize: '20px' } }, '⏰'),
                createElement('h5', { style: { margin: 0, fontSize: '14px', fontWeight: 700, color: theme.textPrimary } }, '定时提醒已到期！'),
              ),
              createElement(
                'button',
                {
                  onClick: () => setActivePopup(null),
                  style: { border: 'none', background: 'transparent', color: theme.textMuted, cursor: 'pointer', fontSize: '14px', padding: '0 2px' },
                },
                '✕',
              ),
            ),
            createElement(
              'div',
              { style: { padding: '8px 10px', backgroundColor: theme.inputBg, borderRadius: '8px', border: `1px solid ${theme.border}` } },
              createElement('div', { style: { fontSize: '13px', fontWeight: 600, color: '#2563eb' } }, activePopup.title),
              createElement('div', { style: { fontSize: '11px', color: theme.textMuted, marginTop: '2px' } }, `设定时间：${activePopup.time}`),
              activePopup.desc ? createElement('div', { style: { fontSize: '11px', color: theme.textSecondary, marginTop: '4px' } }, activePopup.desc) : null,
            ),
            createElement(
              'div',
              { style: { display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' } },
              createElement(
                'button',
                {
                  className: 'dsh-btn-smooth',
                  onClick: () => {
                    handleSnooze(activePopup.id, 15, '15m')
                    setActivePopup(null)
                  },
                  style: { padding: '4px 10px', borderRadius: '6px', border: `1px solid ${theme.btnSecondaryBorder}`, background: theme.btnSecondaryBg, color: theme.textSecondary, cursor: 'pointer', fontSize: '11px', fontWeight: 600 },
                },
                '推迟 15m',
              ),
              createElement(
                'button',
                {
                  className: 'dsh-btn-smooth',
                  onClick: () => {
                    handleToggleComplete(activePopup.id)
                    setActivePopup(null)
                  },
                  style: { padding: '4px 14px', borderRadius: '6px', border: 'none', background: '#10b981', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '11px', boxShadow: '0 2px 4px rgba(16,185,129,0.3)' },
                },
                '✓ 我知道了',
              ),
            ),
          )
        : null,

      // Toast 提示
      toastMsg
        ? createElement(
            'div',
            {
              style: {
                position: 'absolute',
                bottom: '24px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.35)',
                zIndex: 10001,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                animation: 'dshToastSlide 0.22s ease-out forwards',
              },
            },
            createElement('span', null, toastMsg.text),
            toastMsg.showUndo ? (
              createElement(
                'button',
                {
                  onClick: handleUndo,
                  style: {
                    border: 'none',
                    backgroundColor: 'rgba(255,255,255,0.25)',
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  },
                },
                t('btn.undo', lang),
              )
            ) : null,
          )
        : null,
    ),
  )
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
