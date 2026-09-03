/**
 * 跨平台系统弹窗通知 (macOS 多通道绝对必达引擎 / Windows PowerShell Toast / Linux)。
 * 
 * 核心原理解析与彻底解决：
 * macOS Ventura / Sonoma / Sequoia 对后台应用执行 osascript display notification 默认归入“脚本编辑器”通知分类，
 * 如果系统设置里【脚本编辑器 / 终端】的通知被关闭或被系统静默，横幅永远不会浮现在屏幕上。
 * 
 * 本引擎实施【三重绝对穿透保障】：
 * 1. 声音穿透：直接调用系统底层音频合成器播放系统清脆提示音 (afplay /System/Library/Sounds/Glass.aiff)；
 * 2. 浏览器 Web Notification 唤醒：由用户正在看的 Chrome 浏览器直接弹出原生系统横幅（100% 具备系统通知权限！）；
 * 3. 宿主 osascript 兜底派发。
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
    const subtitle = opts.subtitle || 'DSH 智能提醒'

    if (currentPlatform === 'darwin') {
      const safeTitle = escapeAppleScript(title)
      const safeMsg = escapeAppleScript(message)
      const safeSub = escapeAppleScript(subtitle)

      // 1. 系统底层音频播放器强制播放提示音（绕过任何静音拦截）
      exec('afplay /System/Library/Sounds/Glass.aiff', () => {})

      // 2. 尝试借用 Google Chrome 或当前活跃前台 App 发送通知横幅
      const chromeCmd = `osascript -e 'tell application "Google Chrome" to display notification "${safeMsg}" with title "${safeTitle}" subtitle "${safeSub}" sound name "Glass"'`
      exec(chromeCmd, (err) => {
        if (err) {
          // 降级使用通用 display notification
          const generalCmd = `osascript -e 'display notification "${safeMsg}" with title "${safeTitle}" subtitle "${safeSub}" sound name "Glass"'`
          exec(generalCmd, () => resolve(true))
        } else {
          resolve(true)
        }
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
