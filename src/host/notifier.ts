/**
 * 跨平台系统弹窗通知 (macOS 增强双模：横幅 Banner + 原生置顶对话框 Dialog / Windows PowerShell Toast / Linux)。
 * 
 * 解决 macOS 通知被静默折叠/勿扰模式拦截而“看不到通知”的问题：
 * 1. 触发系统通知中心横幅；
 * 2. 同时激活 macOS 系统前台置顶弹窗（System Dialog，自带精致便签图标），
 *    无论你在全屏看代码还是在其他 App，到点绝对强制居中提醒，无法漏看！
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
      // 1. 发送带有精致图标的 macOS 系统横幅通知
      if (existsSync(APPLET_BIN)) {
        const command = [APPLET_BIN, title, message, subtitle].map(escapeShellArg).join(' ')
        exec(command, (err) => {
          if (err) fallbackBanner()
        })
      } else {
        fallbackBanner()
      }

      function fallbackBanner(): void {
        const safeTitle = title.replace(/["\\]/g, '\\$&')
        const safeMessage = message.replace(/["\\]/g, '\\$&')
        const safeSubtitle = subtitle.replace(/["\\]/g, '\\$&')
        const script = `display notification "${safeMessage}" with title "${safeTitle}" subtitle "${safeSubtitle}" sound name "Glass"`
        exec(`osascript -e ${escapeShellArg(script)}`, (err) => {
          if (err) console.warn('[dsh-smart-reminder] banner warning:', err.message)
        })
      }

      // 2. 同时弹出前台置顶确认框（无论当前在看哪个软件，绝对不会被勿扰模式静默错过）
      const safeTitle = title.replace(/["\\]/g, '\\$&')
      const safeMessage = message.replace(/["\\]/g, '\\$&')
      const dialogScript = `
tell application "System Events"
  activate
  display dialog "${safeMessage}" with title "${safeTitle}" with icon note buttons {"我知道了"} default button "我知道了" giving up after 60
end tell
`
      exec(`osascript -e ${escapeShellArg(dialogScript)}`, (err) => {
        resolve(!err)
      })
    } else if (currentPlatform === 'win32') {
      // Windows 10/11 Toast
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
