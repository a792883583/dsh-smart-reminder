/**
 * 注册智能体 Agent 工具：set_reminder, list_reminders, cancel_reminder。
 * 允许在企微或任意会话中通过自然语言直接管理提醒。
 * @module dsh-smart-reminder/host/tools
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ReminderStore } from './store.ts'

export function registerReminderTools(ctx: Context, store: ReminderStore): () => void {
  const tools = (ctx as any).tools
  if (!tools) return () => {}

  // 1. set_reminder 工具
  const disposeSet = tools.register(defineTool({
    name: 'set_reminder',
    description: '设定一个未来定时提醒事项。支持指定提醒标题、到期时间、可选备注以及推送目标。到了指定时间系统将通过原生弹窗及指定平台（如企业微信）进行主动提醒。',
    parameters: {
      title: {
        type: 'string',
        required: true,
        description: '提醒事项标题/内容（如：去开研发周会、提交周报、看烤箱）',
      },
      dueTime: {
        type: 'string',
        required: true,
        description: '目标提醒时间，支持 YYYY-MM-DD HH:mm 格式，或相对时间描述',
      },
      description: {
        type: 'string',
        description: '可选的详细备注或链接',
      },
      repeat: {
        type: 'string',
        enum: ['none', 'daily', 'weekly', 'monthly'],
        description: '循环周期：none 单次（默认）| daily 每天 | weekly 每周 | monthly 每月',
      },
      pushPlatform: {
        type: 'string',
        enum: ['wecom-aibot', 'telegram', 'discord', 'email', 'none'],
        description: '推送渠道：wecom-aibot（企业微信）| telegram | discord | email | none',
      },
      pushTarget: {
        type: 'string',
        description: '推送目标用户 ID / 群 ID / 邮箱地址',
      },
    },
    output: {
      schema: { type: 'string' },
      render: (_args: unknown, value: unknown) => [{ type: 'text', text: String(value) }],
    },
    async execute(args: {
      title: string
      dueTime: string
      description?: string
      repeat?: 'none' | 'daily' | 'weekly' | 'monthly'
      pushPlatform?: 'wecom-aibot' | 'telegram' | 'discord' | 'email' | 'none'
      pushTarget?: string
    }) {
      const title = String(args.title || '').trim()
      if (!title) return '错误：标题 title 不能为空'

      // 解析时间
      let targetDate: Date
      const parsed = Date.parse(args.dueTime.replace(/-/g, '/'))
      if (!isNaN(parsed)) {
        targetDate = new Date(parsed)
      } else {
        targetDate = new Date(Date.now() + 10 * 60 * 1000) // 默认 10 分钟后
      }

      const dueAt = targetDate.getTime()
      const y = targetDate.getFullYear()
      const m = String(targetDate.getMonth() + 1).padStart(2, '0')
      const d = String(targetDate.getDate()).padStart(2, '0')
      const h = String(targetDate.getHours()).padStart(2, '0')
      const min = String(targetDate.getMinutes()).padStart(2, '0')
      const dueTimeStr = `${y}-${m}-${d} ${h}:${min}`

      const item = store.add({
        title,
        description: args.description || '',
        dueAt,
        dueTimeStr,
        repeat: args.repeat || 'none',
        pushPlatform: args.pushPlatform,
        pushTarget: args.pushTarget,
        notifySystem: true,
      })

      return `⏰ 提醒已成功设定！\n- 事项：${item.title}\n- 提醒时间：${item.dueTimeStr}\n- 系统弹窗：开启\n${item.pushPlatform ? `- 推送渠道：${item.pushPlatform} (${item.pushTarget || '当前会话'})\n` : ''}${item.repeat !== 'none' ? `- 循环：${item.repeat}\n` : ''}- 提醒 ID: ${item.id}`
    },
  }))

  // 2. list_reminders 工具
  const disposeList = tools.register(defineTool({
    name: 'list_reminders',
    description: '查看提醒事项列表。支持查询未来待触发的提醒（upcoming），或查询前几天已完成的历史归档提醒（history/all）。',
    parameters: {
      type: {
        type: 'string',
        enum: ['upcoming', 'history', 'all'],
        description: '查询类型：upcoming（未来待触发，默认）| history（历史已提醒）| all（全部）',
      },
    },
    output: {
      schema: { type: 'string' },
      render: (_args: unknown, value: unknown) => [{ type: 'text', text: String(value) }],
    },
    async execute(args: { type?: 'upcoming' | 'history' | 'all' }) {
      const type = args.type || 'upcoming'
      const all = store.getAll()
      let filtered = all
      if (type === 'upcoming') {
        filtered = all.filter((i) => i.status === 'pending').sort((a, b) => a.dueAt - b.dueAt)
      } else if (type === 'history') {
        filtered = all.filter((i) => i.status === 'done' || i.status === 'canceled').sort((a, b) => b.dueAt - a.dueAt)
      }

      if (filtered.length === 0) {
        return `当前没有相关的提醒事项记录 (${type})。`
      }

      const lines = filtered.slice(0, 20).map((item) => {
        const mark = item.status === 'pending' ? '⏳ 待提醒'
          : item.status === 'done' ? '🔔 已响铃'
          : item.status === 'completed' ? '✅ 已完成'
          : item.status === 'snoozed' ? '⏰ 已推迟'
          : '❌ 已取消'
        return `- [${mark}] ${item.dueTimeStr} | **${item.title}** (ID: ${item.id})`
      })

      return `📋 提醒事项列表 (${type}，共 ${filtered.length} 条)：\n` + lines.join('\n')
    },
  }))

  // 3. cancel_reminder 工具
  const disposeCancel = tools.register(defineTool({
    name: 'cancel_reminder',
    description: '根据提醒 ID 撤销/删除指定的定时提醒事项。',
    parameters: {
      id: {
        type: 'string',
        required: true,
        description: '要撤销的提醒事项 ID（可通过 list_reminders 查看）',
      },
    },
    output: {
      schema: { type: 'string' },
      render: (_args: unknown, value: unknown) => [{ type: 'text', text: String(value) }],
    },
    async execute(args: { id: string }) {
      const ok = store.delete(args.id)
      if (ok) return `✅ 提醒事项 ${args.id} 已成功取消。`
      return `❌ 未找到 ID 为 ${args.id} 的提醒事项。`
    },
  }))

  // 4. complete_reminder 工具（打勾完成）
  const disposeComplete = tools.register(defineTool({
    name: 'complete_reminder',
    description: '将指定提醒事项标记为已完成（Checklist 打勾）。',
    parameters: {
      id: {
        type: 'string',
        required: true,
        description: '要标记完成的提醒事项 ID（可通过 list_reminders 查看）',
      },
    },
    output: {
      schema: { type: 'string' },
      render: (_args: unknown, value: unknown) => [{ type: 'text', text: String(value) }],
    },
    async execute(args: { id: string }) {
      const item = store.toggleComplete(args.id)
      if (!item) return `❌ 未找到 ID 为 ${args.id} 的提醒事项。`
      if (item.status === 'completed') return `✅ 提醒「${item.title}」已标记完成。`
      return `↩️ 提醒「${item.title}」已恢复为待办。`
    },
  }))

  // 5. snooze_reminder 工具（一键推迟）
  const disposeSnooze = tools.register(defineTool({
    name: 'snooze_reminder',
    description: '推迟指定提醒事项，延后一定时间后再次提醒。',
    parameters: {
      id: {
        type: 'string',
        required: true,
        description: '要推迟的提醒事项 ID（可通过 list_reminders 查看）',
      },
      minutes: {
        type: 'number',
        description: '推迟的分钟数（默认 15 分钟）',
      },
    },
    output: {
      schema: { type: 'string' },
      render: (_args: unknown, value: unknown) => [{ type: 'text', text: String(value) }],
    },
    async execute(args: { id: string; minutes?: number }) {
      const minutes = Math.max(1, Number(args.minutes || 15))
      const item = store.snooze(args.id, minutes)
      if (!item) return `❌ 未找到 ID 为 ${args.id} 的提醒事项。`
      return `⏰ 提醒「${item.title}」已推迟 ${minutes} 分钟，新的提醒时间：${item.dueTimeStr}`
    },
  }))

  return () => {
    disposeSet()
    disposeList()
    disposeCancel()
    disposeComplete()
    disposeSnooze()
  }
}
