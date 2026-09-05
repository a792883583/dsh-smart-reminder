# dsh-smart-reminder 智能提醒与农历日历助手

DSH Web GUI 通用智能提醒、农历日历看板与待办清单助手插件。

[English Documentation](./README.en.md) | [Documentación en Español](./README.es.md)

## 界面预览 (UI Preview)

### 1. 全屏日历看板与待办流转 (Calendar Dashboard)
![日历看板与待办流转预览图](./docs/screenshot.svg)

### 2. 核心功能特性总览 (Feature Overview)
![核心功能特性图解](./docs/features.svg)

---

## 功能特性

1. **左侧导航专属入口**：无缝内嵌于「消息平台」正下方，采用与系统 100% 像素级对齐的单色极简线性图标。
2. **系统原生桌面通知**：
   - 🔔 深度打通 macOS 原生系统通知横幅，精准伴随清脆玻璃提示音（Glass），锁屏与后台全场景准时弹出。
   - 🪟 深度打通 Windows 10/11 原生 Toast 强提醒通知（`scenario="reminder"` + `Priority=High`），即使在「专注助手 / 仅优先通知」环境下也能在屏幕右下角即时浮现弹窗卡片并播放提醒音效。
3. **拖拽改期 (Drag & Drop)**：
   - 🖱️ 支持鼠标直接按住右侧日程卡片，拖拽至左侧日历任意日期格释放，瞬间将事项改期至目标日期！
4. **快捷原位编辑 (In-Place Edit)**：
   - ✏️ 事项卡片提供编辑按钮，点击唤出预填表单，可随时修改标题、时间点、推送渠道、优先级与备注。
5. **深度国际化 (中 / 英 / 西)**：
   - 完美适配 **中文 (zh)**、**英语 (en)**、**西班牙语 (es)**，100% 自动实时跟随 DSH Web 当前语言环境，零闪烁。
   - 节日自适应：中文展示完整农历与民俗节气；英西展示公共法定节日（圣诞、万圣、元旦等）。
6. **待办 Checklist 打勾与状态筛选**：
   - 支持圆角复选框一键打勾完成与自动划线归档。
   - 顶部提供 `全部` / `待办` / `已完成` 快速胶囊筛选。
   - 🔍 即时关键词搜索，支持实时匹配标题与备注。
7. **消息网关插件生态联动**：
   - 自动检测并联动 [`dsh-message-gateway`](https://www.npmjs.com/package/dsh-message-gateway) 插件。
   - 支持一键配置 **企业微信 (WeCom)**、**Telegram**、**Discord** 或 **邮件** 协同推送，未安装时提供友好引导。
8. **一键推迟（Snooze）与 5秒撤销（Undo）**：
   - 事项卡片支持快捷一键 `+15m`、`+1h` 延后重新提醒。
   - 删除事项后底部提供 5 秒一键撤销（Undo），杜绝误触。
9. **离线漏发补发（Catch-up）**：
   - 电脑休眠/关机唤醒后自动检测逾期并弹出汇总横幅，支持一键全部完成。
10. **标准 iCal (.ics) 日历导出**：
    - 一键下载 `.ics` 文件，可直接双击导入 Apple 日历、Google Calendar 与 Outlook。
11. **全键盘快捷键**：
    - `Esc`：关闭看板或弹窗；
    - `Cmd/Ctrl + K`：呼出新建提醒；
    - `← / →`：快捷切换上月 / 下月。

## Agent 工具列表

- `set_reminder(title, dueTime, description?, repeat?, pushPlatform?, pushTarget?)`: 设定定时提醒与周期循环。
- `list_reminders(type?: "upcoming" | "history" | "all")`: 查询未来待触发与历史归档提醒。
- `complete_reminder(id)`: 智能体执行后自动打勾完成或恢复。
- `snooze_reminder(id, minutes?)`: 智能体根据对话推迟提醒。
- `cancel_reminder(id)`: 撤销取消指定提醒。

## 开源协议

MIT
