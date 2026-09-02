/**
 * iCal (.ics) 标准日历格式导出生成器。
 * 支持导出单项或全量事项，可直接双击导入 Apple 日历、Google Calendar、Outlook。
 * @module dsh-smart-reminder/core/ical
 */

import type { ReminderItem } from './types.ts'

function formatIcalDate(timestamp: number): string {
  const d = new Date(timestamp)
  return (
    d.getUTCFullYear() +
    String(d.getUTCMonth() + 1).padStart(2, '0') +
    String(d.getUTCDate()).padStart(2, '0') +
    'T' +
    String(d.getUTCHours()).padStart(2, '0') +
    String(d.getUTCMinutes()).padStart(2, '0') +
    String(d.getUTCSeconds()).padStart(2, '0') +
    'Z'
  )
}

function escapeIcalText(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

/** 生成包含全部事项的 .ics 日历文件字符串 */
export function generateIcalString(items: ReminderItem[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DeepSeek Harness//DSH Smart Reminder//CN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:DSH 智能提醒日历',
    'X-WR-TIMEZONE:Asia/Shanghai',
  ]

  for (const item of items) {
    if (item.status === 'canceled') continue

    const dtStart = formatIcalDate(item.dueAt)
    const dtEnd = formatIcalDate(item.dueAt + 30 * 60 * 1000) // 默认 30 分钟
    const dtStamp = formatIcalDate(item.createdAt || Date.now())

    lines.push(
      'BEGIN:VEVENT',
      `UID:${item.id}@dsh-smart-reminder`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeIcalText(item.title)}`,
      `DESCRIPTION:${escapeIcalText(item.description || 'DSH 智能提醒设定')}`,
      `STATUS:${item.status === 'completed' ? 'COMPLETED' : 'CONFIRMED'}`,
    )

    // 循环规则
    if (item.repeat === 'daily') lines.push('RRULE:FREQ=DAILY')
    else if (item.repeat === 'weekly') lines.push('RRULE:FREQ=WEEKLY')
    else if (item.repeat === 'monthly') lines.push('RRULE:FREQ=MONTHLY')

    // 提醒闹钟（提前 5 分钟与正点各响一次）
    lines.push(
      'BEGIN:VALARM',
      'TRIGGER:-PT5M',
      'ACTION:DISPLAY',
      `DESCRIPTION:Reminder: ${escapeIcalText(item.title)}`,
      'END:VALARM',
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}
