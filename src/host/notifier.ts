/**
 * 跨平台系统原生通知派发（100% 还原用户指定的高保真 AppleScript 原生系统横幅通知）。
 * 
 * 效果完全对应用户截图中的效果：
 * - 图标：macOS 官方脚本编辑器原生白底图标；
 * - 标题：⏰ DSH 智能提醒
 * - 内容：📌 事项： {title}
 * - 声音：系统清脆玻璃提示音 (Glass)
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

/** 发送系统原生通知 */
export function sendSystemNotification(opts: NotificationOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const currentPlatform = platform()
    const title = opts.title
    const message = opts.message
    const subtitle = opts.subtitle

    if (currentPlatform === 'darwin') {
      const safeTitle = escapeAppleScript(title)
      const safeMsg = escapeAppleScript(message)
      
      // 100% 还原截图中的 AppleScript 原生 display notification
      let script = ''
      if (subtitle) {
        const safeSub = escapeAppleScript(subtitle)
        script = `display notification "${safeMsg}" with title "${safeTitle}" subtitle "${safeSub}" sound name "Glass"`
      } else {
        script = `display notification "${safeMsg}" with title "${safeTitle}" sound name "Glass"`
      }

      exec(`osascript -e ${escapeShellArg(script)}`, (err) => {
        if (err) console.warn('[dsh-smart-reminder] osascript notification error:', err.message)
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
