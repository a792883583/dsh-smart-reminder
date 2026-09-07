/**
 * 提醒调度器：秒级轮询与事件触发，支持系统级弹窗、离线漏掉提醒补发与多平台推送。
 * 
 * 极简通知体验（方案 B）：
 * - 标题直接展示用户自定义填写的提醒内容（大字醒目突出）；
 * - 只有当用户填写了详细备注时才展示备注正文，完全去除多余冗长的前后缀与时间字符串。
 * @module dsh-smart-reminder/host/scheduler
 */

import type { Context } from '@deepseek-ai/cordis'
import type { ReminderItem } from '../core/types.ts'
import { sendSystemNotification } from './notifier.ts'
import { ReminderStore } from './store.ts'

export class ReminderScheduler {
  private timer: NodeJS.Timeout | null = null
  private running = false

  constructor(
    private readonly ctx: Context,
    private readonly store: ReminderStore,
  ) {}

  start(): void {
    if (this.running) return
    this.running = true

    // 1. 启动时执行一次离线漏掉事项补发检测 (Catch-up)
    setTimeout(() => void this.checkMissedCatchup(), 3000)

    // 2. 每 2 秒秒级高精轮询检查到期提醒
    this.timer = setInterval(() => {
      void this.checkDue()
    }, 2000)
    console.log('[dsh-smart-reminder] scheduler started')
  }

  stop(): void {
    this.running = false
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  /** 关机或离线期间的漏发汇总提醒 */
  private async checkMissedCatchup(): Promise<void> {
    const missed = this.store.getMissedCatchup()
    if (missed.length === 0) return

    console.log('[dsh-smart-reminder] found missed reminders during offline:', missed.length)
    for (const item of missed) {
      this.store.update(item.id, {
        isMissedCatchup: true,
        triggeredAt: Date.now(),
      })
    }

    const titles = missed.map((m) => m.title).join('\n')
    void sendSystemNotification({
      title: `⚠️ ${missed.length} 项离线错过的待办`,
      message: titles,
    })
  }

  private async checkDue(): Promise<void> {
    const now = Date.now()
    const dueList = this.store.getPendingDue(now)
    if (dueList.length === 0) return

    for (const item of dueList) {
      this.store.update(item.id, {
        status: 'done',
        triggeredAt: now,
      })

      // 1. 发送极简系统通知 (方案 B：大字直接是事项内容，无冗余副标题)
      if (item.notifySystem !== false) {
        void sendSystemNotification({
          title: item.title,
          message: item.description ? item.description : ' ',
        })
      }

      // 2. 尝试向企微/多平台推送 (若指定平台)
      if (item.pushPlatform && item.pushPlatform !== 'none' && item.pushTarget) {
        void this.pushToPlatform(item)
      }

      // 3. 处理循环提醒 (repeat: daily / weekly / monthly)
      if (item.repeat && item.repeat !== 'none') {
        this.scheduleNextRepeat(item)
      }
    }
  }

  private async pushToPlatform(item: ReminderItem): Promise<void> {
    try {
      const tools = (this.ctx as any).tools
      if (tools && typeof tools.get === 'function') {
        const sendTool = tools.get('send_chat_message')
        if (sendTool && typeof sendTool.execute === 'function') {
          await sendTool.execute({
            platform: item.pushPlatform,
            target: item.pushTarget,
            title: `⏰ ${item.title}`,
            message: `**【定时提醒】**\n\n📌 **${item.title}**${item.description ? `\n📝 ${item.description}` : ''}`,
          })
          console.log('[dsh-smart-reminder] pushed reminder to platform', item.pushPlatform, item.pushTarget)
        }
      }
    } catch (e) {
      console.warn('[dsh-smart-reminder] push to platform failed', e)
    }
  }

  private scheduleNextRepeat(item: ReminderItem): void {
    const nextDate = new Date(item.dueAt)
    if (item.repeat === 'daily') {
      nextDate.setDate(nextDate.getDate() + 1)
    } else if (item.repeat === 'weekly') {
      nextDate.setDate(nextDate.getDate() + 7)
    } else if (item.repeat === 'monthly') {
      nextDate.setMonth(nextDate.getMonth() + 1)
    }

    const dueAt = nextDate.getTime()
    const dueTimeStr = formatDate(nextDate)

    this.store.add({
      title: item.title,
      description: item.description,
      dueAt,
      dueTimeStr,
      notifySystem: item.notifySystem,
      pushPlatform: item.pushPlatform,
      pushTarget: item.pushTarget,
      repeat: item.repeat,
    })
    console.log('[dsh-smart-reminder] scheduled next repeat item for', dueTimeStr)
  }
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}
