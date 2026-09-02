/**
 * dsh-smart-reminder 宿主插件入口。
 * @module dsh-smart-reminder
 */

import type { Context } from '@deepseek-ai/cordis'
import { ReminderStore } from './host/store.ts'
import { ReminderScheduler } from './host/scheduler.ts'
import { registerReminderRoutes } from './host/routes.ts'
import { registerReminderTools } from './host/tools.ts'

export const name = 'dsh-smart-reminder'
export const inject = ['webServer', 'tools']

export function apply(ctx: Context): void {
  const store = new ReminderStore()
  const scheduler = new ReminderScheduler(ctx, store)

  ctx.effect(() => {
    // 启动定时调度器
    scheduler.start()

    // 注册 REST 路由与 Agent 工具
    const disposeRoutes = registerReminderRoutes(ctx, store)
    const disposeTools = registerReminderTools(ctx, store)

    return () => {
      scheduler.stop()
      disposeRoutes()
      disposeTools()
    }
  }, 'dsh-smart-reminder: scheduler, routes and tools')
}

export default { name, apply, inject }
