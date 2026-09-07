/**
 * 提醒事项持久化存储与管理（存储于 ~/.dsh/reminders.json）。
 * @module dsh-smart-reminder/host/store
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import type { ReminderItem, ReminderStoreData } from '../core/types.ts'

const DEFAULT_STORE_FILE = join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'reminders.json')

export class ReminderStore {
  private filePath: string
  private data: ReminderStoreData = { version: 1, items: [] }

  constructor(customPath?: string) {
    this.filePath = customPath || DEFAULT_STORE_FILE
    this.load()
  }

  private load(): void {
    try {
      if (existsSync(this.filePath)) {
        const raw = readFileSync(this.filePath, 'utf-8')
        this.data = JSON.parse(raw)
        if (!Array.isArray(this.data.items)) this.data.items = []
      } else {
        this.save()
      }
    } catch (e) {
      console.warn('[dsh-smart-reminder] load store error, creating new one', e)
      this.data = { version: 1, items: [] }
    }
  }

  private save(): void {
    try {
      mkdirSync(dirname(this.filePath), { recursive: true })
      writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8')
    } catch (e) {
      console.error('[dsh-smart-reminder] save store error', e)
    }
  }

  getAll(): ReminderItem[] {
    return [...this.data.items]
  }

  get(id: string): ReminderItem | undefined {
    return this.data.items.find((item) => item.id === id)
  }

  add(item: Omit<ReminderItem, 'id' | 'createdAt' | 'status'> & { id?: string }): ReminderItem {
    const newItem: ReminderItem = {
      id: item.id || `rem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      title: item.title,
      description: item.description || '',
      dueAt: item.dueAt,
      dueTimeStr: item.dueTimeStr,
      status: 'pending',
      createdAt: Date.now(),
      notifySystem: item.notifySystem !== false,
      pushPlatform: item.pushPlatform,
      pushTarget: item.pushTarget,
      repeat: item.repeat || 'none',
      snoozeCount: 0,
    }
    this.data.items.push(newItem)
    this.save()
    return newItem
  }

  update(id: string, patch: Partial<ReminderItem>): ReminderItem | null {
    const index = this.data.items.findIndex((item) => item.id === id)
    if (index === -1) return null
    const existing = this.data.items[index]
    if (!existing) return null
    const updated: ReminderItem = { ...existing, ...patch }
    // 关键状态机保护：如果修改的到期时间处于未来且事项当前非已打勾完成，自动重置回 pending 激活调度器
    if (patch.dueAt && patch.dueAt > Date.now() && existing.status !== 'completed' && !patch.status) {
      updated.status = 'pending'
    }
    this.data.items[index] = updated
    this.save()
    return updated
  }

  /**
   * 切换事项完成打勾状态 (Checklist 模式)。
   * 若事项带有周期循环设置（repeat: daily / weekly / monthly），在打勾完成时自动顺延生成下一周期的待办事项。
   *
   * @param id 提醒事项唯一 ID
   * @returns 更新后的提醒事项对象
   */
  toggleComplete(id: string): ReminderItem | null {
    const existing = this.get(id)
    if (!existing) return null
    const nextStatus = existing.status === 'completed' ? 'pending' : 'completed'
    const updated = this.update(id, {
      status: nextStatus,
      completedAt: nextStatus === 'completed' ? Date.now() : undefined,
    })

    // 周期循环智能流转：当事项被打勾标记完成且配置了周期循环时，自动生成下一个周期的待办事项
    if (nextStatus === 'completed' && existing.repeat && existing.repeat !== 'none') {
      const nextDate = new Date(existing.dueAt)
      if (existing.repeat === 'daily') {
        nextDate.setDate(nextDate.getDate() + 1)
      } else if (existing.repeat === 'weekly') {
        nextDate.setDate(nextDate.getDate() + 7)
      } else if (existing.repeat === 'monthly') {
        nextDate.setMonth(nextDate.getMonth() + 1)
      }

      const nextDueAt = nextDate.getTime()
      const y = nextDate.getFullYear()
      const m = String(nextDate.getMonth() + 1).padStart(2, '0')
      const d = String(nextDate.getDate()).padStart(2, '0')
      const h = String(nextDate.getHours()).padStart(2, '0')
      const min = String(nextDate.getMinutes()).padStart(2, '0')
      const nextDueTimeStr = `${y}-${m}-${d} ${h}:${min}`

      // 避免重复创建：如果已经存在标题相同且到期时间相同的待办，则不重复添加
      const alreadyExists = this.data.items.some(
        (i) => i.title === existing.title && i.dueTimeStr === nextDueTimeStr && i.status === 'pending',
      )

      if (!alreadyExists) {
        this.add({
          title: existing.title,
          description: existing.description,
          dueAt: nextDueAt,
          dueTimeStr: nextDueTimeStr,
          priority: existing.priority,
          notifySystem: existing.notifySystem,
          pushPlatform: existing.pushPlatform,
          pushTarget: existing.pushTarget,
          repeat: existing.repeat,
        })
        console.log('[dsh-smart-reminder] auto rescheduled next repeat item for', nextDueTimeStr)
      }
    }

    return updated
  }

  /** 一键推迟 (Snooze)：延后指定分钟数并重置为待提醒状态 */
  snooze(id: string, minutes: number): ReminderItem | null {
    const existing = this.get(id)
    if (!existing) return null
    const nextDueAt = Date.now() + minutes * 60 * 1000
    const d = new Date(nextDueAt)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const h = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    const dueTimeStr = `${y}-${m}-${day} ${h}:${min}`

    return this.update(id, {
      dueAt: nextDueAt,
      dueTimeStr,
      status: 'pending',
      snoozeCount: (existing.snoozeCount || 0) + 1,
    })
  }

  delete(id: string): boolean {
    const initialLen = this.data.items.length
    this.data.items = this.data.items.filter((item) => item.id !== id)
    if (this.data.items.length !== initialLen) {
      this.save()
      return true
    }
    return false
  }

  /** 获取待触发的事项 */
  getPendingDue(nowMs: number = Date.now()): ReminderItem[] {
    return this.data.items.filter((item) => item.status === 'pending' && item.dueAt <= nowMs)
  }

  /** 检测关机/离线期间漏掉的未触发提醒 (Catch-up) */
  getMissedCatchup(nowMs: number = Date.now(), maxPastHours = 48): ReminderItem[] {
    const minMs = nowMs - maxPastHours * 3600 * 1000
    return this.data.items.filter(
      (item) => item.status === 'pending' && item.dueAt < nowMs && item.dueAt >= minMs && !item.isMissedCatchup,
    )
  }
}
