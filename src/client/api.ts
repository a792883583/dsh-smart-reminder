/**
 * 前端 API 封装（增加打勾完成、推迟与导出功能）。
 * @module dsh-smart-reminder/client/api
 */

import type { ReminderItem } from '../core/types.ts'

export class ReminderApi {
  async getList(): Promise<ReminderItem[]> {
    try {
      const res = await fetch('/api/reminders/list')
      const json = await res.json()
      return json.ok ? json.items : []
    } catch {
      return []
    }
  }

  async save(item: Partial<ReminderItem>): Promise<ReminderItem | null> {
    try {
      const res = await fetch('/api/reminders/save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(item),
      })
      const json = await res.json()
      return json.ok ? json.item : null
    } catch {
      return null
    }
  }

  async toggleComplete(id: string): Promise<ReminderItem | null> {
    try {
      const res = await fetch('/api/reminders/toggle-complete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const json = await res.json()
      return json.ok ? json.item : null
    } catch {
      return null
    }
  }

  async snooze(id: string, minutes: number): Promise<ReminderItem | null> {
    try {
      const res = await fetch('/api/reminders/snooze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, minutes }),
      })
      const json = await res.json()
      return json.ok ? json.item : null
    } catch {
      return null
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const res = await fetch('/api/reminders/delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const json = await res.json()
      return json.ok && json.deleted
    } catch {
      return false
    }
  }

  async testNotify(): Promise<{ ok: boolean; message: string }> {
    try {
      const res = await fetch('/api/reminders/test-notify')
      return await res.json()
    } catch {
      return { ok: false, message: '请求失败' }
    }
  }
}
