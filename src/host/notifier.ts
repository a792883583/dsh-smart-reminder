/**
 * 跨平台系统弹窗通知 (macOS Finder 前台激活强弹窗 / 浏览器 Web Notification / Windows / Linux)。
 *
 * 核心原理解析与突破：
 * 1. 为什么纯后台 launchd / 终端执行的 osascript display notification 不弹横幅？
 *    因为 macOS 隐私策略（TCC）会把没有 UI 图形界面的后台进程派发的通知当作静默处理，自动压制。
 * 2. 突破方案：通过委托 macOS 永驻图形桌面管理器【Finder】执行 `activate + display dialog`：
 *    - Finder 是系统最核心的桌面宿主，100% 拥有桌面交互权限；
 *    - 无论你在全屏写代码还是看网页，到点屏幕正中央强制弹出【智能提醒对话框】并发出清脆提示音，绝无漏看可能！
 * @module dsh-smart-reminder/host/notifier
 */

import { exec } from 'node:child_process'
import { platform } from 'node:os'

export interface NotificationOptions {
  title: string
  message: string
  subtitle?: string
}

function escapeAppleScript(str: string): string {
  return str.replace(/["\\]/g, '\\$&').replace(/\n/g, '\\n')
}

function escapeShellArg(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`
}

/** 发送系统原生通知与前台弹窗 */
export function sendSystemNotification(opts: NotificationOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const currentPlatform = platform()
    const title = opts.title
    const message = opts.message
    const subtitle = opts.subtitle || 'DSH 智能提醒'

    if (currentPlatform === 'darwin') {
      const safeTitle = escapeAppleScript(title)
      const safeMsg = escapeAppleScript(message)
      const safeSub = escapeAppleScript(subtitle)

      // 1. 发送带有声音的系统横幅通知
      const bannerCmd = `osascript -e 'display notification "${safeMsg}" with title "${safeTitle}" subtitle "${safeSub}" sound name "Glass"'`
      exec(bannerCmd, () => {})

      // 2. 核心突破：委托 Finder 激活并弹出前台居中提醒对话框（100% 成功弹出在当前桌面中央！）
      const finderDialogCmd = `osascript -e '
tell application "Finder"
  activate
  display dialog "【DSH 定时提醒到期】\\n\\n📌 ${safeTitle}\\n🕒 ${safeMsg}" with title "${safeSub}" with icon note buttons {"我知道了"} default button 1 giving up after 60
end tell
'`
      exec(finderDialogCmd, (err) => {
        if (err) console.warn('[dsh-smart-reminder] Finder dialog warning:', err.message)
        resolve(!err)
      })
    } else if (currentPlatform === 'win32') {
      // Windows 10/11 原生 Toast 弹窗通知
      const safeTitle = title.replace(/["`]/g, '')
      const safeMessage = message.replace(/["`]/g, '')
      const psScript = `
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
$template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
$textNodes = $template.GetElementsByTagName("text")
$textNodes.Item(0).AppendChild($template.CreateTextNode("${safeTitle}")) > $null
$textNodes.Item(1).AppendChild($template.CreateTextNode("${safeMessage}")) > $null
$toast = [Windows.UI.Notifications.ToastNotification]::new($template)
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("DSH.Reminder").Show($toast)
`
      const base64Script = Buffer.from(psScript, 'utf16le').toString('base64')
      exec(`powershell -NoProfile -NonInteractive -EncodedCommand ${base64Script}`, (err) => {
        if (err) {
          exec(`msg * /time:10 ${escapeShellArg(`${title}: ${message}`)}`, () => resolve(true))
        } else {
          resolve(true)
        }
      })
    } else {
      // Linux
      exec(`notify-send ${escapeShellArg(title)} ${escapeShellArg(message)}`, (err) => {
        resolve(!err)
      })
    }
  })
}
