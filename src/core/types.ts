/**
 * 提醒事项数据类型定义。
 * 通用开源插件标准规范：支持优先级、状态机、推迟调度与 iCal 导出。
 * @module dsh-smart-reminder/core/types
 */

export interface ReminderItem {
  id: string
  /** 提醒事项标题/正文。 */
  title: string
  /** 详细备注。 */
  description?: string
  /** 目标触发时间戳 (毫秒)。 */
  dueAt: number
  /** 格式化的日期时间字符串 YYYY-MM-DD HH:mm */
  dueTimeStr: string
  /** 状态：pending 待提醒 | done 已触发 | completed 用户手动标记完成 | snoozed 已推迟 | canceled 已取消 */
  status: 'pending' | 'done' | 'completed' | 'snoozed' | 'canceled'
  /** 重要程度优先级：high 高优(红) | medium 普通(黄) | low 低优(绿) */
  priority?: 'high' | 'medium' | 'low'
  /** 创建时间戳。 */
  createdAt: number
  /** 实际触发提醒时间戳。 */
  triggeredAt?: number
  /** 用户打勾完成时间戳。 */
  completedAt?: number
  /** 是否需要系统弹窗通知 (Mac/Win)。 */
  notifySystem: boolean
  /** 额外推送平台（若已接入企业微信等）。 */
  pushPlatform?: 'wecom-aibot' | 'telegram' | 'discord' | 'email' | 'none'
  /** 额外推送目标（如企微用户 ID / 群 ID）。 */
  pushTarget?: string
  /** 循环模式：none 单次 | daily 每天 | weekly 每周 | monthly 每月 */
  repeat?: 'none' | 'daily' | 'weekly' | 'monthly'
  /** 是否属于离线关机后的补发提醒。 */
  isMissedCatchup?: boolean
  /** 推迟次数计数。 */
  snoozeCount?: number
}

export interface ReminderStoreData {
  version: number
  items: ReminderItem[]
}
