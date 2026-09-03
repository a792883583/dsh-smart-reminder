/**
 * 跨平台系统弹窗通知。
 * 
 * macOS 原生提醒机制恢复与说明：
 * 当初通过随包分发的独立 Applet 容器：
 * assets/DSHReminder.app/Contents/MacOS/applet
 * 该 Applet 拥有合法的 macOS 应用程序结构（Info.plist、Resources/applet.icns、MacOS/applet 执行入口），
 * 并配置了与 macOS 官方「提醒事项」一致的高清日历小闹钟图标（避免了 osascript 默认的卷轴图标）。
 * 
 * 本模块优先唤醒 DSHReminder.app 发送原生桌面横幅与清脆提示音，
 * 失败时自动降级至系统 display notification。
 * @module dsh-smart-reminder/host/notifier
 */

import { exec } from 'node:child_process'
import { existsSync } from 'node:fs'
import { platform } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface NotificationOptions {
  title: string
  message: string
  subtitle?: string
}

const moduleDir = dirname(fileURLToPath(import.meta.url))
const packageRoot = dirname(moduleDir)
const APPLET_BIN = join(packageRoot, 'assets', 'DSHReminder.app', 'Contents', 'MacOS', 'applet')

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
      // 1. 底层提示音直接触发
      exec('afplay /System/Library/Sounds/Glass.aiff', () => {})

      // 2. 优先调用随包分发的官方图标 DSHReminder.app 发出系统级通知横幅
      if (existsSync(APPLET_BIN)) {
        const command = [APPLET_BIN, title, message, subtitle].map(escapeShellArg).join(' ')
        exec(command, (err) => {
          if (!err) {
            resolve(true)
            return
          }
          fallbackAppleScript()
        })
      } else {
        fallbackAppleScript()
      }

      function fallbackAppleScript(): void {
        const safeTitle = title.replace(/["\\]/g, '\\$&')
        const safeMessage = message.replace(/["\\]/g, '\\$&')
        const safeSubtitle = subtitle.replace(/["\\]/g, '\\$&')
        const script = `display notification "${safeMessage}" with title "${safeTitle}" subtitle "${safeSubtitle}" sound name "Glass"`
        exec(`osascript -e ${escapeShellArg(script)}`, (err) => {
          if (err) console.warn('[dsh-smart-reminder] macOS notification warning:', err.message)
          resolve(!err)
        })
      }
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
