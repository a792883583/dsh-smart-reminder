/**
 * 跨平台系统弹窗通知 (macOS 独立 Applet / Windows PowerShell Toast / Linux)。
 *
 * macOS 通过随包分发的 DSHReminder.app 发送通知，避免 osascript 默认的卷轴图标。
 * npm 安装、link: 装配和本地开发均从当前模块路径解析资源，不依赖任何用户目录。
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
// lib/index.js bundles this module, so package root is one directory above lib.
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
      // 使用拥有自定义 AppIcon 的打包 applet，通知中心会显示其图标。
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
      exec(`notify-send ${escapeShellArg(title)} ${escapeShellArg(message)}`, (err) => {
        resolve(!err)
      })
    }
  })
}
