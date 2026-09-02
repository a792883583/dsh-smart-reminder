/**
 * 极简单色线性 SVG 图标集（与 DSH 侧边栏「新会话」、「消息平台」设计语言 100% 像素级对齐）。
 * 使用 currentColor 纯线条绘制，随深色/浅色模式文字颜色统一。
 * @module dsh-smart-reminder/client/icons
 */

import { createElement, type ReactElement } from 'react'

/** 单色极简线性日历时钟图标（与消息平台/新会话同风格） */
export function CalendarClockIcon(props: { size?: number }): ReactElement {
  const size = props.size || 16

  return createElement(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: size,
      height: size,
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.6,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      style: { flex: 'none' },
    },
    // 日历外框（右下角留缺口给时钟）
    createElement('path', { d: 'M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6' }),
    // 顶部两个吊环
    createElement('path', { d: 'M16 2v4' }),
    createElement('path', { d: 'M8 2v4' }),
    // 日历横隔线
    createElement('path', { d: 'M3 10h18' }),
    // 右下角小圆钟
    createElement('circle', { cx: '17', cy: '17', r: '5' }),
    // 指针
    createElement('path', { d: 'M17 14.5V17l1.5 1.5' }),
  )
}
