/**
 * 多语言国际化字典与 Hooks（支持中文 zh、英语 en、西班牙语 es 动态切换与随系统/用户设置自适应）。
 * 完整覆盖推送渠道与推送目标多语言字典。
 * @module dsh-smart-reminder/client/i18n
 */

export type Lang = 'zh' | 'en' | 'es'

const DICT: Record<string, Record<Lang, string>> = {
  // 标题与通用
  'app.title': { zh: '智能提醒日历', en: 'Smart Reminder & Calendar', es: 'Calendario y Recordatorios' },
  'app.subtitle': { zh: '支持农历节假日、系统弹窗通知、待办 Checklist 与 iCal 导出', en: 'Lunar calendar, holidays, system notifications, to-do checklist and iCal export', es: 'Calendario lunar, festivos, notificaciones, lista de tareas y exportación iCal' },
  'btn.testNotify': { zh: '🔔 测试通知', en: '🔔 Test Notification', es: '🔔 Probar Notificación' },
  'btn.exportIcs': { zh: '📥 导出日历 (.ics)', en: '📥 Export iCal (.ics)', es: '📥 Exportar iCal (.ics)' },
  'btn.close': { zh: '关闭', en: 'Close', es: 'Cerrar' },
  'btn.today': { zh: '今天', en: 'Today', es: 'Hoy' },
  'btn.prevMonth': { zh: '‹ 上月', en: '‹ Prev', es: '‹ Ant.' },
  'btn.nextMonth': { zh: '下月 ›', en: 'Next ›', es: 'Sig. ›' },
  'btn.newReminder': { zh: '+ 新建提醒', en: '+ New Reminder', es: '+ Nuevo Recordatorio' },
  'btn.cancel': { zh: '取消', en: 'Cancel', es: 'Cancelar' },
  'btn.save': { zh: '保存设定', en: 'Save Reminder', es: 'Guardar' },
  'btn.undo': { zh: '撤销', en: 'Undo', es: 'Deshacer' },
  'btn.completeAll': { zh: '一键全部完成', en: 'Complete All', es: 'Completar todo' },

  // 星期表头
  'week.0': { zh: '日', en: 'Sun', es: 'Dom' },
  'week.1': { zh: '一', en: 'Mon', es: 'Lun' },
  'week.2': { zh: '二', en: 'Tue', es: 'Mar' },
  'week.3': { zh: '三', en: 'Wed', es: 'Mié' },
  'week.4': { zh: '四', en: 'Thu', es: 'Jue' },
  'week.5': { zh: '五', en: 'Fri', es: 'Vie' },
  'week.6': { zh: '六', en: 'Sat', es: 'Sáb' },

  // 状态筛选
  'filter.all': { zh: '全部', en: 'All', es: 'Todos' },
  'filter.pending': { zh: '待办', en: 'Pending', es: 'Pendientes' },
  'filter.completed': { zh: '已完成', en: 'Completed', es: 'Completados' },
  'search.placeholder': { zh: '🔍 搜索提醒标题或备注...', en: '🔍 Search reminders or notes...', es: '🔍 Buscar recordatorios o notas...' },

  // 优先级
  'priority.label': { zh: '重要程度', en: 'Priority', es: 'Prioridad' },
  'priority.high': { zh: '🔴 高优 (紧急)', en: '🔴 High (Urgent)', es: '🔴 Alta (Urgente)' },
  'priority.medium': { zh: '🟡 普通', en: '🟡 Medium', es: '🟡 Media' },
  'priority.low': { zh: '🟢 低优', en: '🟢 Low', es: '🟢 Baja' },

  // 循环
  'repeat.label': { zh: '循环周期', en: 'Repeat Cycle', es: 'Repetición' },
  'repeat.none': { zh: '单次（不循环）', en: 'None (Once)', es: 'Una sola vez' },
  'repeat.daily': { zh: '每天重复', en: 'Daily', es: 'Diariamente' },
  'repeat.weekly': { zh: '每周重复', en: 'Weekly', es: 'Semanalmente' },
  'repeat.monthly': { zh: '每月重复', en: 'Monthly', es: 'Mensualmente' },

  // 弹窗表单
  'form.title': { zh: '设定提醒事项', en: 'Set Reminder', es: 'Configurar Recordatorio' },
  'form.contentLabel': { zh: '事项内容', en: 'Title / Content', es: 'Título / Asunto' },
  'form.contentPlaceholder': { zh: '请输入提醒内容（如：下午研发开会、提交周报）', en: 'Enter reminder title (e.g., Team meeting, submit report)', es: 'Título del recordatorio (ej. Reunión de equipo, enviar informe)' },
  'form.timeLabel': { zh: '提醒时间（点选）', en: 'Due Time (Select)', es: 'Fecha y Hora (Seleccionar)' },
  'form.pushLabel': { zh: '消息推送渠道', en: 'Push Channel', es: 'Canal de Notificación' },
  'form.pushTargetLabel': { zh: '推送目标 (UserID/群ID/邮箱)', en: 'Target (User/Channel/Email)', es: 'Destinatario (Usuario/Canal/Email)' },
  'form.pushTargetPlaceholder': { zh: '如：JADEN.T、群 ID 或邮箱（留空默认当前会话）', en: 'e.g. UserID or Channel ID', es: 'ej. ID de usuario o canal' },
  'push.none': { zh: '🖥️ 仅系统/网页弹窗', en: '🖥️ System/Web Only', es: '🖥️ Solo Sistema/Web' },
  'push.wecom': { zh: '💬 企业微信 (WeCom)', en: '💬 WeCom AI Bot', es: '💬 WeCom' },
  'push.telegram': { zh: '✈️ Telegram', en: '✈️ Telegram', es: '✈️ Telegram' },
  'push.discord': { zh: '🎮 Discord', en: '🎮 Discord', es: '🎮 Discord' },
  'push.email': { zh: '✉️ 邮件 (Email)', en: '✉️ Email', es: '✉️ Correo' },
  'form.descLabel': { zh: '详细备注 / 链接 (可选)', en: 'Notes / Links (Optional)', es: 'Notas / Enlaces (Opcional)' },
  'form.descPlaceholder': { zh: '可填写附带的会议链接、文档或注意事项', en: 'Optional meeting links, docs, or notes', es: 'Enlaces de reunión opcionales, notas o documentos' },

  // 状态与提示
  'status.done': { zh: '已响铃', en: 'Triggered', es: 'Notificado' },
  'status.pending': { zh: '待提醒', en: 'Pending', es: 'Pendiente' },
  'status.completed': { zh: '已完成', en: 'Completed', es: 'Completado' },
  'empty.noItems': { zh: '今日暂无提醒事项', en: 'No reminders for this day', es: 'No hay recordatorios para este día' },
  'empty.searchNoItems': { zh: '未找到匹配的提醒事项', en: 'No matching reminders found', es: 'No se encontraron coincidencias' },
  'toast.saved': { zh: '✅ 提醒已成功保存！', en: '✅ Reminder saved successfully!', es: '✅ ¡Recordatorio guardado!' },
  'toast.deleted': { zh: '已删除提醒', en: 'Reminder deleted', es: 'Recordatorio eliminado' },
  'toast.snoozed': { zh: '⏰ 已推迟', en: '⏰ Postponed', es: '⏰ Pospuesto' },
  'toast.exported': { zh: '📅 已开始下载 .ics 日历文件', en: '📅 Downloading .ics calendar file', es: '📅 Descargando archivo .ics' },
  'banner.missed': { zh: '⚠️ 离线期间有 {n} 项提醒已逾期（已自动补发）', en: '⚠️ {n} missed reminder(s) while offline (caught up)', es: '⚠️ {n} recordatorio(s) vencido(s) mientras estaba desconectado' },
  'stats.summary': { zh: '本月 {total} 项 · 完成率 {rate}%', en: '{total} tasks this month · {rate}% done', es: '{total} tareas este mes · {rate}% completado' },
}

