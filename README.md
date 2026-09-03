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
2. **拖拽改期 (Drag & Drop)**：
   - 🖱️ 支持鼠标直接按住右侧日程卡片，拖拽至左侧日历任意日期格释放，瞬间将事项改期至目标日期！
3. **三语国际化 (中 / 英 / 西)**：
   - 深度适配 **中文 (zh)**、**英语 (en)**、**西班牙语 (es)**，支持自动识别与即时手动切换。
   - 节日自适应：中文模式下展示完整农历、初一节气与传统民俗节日；英文与西文模式下自适应展示西方公共节假日（圣诞节、万圣节、元旦等）。
4. **待办 Checklist 打勾与状态筛选**：
   - 支持圆角复选框一键打勾完成与自动划线归档。
   - 顶部提供 `全部` / `待办` / `已完成` 快速胶囊筛选。
   - 🔍 即时关键词搜索，支持实时匹配标题与备注。
5. **可视化时间点选器与多通道推送配置**：
   - 提供原生日期选择、时间下拉与常用快捷时间胶囊（`09:00`, `11:30`, `14:00`, `16:30`, `18:00`, `20:00`）。
   - 自动检测并联动 `dsh-message-gateway` 插件，支持一键配置 **企业微信 (WeCom)**、**Telegram**、**Discord** 或 **邮件** 协同推送。
   - 支持 🔴 高优 (紧急) / 🟡 普通 / 🟢 低优 优先级颜色标记。
6. **一键推迟（Snooze）与 5秒撤销（Undo）**：
   - 事项卡片支持快捷一键 `+15m`、`+1h` 延后重新提醒。
   - 删除事项后底部提供 5 秒一键撤销（Undo），杜绝误触。
7. **离线漏发补发（Catch-up）**：
   - 电脑休眠/关机唤醒后自动检测逾期并弹出汇总横幅，支持一键全部完成。
8. **标准 iCal (.ics) 日历导出**：
   - 一键下载 `.ics` 文件，可直接双击导入 Apple 日历、Google Calendar 与 Outlook。
9. **全键盘操作快捷键**：
   - `Esc`：快速关闭看板或弹窗；
   - `Cmd/Ctrl + K`：快速呼出新建提醒；
   - `← / →`：快捷切换上月 / 下月。

## Agent 工具列表

- `set_reminder(title, dueTime, description?, repeat?, pushPlatform?, pushTarget?)`: 设定定时提醒与周期循环。
- `list_reminders(type?: "upcoming" | "history" | "all")`: 查询未来待触发与历史归档提醒。
- `complete_reminder(id)`: 智能体执行后自动打勾完成或恢复。
- `snooze_reminder(id, minutes?)`: 智能体根据对话推迟提醒。
- `cancel_reminder(id)`: 撤销取消指定提醒。

## 插件生态联动

💡 本插件完全独立可用（自带系统弹窗通知、日历看板与农历节假日）。  
若需要向手机企业微信、Telegram、Discord 等消息平台主动发送到期提醒消息，可搭配安装生态插件 [`dsh-message-gateway`](https://www.npmjs.com/package/dsh-message-gateway)。

## 问题反馈与改进建议

💡 **非常欢迎大家积极提 Issue 反馈问题与提出新功能建议！**  
如果你在使用中遇到任何 Bug、有任何体验改善想法或想要对接新的消息平台，欢迎前往 [GitHub Issues 提交反馈](https://github.com/a792883583/dsh-smart-reminder/issues)。  
*(提示：请尽量按照仓库提供的 Issue 模板填写详细信息，仓库机器人会自动协助跟进处理哦！)*

## 开源协议

MIT