/** 国际通用公历节日（英文与西文） */
export const GLOBAL_SOLAR_FESTIVALS: Record<string, { en: string; es: string }> = {
  '0101': { en: "New Year's", es: 'Año Nuevo' },
  '0214': { en: "Valentine's", es: 'San Valentín' },
  '0308': { en: "Women's Day", es: 'Día de la Mujer' },
  '0317': { en: "St. Patrick's", es: 'San Patricio' },
  '0401': { en: "April Fools'", es: 'Día de Inocentes' },
  '0422': { en: 'Earth Day', es: 'Día de la Tierra' },
  '0501': { en: 'Labor Day', es: 'Día del Trabajo' },
  '0601': { en: "Children's", es: 'Día del Niño' },
  '1024': { en: "Devs' Day", es: 'Día Programador' },
  '1031': { en: 'Halloween', es: 'Halloween' },
  '1111': { en: "Veterans Day", es: 'Veteranos' },
  '1224': { en: 'Christmas Eve', es: 'Nochebuena' },
  '1225': { en: 'Christmas', es: 'Navidad' },
  '1231': { en: "New Year's Eve", es: 'Nochevieja' },
}

export function detectLanguage(localeStr?: string): Lang {
  const l = (localeStr || (typeof navigator !== 'undefined' ? navigator.language : 'zh')).toLowerCase()
  if (l.startsWith('zh')) return 'zh'
  if (l.startsWith('es')) return 'es'
  return 'en'
}

export function t(key: string, lang: Lang, params?: Record<string, string | number>): string {
  const entry = DICT[key]
  let str = entry ? entry[lang] || entry.en || key : key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }
  return str
}
